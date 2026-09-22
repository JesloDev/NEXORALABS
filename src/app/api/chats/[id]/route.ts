import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, notFound } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { canModerateChat } from '@/lib/chat-access'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const chat = await db.chat.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true, title: true, department: true, status: true } } },
      },
    },
  })
  if (!chat) return notFound('Conversation not found.')

  const isMember = chat.members.some((m) => m.userId === me.id)
  if (!isMember && me.role !== 'SUPER_ADMIN') return notFound('Conversation not found.')

  return json({
    chat: {
      ...chat,
      isMember,
      canSend: isMember, // super admin can only send where they're a member
      canModerate: await canModerateChat(me, id),
      members: chat.members.map((m) => ({ ...m.user, memberRole: m.role, joinedAt: m.joinedAt })),
    },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  if (!(await canModerateChat(me, id))) return json({ error: 'You cannot modify this conversation.' }, 403)
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }
  const data: any = {}
  if (typeof body?.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (typeof body?.description === 'string') data.description = body.description.trim() || null
  const chat = await db.chat.update({ where: { id }, data })
  return json({ chat })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  // Disband / delete: super admin, chat creator, or group admin member.
  const chat = await db.chat.findUnique({ where: { id }, select: { id: true, createdBy: true, type: true } })
  if (!chat) return notFound('Conversation not found.')
  const isCreator = chat.createdBy === me.id
  const isSuper = me.role === 'SUPER_ADMIN'
  const isGroupAdmin = await db.chatMember.findUnique({ where: { chatId_userId: { chatId: id, userId: me.id } } }).then((m) => m?.role === 'ADMIN')
  if (!isCreator && !isSuper && !isGroupAdmin) return json({ error: 'You cannot delete this conversation.' }, 403)

  await db.chat.delete({ where: { id } })
  return json({ ok: true })
}
