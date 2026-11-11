import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { chatAccess } from '@/lib/access'

export const dynamic = 'force-dynamic'

// Add members to an existing group
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const acc = await chatAccess(me, id)
  if (!acc || !acc.canModerate || acc.chat.type === 'DIRECT') return json({ error: 'You cannot manage this conversation.' }, 403)

  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }
  const userIds: string[] = Array.isArray(body?.userIds) ? body.userIds : []
  if (!userIds.length) return badRequest('Select at least one member to add.')

  // all must be active verified users
  const users = await db.user.findMany({ where: { id: { in: userIds }, status: 'ACTIVE', emailVerified: { not: null } }, select: { id: true } })
  let validIds = users.map((u) => u.id)
  // channel members must belong to the channel's space
  if (acc.chat.type === 'CHANNEL' && acc.chat.spaceId) {
    const inSpace = new Set((await db.spaceMember.findMany({ where: { spaceId: acc.chat.spaceId, userId: { in: validIds } }, select: { userId: true } })).map((m) => m.userId))
    validIds = validIds.filter((u) => inSpace.has(u))
  }

  const existing = await db.chatMember.findMany({ where: { chatId: id, userId: { in: validIds } }, select: { userId: true } })
  const already = new Set(existing.map((e) => e.userId))
  const toAdd = validIds.filter((uid) => !already.has(uid))

  if (toAdd.length) {
    await db.chatMember.createMany({ data: toAdd.map((uid) => ({ chatId: id, userId: uid, role: 'MEMBER' })) })
  }
  const chat = await db.chat.update({ where: { id }, data: { updatedAt: new Date() }, include: { members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } } } })
  return json({ chat, added: toAdd.length })
}
