// NEXORALABS real-time chat service (socket.io) on port 3003.
// Hardened backend (no client-side encryption): signed socket tokens,
// membership-scoped persistence, TLS via the gateway. MITM mitigated server-side.
import { createServer } from 'http'
import { Server } from 'socket.io'
import { createHmac } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { Resend } from 'resend'
// Single access model shared with the Next.js API (pure functions, no '@/' aliases).
import { getChatAccess, realtimeChatIds, extractMentions, type Actor } from '../../src/lib/access-core'

const PORT = 3003
const db = new PrismaClient()
const SOCKET_SECRET = process.env.SOCKET_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret'
const apiKey = process.env.RESEND_API_KEY?.trim()
const fromEmail = process.env.RESEND_FROM_EMAIL || 'NEXORALABS <no-reply@nexoralabs.com>'
const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
const resend = apiKey ? new Resend(apiKey) : null

// ── Token verification (shared HMAC token minted by the Next.js API) ──
function verifyToken(token?: string) {
  if (!token || !token.includes('.')) return null
  const [data, sig] = token.split('.')
  const expected = createHmac('sha256', SOCKET_SECRET).update(data).digest('hex')
  if (sig !== expected) return null
  try {
    const body = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    if (!body.exp || body.exp < Date.now()) return null
    return body as { userId: string; email: string; name: string; role: string }
  } catch {
    return null
  }
}

// ── Online presence tracking ──
const onlineSockets = new Map<string, Set<string>>() // userId -> socket ids
function isOnline(userId: string) {
  return (onlineSockets.get(userId)?.size ?? 0) > 0
}

// ── Email notification (offline members) ──
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

const include = {
  sender: { select: { id: true, name: true, email: true, image: true } },
  reactions: { select: { emoji: true, userId: true } },
  _count: { select: { replies: { where: { deletedAt: null } } } },
} as const

function serialize(m: any) {
  const { _count, ...rest } = m
  return { ...rest, replyCount: _count?.replies ?? 0 }
}
const loadMessage = async (id: string) => {
  const m = await db.message.findUnique({ where: { id }, include })
  return m ? serialize(m) : null
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;')

// Notify the right people. DMs/groups: every other member. Channels: only @mentioned people
// (Slack-style — a busy channel must not email everyone). Email goes to offline recipients only.
async function notifyRecipients(chat: { id: string; type: string; name: string | null; spaceId: string | null }, sender: { id: string; name: string }, content: string) {
  try {
    const members = await db.chatMember.findMany({
      where: { chatId: chat.id, userId: { not: sender.id } },
      include: { user: { select: { id: true, email: true, name: true } } },
    })
    const isChannel = chat.type === 'CHANNEL'
    const mentioned = isChannel ? new Set(extractMentions(content, members.map((m) => ({ id: m.user.id, name: m.user.name })))) : null
    const label = isChannel ? `#${chat.name}` : chat.name || (chat.type === 'DIRECT' ? 'a conversation' : 'a group')
    const link = isChannel && chat.spaceId ? `/dashboard?space=${chat.spaceId}&chat=${chat.id}` : `/dashboard?chat=${chat.id}`
    await Promise.all(members.filter((m) => !mentioned || mentioned.has(m.userId)).map(async (m) => {
      await db.notification.create({
        data: {
          userId: m.userId, type: 'NEW_MESSAGE',
          title: isChannel ? `${sender.name} mentioned you in ${label}` : `New message in ${label}`,
          body: `${sender.name}: ${content.slice(0, 140)}`, link,
        },
      }).catch(() => {})
      io.to(`user:${m.userId}`).emit('notification:new')
      if (!isOnline(m.userId)) {
        const bodyHtml = `<p>Hi ${esc(m.user.name || 'there')},</p>
          <p><strong>${esc(sender.name)}</strong> ${isChannel ? 'mentioned you in' : 'sent a new message in'} <strong>${esc(label)}</strong>:</p>
          <p style="background:#f8fafc;border-left:3px solid #84cc16;padding:12px 16px;border-radius:8px;margin:16px 0;">${esc(content)}</p>`
        const html = emailShell('You have a new message', bodyHtml, 'Open NEXORALABS', `${baseUrl}${link}`)
        if (resend) resend.emails.send({ from: fromEmail, to: m.user.email, subject: `${sender.name} in ${label}`, html }).catch(() => {})
        else console.log(`[EMAIL:DEV] -> ${m.user.email} : ${sender.name} in ${label}`)
      }
    }))
  } catch (e) {
    console.error('[notify] failed', e)
  }
}

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.use((socket, next) => {
  const payload = verifyToken(socket.handshake.auth?.token)
  if (!payload) return next(new Error('unauthorized'))
  socket.data.user = payload
  next()
})

io.on('connection', async (socket) => {
  const u = socket.data.user as { userId: string; email: string; name: string; role: string }
  if (!u) return socket.disconnect()
  const actor: Actor = { id: u.userId, role: u.role }

  const wasOnline = isOnline(u.userId)
  if (!onlineSockets.has(u.userId)) onlineSockets.set(u.userId, new Set())
  onlineSockets.get(u.userId)!.add(socket.id)
  socket.join(`user:${u.userId}`)
  if (!wasOnline) io.emit('presence', { userId: u.userId, online: true })

  // Rooms: own chats; ADMIN also every channel; SUPER_ADMIN every chat (DM/group monitoring stays read-only).
  let chatIds: string[] = []
  try {
    chatIds = await realtimeChatIds(db, actor)
  } catch (e) {
    console.error('[join] db error', e)
  }
  chatIds.forEach((id) => socket.join(`chat:${id}`))
  socket.emit('ready', { chats: chatIds, online: [...onlineSockets.keys()] })

  socket.on('message:send', async (data: { chatId: string; content: string; parentId?: string | null }, ack?: (r: unknown) => void) => {
    try {
      const content = (data?.content || '').toString().trim().slice(0, 8000)
      if (!content) return ack?.({ ok: false, error: 'empty' })
      const access = await getChatAccess(db, actor, data.chatId)
      if (!access || !access.canRead) return ack?.({ ok: false, error: 'Conversation not found.' })
      if (!access.canSend) {
        return ack?.({ ok: false, error: access.canJoin ? 'Join this channel to post.' : access.chat.archived ? 'This channel is archived.' : 'You cannot post here.' })
      }
      const { chat } = access

      let parentId: string | null = null
      if (data.parentId) {
        const parent = await db.message.findUnique({ where: { id: data.parentId }, select: { id: true, chatId: true, parentId: true, deletedAt: true } })
        if (!parent || parent.chatId !== chat.id || parent.deletedAt) return ack?.({ ok: false, error: 'Thread not found.' })
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

      notifyRecipients({ id: chat.id, type: chat.type, name: chat.name, spaceId: chat.spaceId }, { id: u.userId, name: u.name }, content)
    } catch (e) {
      console.error('[message:send] error', e)
      ack?.({ ok: false, error: 'Server error' })
    }
  })

  socket.on('message:edit', async (data: { messageId: string; content: string }, ack?: (r: unknown) => void) => {
    try {
      const content = (data?.content || '').toString().trim().slice(0, 8000)
      const msg = await db.message.findUnique({ where: { id: data.messageId } })
      if (!content || !msg || msg.deletedAt) return ack?.({ ok: false, error: 'not found' })
      if (msg.senderId !== u.userId) return ack?.({ ok: false, error: 'You can only edit your own messages.' })
      const access = await getChatAccess(db, actor, msg.chatId)
      if (!access?.canSend) return ack?.({ ok: false, error: 'You cannot edit here.' })
      await db.message.update({ where: { id: msg.id }, data: { content, editedAt: new Date() } })
      const message = await loadMessage(msg.id)
      io.to(`chat:${msg.chatId}`).emit('message:updated', message)
      ack?.({ ok: true })
    } catch (e) {
      console.error('[message:edit]', e)
      ack?.({ ok: false, error: 'Server error' })
    }
  })

  socket.on('message:react', async (data: { messageId: string; emoji: string }, ack?: (r: unknown) => void) => {
    try {
      const emoji = (data?.emoji || '').toString().slice(0, 8)
      const msg = await db.message.findUnique({ where: { id: data.messageId } })
      if (!emoji || !msg || msg.deletedAt) return ack?.({ ok: false, error: 'not found' })
      const access = await getChatAccess(db, actor, msg.chatId)
      if (!access?.canSend) return ack?.({ ok: false, error: 'You cannot react here.' })
      const key = { messageId_userId_emoji: { messageId: msg.id, userId: u.userId, emoji } }
      if (await db.reaction.findUnique({ where: key })) await db.reaction.delete({ where: key })
      else await db.reaction.create({ data: { messageId: msg.id, userId: u.userId, emoji } })
      io.to(`chat:${msg.chatId}`).emit('message:updated', await loadMessage(msg.id))
      ack?.({ ok: true })
    } catch (e) {
      console.error('[message:react]', e)
      ack?.({ ok: false, error: 'Server error' })
    }
  })

  socket.on('message:delete', async (data: { messageId: string }, ack?: (r: unknown) => void) => {
    try {
      const msg = await db.message.findUnique({ where: { id: data.messageId } })
      if (!msg || msg.deletedAt) return ack?.({ ok: false, error: 'not found' })
      const access = await getChatAccess(db, actor, msg.chatId)
      if (!access || !access.canRead) return ack?.({ ok: false, error: 'not found' })
      // own messages; or moderators (channel/group admins, space managers, org admins in channels, super admin everywhere)
      if (msg.senderId !== u.userId && !access.canModerate) return ack?.({ ok: false, error: 'forbidden' })
      await db.message.update({ where: { id: msg.id }, data: { deletedAt: new Date() } })
      io.to(`chat:${msg.chatId}`).emit('message:deleted', { messageId: msg.id, chatId: msg.chatId, parentId: msg.parentId })
      if (msg.parentId) io.to(`chat:${msg.chatId}`).emit('message:updated', await loadMessage(msg.parentId))
      ack?.({ ok: true })
    } catch (e) {
      console.error('[message:delete]', e)
      ack?.({ ok: false, error: 'Server error' })
    }
  })

  socket.on('chat:read', async (data: { chatId: string }) => {
    try {
      await db.chatMember.update({ where: { chatId_userId: { chatId: data.chatId, userId: u.userId } }, data: { lastReadAt: new Date() } })
    } catch {}
  })

  // Join a room after creating / joining a conversation. Anyone who may READ it may listen
  // (that is what lets an admin watch any channel live without being a member).
  socket.on('chat:join', async (data: { chatId: string }) => {
    try {
      const access = await getChatAccess(db, actor, data.chatId)
      if (access?.canRead) socket.join(`chat:${data.chatId}`)
    } catch {}
  })

  socket.on('chat:refresh-user', (data: { userId: string }) => {
    io.to(`user:${data.userId}`).emit('chat:list-update')
  })

  socket.on('typing', (data: { chatId: string; isTyping: boolean }) => {
    socket.to(`chat:${data.chatId}`).emit('typing', { chatId: data.chatId, userId: u.userId, name: u.name, isTyping: data.isTyping })
  })

  socket.on('disconnect', () => {
    const set = onlineSockets.get(u.userId)
    if (set) {
      set.delete(socket.id)
      if (set.size === 0) {
        onlineSockets.delete(u.userId)
        io.emit('presence', { userId: u.userId, online: false })
      }
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`NEXORALABS chat service running on port ${PORT}`)
})

process.on('SIGTERM', () => httpServer.close(() => process.exit(0)))
process.on('SIGINT', () => httpServer.close(() => process.exit(0)))
