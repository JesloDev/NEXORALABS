import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, notFound, getClientInfo } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { chatAccess } from '@/lib/access'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const a = await chatAccess(me, id)
  if (!a || !a.canRead) return notFound('Conversation not found.')
  const members = await db.chatMember.findMany({
    where: { chatId: id },
    include: { user: { select: { id: true, name: true, email: true, image: true, title: true, department: true, status: true } } },
  })
  const { chat } = a
  return json({
    chat: {
      id: chat.id, type: chat.type, name: chat.name, description: chat.description, avatar: chat.avatar, topic: chat.topic,
      isPrivate: chat.isPrivate, archived: chat.archived, spaceId: chat.spaceId, createdBy: chat.createdBy,
      isMember: a.isMember, canSend: a.canSend, canModerate: a.canModerate, canJoin: a.canJoin, viaAdmin: a.viaAdmin,
      members: members.map((m) => ({ ...m.user, memberRole: m.role, joinedAt: m.joinedAt })),
    },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const a = await chatAccess(me, id)
  if (!a || !a.canRead) return notFound('Conversation not found.')
  if (!a.canModerate) return json({ error: 'You cannot modify this conversation.' }, 403)
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }
  const data: Record<string, unknown> = {}
  if (typeof body?.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 60)
  if (typeof body?.description === 'string') data.description = body.description.trim() || null
  if (a.chat.type === 'CHANNEL') {
    if (typeof body?.topic === 'string') data.topic = body.topic.trim().slice(0, 200) || null
    if (typeof body?.archived === 'boolean') data.archived = body.archived
  }
  const chat = await db.chat.update({ where: { id }, data })
  if (a.viaAdmin) logActivity({ userId: me.id, action: 'channel.admin_edit', details: { chatId: id, changes: Object.keys(data) }, ...getClientInfo(req) })
  return json({ chat })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const a = await chatAccess(me, id)
  if (!a || !a.canRead) return notFound('Conversation not found.')
  if (!a.canModerate && !(a.chat.createdBy === me.id && a.isMember)) return json({ error: 'You cannot delete this conversation.' }, 403)
  await db.chat.delete({ where: { id } })
  logActivity({ userId: me.id, action: 'chat.delete', details: { chatId: id, type: a.chat.type, name: a.chat.name }, ...getClientInfo(req) })
  return json({ ok: true })
}
