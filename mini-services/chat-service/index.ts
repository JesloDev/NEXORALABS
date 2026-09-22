// NEXORALABS real-time chat service (socket.io) on port 3003.
// Hardened backend (no client-side encryption): signed socket tokens,
// membership-scoped persistence, TLS via the gateway. MITM mitigated server-side.
import { createServer } from 'http'
import { Server } from 'socket.io'
import { createHmac } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { Resend } from 'resend'

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
    ? `<a href="${ctaHref}" style="display:inline-block;background:#0f766e;color:#ffffff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;margin-top:18px;">${ctaLabel}</a>`
    : ''
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#f1f5f9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(2,6,23,0.06);">
<tr><td style="background:linear-gradient(135deg,#0f766e 0%,#14b8a6 100%);padding:28px 40px;">
<div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;">NEXORA<span style="color:#bef264;">LABS</span></div>
<div style="font-size:12px;color:#ccfbf1;margin-top:4px;letter-spacing:0.18em;text-transform:uppercase;">Ideas → Sustainable Solutions</div>
</td></tr>
<tr><td style="padding:36px 40px 8px;font-size:20px;font-weight:700;">${title}</td></tr>
<tr><td style="padding:0 40px 40px;font-size:15px;line-height:1.65;color:#334155;">${bodyHtml}${cta}</td></tr>
<tr><td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.6;">© ${new Date().getFullYear()} NEXORALABS.</td></tr>
</table>
</td></tr></table></body></html>`
}

async function notifyOfflineMembers(chatId: string, sender: { id: string; name: string; email: string }, chatPreview: { name?: string | null; type: string }, content: string) {
  try {
    const members = await db.chatMember.findMany({
      where: { chatId, userId: { not: sender.id } },
      include: { user: { select: { id: true, email: true, name: true } } },
    })
    await Promise.all(
      members.map(async (m) => {
        // in-app notification always
        await db.notification.create({
          data: {
            userId: m.userId,
            type: 'NEW_MESSAGE',
            title: `New message in ${chatPreview.name || (chatPreview.type === 'DIRECT' ? 'a conversation' : 'a group')}`,
            body: `${sender.name}: ${content.slice(0, 140)}`,
            link: `/dashboard?chat=${chatId}`,
          },
        }).catch(() => {})
        // email only when offline
        if (!isOnline(m.userId)) {
          const bodyHtml = `<p>Hi ${m.user.name || 'there'},</p>
            <p><strong>${sender.name}</strong> sent a new message in <strong>${chatPreview.name || (chatPreview.type === 'DIRECT' ? 'your conversation' : 'a group')}</strong>:</p>
            <p style="background:#f8fafc;border-left:3px solid #14b8a6;padding:12px 16px;border-radius:8px;margin:16px 0;">${content.replace(/</g, '&lt;')}</p>`
          const html = emailShell('You have a new message', bodyHtml, 'Open NEXORALABS', `${baseUrl}/dashboard?chat=${chatId}`)
          if (resend) {
            resend.emails.send({ from: fromEmail, to: m.user.email, subject: `New message from ${sender.name}`, html }).catch(() => {})
          } else {
            console.log(`[EMAIL:DEV] -> ${m.user.email} : New message from ${sender.name}`)
          }
        }
      }),
    )
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
  const user = socket.data.user as { userId: string; email: string; name: string; role: string }
  if (!user) return socket.disconnect()

  // presence
  if (!onlineSockets.has(user.userId)) onlineSockets.set(user.userId, new Set())
  onlineSockets.get(user.userId)!.add(socket.id)
  socket.join(`user:${user.userId}`)

  // join the user's chat rooms. SUPER_ADMIN joins ALL rooms (read-only monitoring).
  let chatIds: string[] = []
  try {
    if (user.role === 'SUPER_ADMIN') {
      const all = await db.chat.findMany({ select: { id: true } })
      chatIds = all.map((c) => c.id)
    } else {
      const memberships = await db.chatMember.findMany({ where: { userId: user.userId }, select: { chatId: true } })
      chatIds = memberships.map((m) => m.chatId)
    }
  } catch (e) {
    console.error('[join] db error', e)
  }
  chatIds.forEach((id) => socket.join(`chat:${id}`))

  socket.emit('ready', { chats: chatIds })

  socket.on('message:send', async (data: { chatId: string; content: string }, ack?: (r: unknown) => void) => {
    try {
      const content = (data?.content || '').toString().trim()
      if (!content) return ack?.({ ok: false, error: 'empty' })

      // Membership check. Super admin who is NOT a member is read-only here.
      const membership = await db.chatMember.findUnique({
        where: { chatId_userId: { chatId: data.chatId, userId: user.userId } },
      })
      if (!membership) {
        return ack?.({ ok: false, error: 'You are not a member of this conversation.' })
      }

      const chat = await db.chat.findUnique({ where: { id: data.chatId }, select: { id: true, type: true, name: true } })
      if (!chat) return ack?.({ ok: false, error: 'Conversation not found.' })

      const message = await db.message.create({
        data: { chatId: chat.id, senderId: user.userId, content },
        include: { sender: { select: { id: true, name: true, email: true, image: true } } },
      })
      await db.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } })

      const payload = {
        id: message.id,
        chatId: chat.id,
        senderId: user.userId,
        sender: message.sender,
        content: message.content,
        createdAt: message.createdAt,
      }
      io.to(`chat:${chat.id}`).emit('message:new', payload)
      // Echo to the sender too, in case their socket hasn't joined the room
      // yet (e.g. a freshly created conversation). Frontend dedupes by id.
      socket.emit('message:new', payload)
      ack?.({ ok: true, message: payload })

      // notify offline members (email) + always in-app
      notifyOfflineMembers(chat.id, { id: user.userId, name: user.name, email: user.email }, { name: chat.name, type: chat.type }, content)
    } catch (e) {
      console.error('[message:send] error', e)
      ack?.({ ok: false, error: 'Server error' })
    }
  })

  socket.on('message:delete', async (data: { messageId: string }, ack?: (r: unknown) => void) => {
    try {
      const msg = await db.message.findUnique({ where: { id: data.messageId } })
      if (!msg) return ack?.({ ok: false, error: 'not found' })
      if (msg.senderId !== user.userId && user.role !== 'SUPER_ADMIN') {
        return ack?.({ ok: false, error: 'forbidden' })
      }
      await db.message.update({ where: { id: data.messageId }, data: { deletedAt: new Date() } })
      io.to(`chat:${msg.chatId}`).emit('message:deleted', { messageId: data.messageId, chatId: msg.chatId })
      ack?.({ ok: true })
    } catch (e) {
      console.error('[message:delete]', e)
      ack?.({ ok: false, error: 'Server error' })
    }
  })

  socket.on('chat:read', async (data: { chatId: string }) => {
    try {
      await db.chatMember.update({
        where: { chatId_userId: { chatId: data.chatId, userId: user.userId } },
        data: { lastReadAt: new Date() },
      })
    } catch {}
  })

  // Join a chat room (used after creating/being added to a conversation)
  socket.on('chat:join', async (data: { chatId: string }) => {
    try {
      // super admin or member may join
      const isMember = await db.chatMember.findUnique({ where: { chatId_userId: { chatId: data.chatId, userId: user.userId } } })
      const chat = await db.chat.findUnique({ where: { id: data.chatId }, select: { id: true } })
      if (!chat) return
      if (!isMember && user.role !== 'SUPER_ADMIN') return
      socket.join(`chat:${data.chatId}`)
    } catch {}
  })

  // Tell a user to refresh their chat list (used after group/member changes)
  socket.on('chat:refresh-user', (data: { userId: string }) => {
    io.to(`user:${data.userId}`).emit('chat:list-update')
  })

  socket.on('typing', (data: { chatId: string; isTyping: boolean }) => {
    socket.to(`chat:${data.chatId}`).emit('typing', { chatId: data.chatId, userId: user.userId, name: user.name, isTyping: data.isTyping })
  })

  socket.on('disconnect', () => {
    const set = onlineSockets.get(user.userId)
    if (set) {
      set.delete(socket.id)
      if (set.size === 0) onlineSockets.delete(user.userId)
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`NEXORALABS chat service running on port ${PORT}`)
})

process.on('SIGTERM', () => httpServer.close(() => process.exit(0)))
process.on('SIGINT', () => httpServer.close(() => process.exit(0)))
