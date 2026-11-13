// NEXORALABS real-time chat service (socket.io) — deployed on its own (Render).
//
// Env:  DATABASE_URL (same Postgres as the web app) · SOCKET_SECRET (same value as the web app)
//       PORT (set by Render; falls back to 3003 locally) · CORS_ORIGINS (optional, comma-separated)
//       APP_BASE_URL · RESEND_API_KEY · RESEND_FROM_EMAIL (optional, for offline-mention emails)
//
// Security: signed short-lived socket tokens, every action authorised through access.ts
// (spaces, channels, DMs, groups; org admins can read every channel), no trust in client-sent ids.
import { createServer } from 'http'
import { Server, type Socket } from 'socket.io'
import { createHmac, timingSafeEqual } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { Resend } from 'resend'
import { getChatAccess, realtimeChatIds, extractMentions, type Actor } from './access'

const PORT = Number(process.env.PORT) || 3003
const db = new PrismaClient()
const SOCKET_SECRET = process.env.SOCKET_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret'
if (process.env.NODE_ENV === 'production' && SOCKET_SECRET === 'dev-secret') {
  console.error('[chat] FATAL: SOCKET_SECRET is not set. It must equal the web app SOCKET_SECRET.')
  process.exit(1)
}
const fromEmail = process.env.RESEND_FROM_EMAIL || 'NEXORALABS <no-reply@nexoralabs.com>'
const baseUrl = (process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
const resend = process.env.RESEND_API_KEY?.trim() ? new Resend(process.env.RESEND_API_KEY.trim()) : null
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)

interface TokenUser { userId: string; email: string; name: string; role: string }

// ── Token (HMAC, minted by the web app at /api/chat/token) ──
function verifyToken(token?: string): TokenUser | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [data, sig] = token.split('.')
  const expected = createHmac('sha256', SOCKET_SECRET).update(data).digest('hex')
  const a = Buffer.from(sig || ''), b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const body = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    if (!body.exp || body.exp < Date.now() || !body.userId) return null
    return body as TokenUser
  } catch {
    return null
  }
}

// ── Presence ──
const onlineSockets = new Map<string, Set<string>>() // userId -> socket ids
const isOnline = (userId: string) => (onlineSockets.get(userId)?.size ?? 0) > 0

// ── Email (offline mentions / DMs) ──
function emailShell(title: string, bodyHtml: string, ctaLabel?: string, ctaHref?: string) {
  const cta = ctaLabel && ctaHref
    ? `<a href="${ctaHref}" style="display:inline-block;background:#14532d;color:#ffffff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;margin-top:18px;">${ctaLabel}</a>`
    : ''
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#f1f5f9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(2,6,23,0.06);">
<tr><td style="background:linear-gradient(135deg,#14532d 0%,#3f7d20 100%);padding:28px 40px;">
<div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;">NEXORA<span style="color:#bef264;">LABS</span></div>
<div style="font-size:12px;color:#d9f99d;margin-top:4px;letter-spacing:0.18em;text-transform:uppercase;">Ideas → Sustainable Solutions</div>
</td></tr>
<tr><td style="padding:36px 40px 8px;font-size:20px;font-weight:700;">${title}</td></tr>
<tr><td style="padding:0 40px 40px;font-size:15px;line-height:1.65;color:#334155;">${bodyHtml}${cta}</td></tr>
<tr><td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.6;">© ${new Date().getFullYear()} NEXORALABS.</td></tr>
</table>
</td></tr></table></body></html>`
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ── Message shape sent to clients ──
const include = {
  sender: { select: { id: true, name: true, email: true, image: true } },
  reactions: { select: { emoji: true, userId: true } },
  _count: { select: { replies: { where: { deletedAt: null } } } },
} as const
const serialize = (m: any) => {
  const { _count, ...rest } = m
  return { ...rest, replyCount: _count?.replies ?? 0 }
}
const loadMessage = async (id: string) => {
  const m = await db.message.findUnique({ where: { id }, include })
  return m ? serialize(m) : null
}

// ── Notifications ──
// DMs/groups: every other member. Channels: only @mentioned people (a busy channel must not ping everyone).
// In-app notification always; email only when the person is offline.
async function notifyRecipients(
  chat: { id: string; type: string; name: string | null; spaceId: string | null },
  sender: { id: string; name: string },
  content: string,
) {
  try {
    const members = await db.chatMember.findMany({
      where: { chatId: chat.id, userId: { not: sender.id } },
      include: { user: { select: { id: true, email: true, name: true } } },
    })
    const isChannel = chat.type === 'CHANNEL'
    const mentioned = isChannel ? new Set(extractMentions(content, members.map((m) => ({ id: m.user.id, name: m.user.name })))) : null
    const label = isChannel ? `#${chat.name}` : chat.name || (chat.type === 'DIRECT' ? 'a conversation' : 'a group')
    const link = isChannel && chat.spaceId ? `/dashboard?space=${chat.spaceId}&chat=${chat.id}` : `/dashboard?chat=${chat.id}`
    for (const m of members) {
      if (mentioned && !mentioned.has(m.userId)) continue
      await db.notification.create({
        data: {
          userId: m.userId, type: 'NEW_MESSAGE',
          title: isChannel ? `${sender.name} mentioned you in ${label}` : `New message in ${label}`,
          body: `${sender.name}: ${content.slice(0, 140)}`, link,
        },
      }).catch(() => {})
      io.to(`user:${m.userId}`).emit('notification:new')
      if (isOnline(m.userId)) continue
      const bodyHtml = `<p>Hi ${esc(m.user.name || 'there')},</p>
        <p><strong>${esc(sender.name)}</strong> ${isChannel ? 'mentioned you in' : 'sent a new message in'} <strong>${esc(label)}</strong>:</p>
        <p style="background:#f8fafc;border-left:3px solid #84cc16;padding:12px 16px;border-radius:8px;margin:16px 0;">${esc(content)}</p>`
      const html = emailShell('You have a new message', bodyHtml, 'Open NEXORALABS', `${baseUrl}${link}`)
      if (resend) resend.emails.send({ from: fromEmail, to: m.user.email, subject: `${sender.name} in ${label}`, html }).catch(() => {})
      else console.log(`[EMAIL:DEV] -> ${m.user.email} : ${sender.name} in ${label}`)
    }
  } catch (e) {
    console.error('[notify] failed', e)
  }
}

// ── HTTP + socket.io ──
// Standard /socket.io path so a plain GET /health works for Render health checks.
const httpServer = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: true, service: 'nexoralabs-chat', online: onlineSockets.size }))
  }
  res.writeHead(404).end()
})
const io = new Server(httpServer, {
  path: '/socket.io',
  cors: { origin: corsOrigins.length ? corsOrigins : true, methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
})

io.use((socket, next) => {
  const payload = verifyToken(socket.handshake.auth?.token)
  if (!payload) return next(new Error('unauthorized'))
  socket.data.user = payload
  next()
})

type Ack = (r: unknown) => void
const fail = (ack: Ack | undefined, error: string) => ack?.({ ok: false, error })

// naive per-socket flood guard: max 20 events / 10s
function floodGuard(socket: Socket) {
  const hits: number[] = []
  return () => {
    const now = Date.now()
    while (hits.length && now - hits[0] > 10_000) hits.shift()
    if (hits.length >= 20) return false
    hits.push(now)
    return true
  }
}

io.on('connection', async (socket) => {
  const u = socket.data.user as TokenUser
  const actor: Actor = { id: u.userId, role: u.role }
  const allow = floodGuard(socket)

  // Role/status may have changed since the token was minted — re-check against the DB.
  try {
    const fresh = await db.user.findUnique({ where: { id: u.userId }, select: { role: true, status: true, emailVerified: true, name: true } })
    if (!fresh || fresh.status !== 'ACTIVE' || !fresh.emailVerified) { socket.emit('error:auth', 'Account not active'); return socket.disconnect(true) }
    actor.role = fresh.role
    u.name = fresh.name
  } catch (e) {
    console.error('[connect] user lookup failed', e)
    return socket.disconnect(true)
  }

  const wasOnline = isOnline(u.userId)
  if (!onlineSockets.has(u.userId)) onlineSockets.set(u.userId, new Set())
  onlineSockets.get(u.userId)!.add(socket.id)
  socket.join(`user:${u.userId}`)
  if (!wasOnline) io.emit('presence', { userId: u.userId, online: true })

  // Rooms: own chats; org admins (ADMIN, SUPER_ADMIN) also every channel; DMs/groups only for members.
  let chatIds: string[] = []
  try { chatIds = await realtimeChatIds(db, actor) } catch (e) { console.error('[join] db error', e) }
  chatIds.forEach((id) => socket.join(`chat:${id}`))
  socket.emit('ready', { chats: chatIds, online: [...onlineSockets.keys()] })

  socket.on('message:send', async (data: { chatId: string; content: string; parentId?: string | null }, ack?: Ack) => {
    try {
      if (!allow()) return fail(ack, 'You are sending too fast.')
      const content = String(data?.content ?? '').trim().slice(0, 8000)
      if (!content || !data?.chatId) return fail(ack, 'empty')
      const access = await getChatAccess(db, actor, data.chatId)
      if (!access || !access.canRead) return fail(ack, 'Conversation not found.')
      if (!access.canSend) return fail(ack, access.canJoin ? 'Join this channel to post.' : access.chat.archived ? 'This channel is archived.' : 'You cannot post here.')
      const { chat } = access

      let parentId: string | null = null
      if (data.parentId) {
        const parent = await db.message.findUnique({ where: { id: String(data.parentId) }, select: { id: true, chatId: true, parentId: true, deletedAt: true } })
        if (!parent || parent.chatId !== chat.id || parent.deletedAt) return fail(ack, 'Thread not found.')
        parentId = parent.parentId ?? parent.id // threads are one level deep
      }

      const created = await db.message.create({ data: { chatId: chat.id, senderId: u.userId, content, parentId } })
      if (!parentId) await db.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } })

      // make sure every member's live sockets are in the room (new channels / just-added members)
      const members = await db.chatMember.findMany({ where: { chatId: chat.id }, select: { userId: true } })
      members.forEach((m) => io.in(`user:${m.userId}`).socketsJoin(`chat:${chat.id}`))

      const message = await loadMessage(created.id)
      io.to(`chat:${chat.id}`).emit('message:new', message)
      if (parentId) io.to(`chat:${chat.id}`).emit('message:updated', await loadMessage(parentId)) // refresh reply count
      ack?.({ ok: true, message })

      void notifyRecipients({ id: chat.id, type: chat.type, name: chat.name, spaceId: chat.spaceId }, { id: u.userId, name: u.name }, content)
    } catch (e) {
      console.error('[message:send]', e)
      fail(ack, 'Server error')
    }
  })

  socket.on('message:edit', async (data: { messageId: string; content: string }, ack?: Ack) => {
    try {
      if (!allow()) return fail(ack, 'You are sending too fast.')
      const content = String(data?.content ?? '').trim().slice(0, 8000)
      const msg = data?.messageId ? await db.message.findUnique({ where: { id: String(data.messageId) } }) : null
      if (!content || !msg || msg.deletedAt) return fail(ack, 'Message not found.')
      if (msg.senderId !== u.userId) return fail(ack, 'You can only edit your own messages.')
      const access = await getChatAccess(db, actor, msg.chatId)
      if (!access?.canSend) return fail(ack, 'You cannot edit here.')
      await db.message.update({ where: { id: msg.id }, data: { content, editedAt: new Date() } })
      io.to(`chat:${msg.chatId}`).emit('message:updated', await loadMessage(msg.id))
      ack?.({ ok: true })
    } catch (e) {
      console.error('[message:edit]', e)
      fail(ack, 'Server error')
    }
  })

  socket.on('message:react', async (data: { messageId: string; emoji: string }, ack?: Ack) => {
    try {
      if (!allow()) return fail(ack, 'You are reacting too fast.')
      const emoji = String(data?.emoji ?? '').slice(0, 8)
      const msg = data?.messageId ? await db.message.findUnique({ where: { id: String(data.messageId) } }) : null
      if (!emoji || !msg || msg.deletedAt) return fail(ack, 'Message not found.')
      const access = await getChatAccess(db, actor, msg.chatId)
      if (!access?.canSend) return fail(ack, 'You cannot react here.')
      const key = { messageId_userId_emoji: { messageId: msg.id, userId: u.userId, emoji } }
      if (await db.reaction.findUnique({ where: key })) await db.reaction.delete({ where: key })
      else await db.reaction.create({ data: { messageId: msg.id, userId: u.userId, emoji } })
      io.to(`chat:${msg.chatId}`).emit('message:updated', await loadMessage(msg.id))
      ack?.({ ok: true })
    } catch (e) {
      console.error('[message:react]', e)
      fail(ack, 'Server error')
    }
  })

  socket.on('message:delete', async (data: { messageId: string }, ack?: Ack) => {
    try {
      const msg = data?.messageId ? await db.message.findUnique({ where: { id: String(data.messageId) } }) : null
      if (!msg || msg.deletedAt) return fail(ack, 'Message not found.')
      const access = await getChatAccess(db, actor, msg.chatId)
      if (!access || !access.canRead) return fail(ack, 'Message not found.')
      // own messages; or moderators (channel/group admins, space managers, org admins in channels only)
      if (msg.senderId !== u.userId && !access.canModerate) return fail(ack, 'forbidden')
      await db.message.update({ where: { id: msg.id }, data: { deletedAt: new Date() } })
      io.to(`chat:${msg.chatId}`).emit('message:deleted', { messageId: msg.id, chatId: msg.chatId, parentId: msg.parentId })
      if (msg.parentId) io.to(`chat:${msg.chatId}`).emit('message:updated', await loadMessage(msg.parentId))
      ack?.({ ok: true })
    } catch (e) {
      console.error('[message:delete]', e)
      fail(ack, 'Server error')
    }
  })

  socket.on('chat:read', async (data: { chatId: string }) => {
    try {
      if (!data?.chatId) return
      await db.chatMember.update({ where: { chatId_userId: { chatId: String(data.chatId), userId: u.userId } }, data: { lastReadAt: new Date() } })
    } catch { /* not a member (admin viewing) — nothing to mark */ }
  })

  // Join a room after creating / joining a conversation. Anyone who may READ it may listen
  // (that is what lets an admin watch any channel live without being a member).
  socket.on('chat:join', async (data: { chatId: string }) => {
    try {
      if (!data?.chatId) return
      const access = await getChatAccess(db, actor, String(data.chatId))
      if (access?.canRead) socket.join(`chat:${data.chatId}`)
    } catch { /* ignore */ }
  })

  socket.on('chat:refresh-user', (data: { userId: string }) => {
    if (data?.userId) io.to(`user:${String(data.userId)}`).emit('chat:list-update')
  })

  // Only people allowed to read a chat may signal typing in it.
  socket.on('typing', (data: { chatId: string; isTyping: boolean }) => {
    if (!data?.chatId || !socket.rooms.has(`chat:${data.chatId}`) || !allow()) return
    socket.to(`chat:${data.chatId}`).emit('typing', { chatId: data.chatId, userId: u.userId, name: u.name, isTyping: !!data.isTyping })
  })

  socket.on('disconnect', () => {
    const set = onlineSockets.get(u.userId)
    if (!set) return
    set.delete(socket.id)
    if (set.size === 0) {
      onlineSockets.delete(u.userId)
      io.emit('presence', { userId: u.userId, online: false })
    }
  })
})

httpServer.listen(PORT, '0.0.0.0', () => console.log(`NEXORALABS chat service listening on :${PORT}`))

process.on('unhandledRejection', (e) => console.error('[chat] unhandledRejection', e))
process.on('uncaughtException', (e) => console.error('[chat] uncaughtException', e))
const shutdown = () => { io.close(); httpServer.close(() => db.$disconnect().finally(() => process.exit(0))) }
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
