import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, forbidden, notFound } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { spaceAccess } from '@/lib/access'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const acc = await spaceAccess(me, id)
  if (!acc || !acc.canViewContent) return notFound('Space not found.')
  if (!acc.canManage) return forbidden('You cannot manage members of this space.')
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }
  const userIds: string[] = Array.isArray(body?.userIds) ? body.userIds : []
  const role = body?.role === 'ADMIN' ? 'ADMIN' : 'MEMBER'
  if (!userIds.length) return badRequest('Select at least one person.')

  const users = await db.user.findMany({ where: { id: { in: userIds }, status: 'ACTIVE', emailVerified: { not: null } }, select: { id: true } })
  const existing = new Set((await db.spaceMember.findMany({ where: { spaceId: id, userId: { in: users.map((u) => u.id) } }, select: { userId: true } })).map((m) => m.userId))
  const toAdd = users.map((u) => u.id).filter((u) => !existing.has(u))
  if (toAdd.length) {
    await db.spaceMember.createMany({ data: toAdd.map((userId) => ({ spaceId: id, userId, role })) })
    // add to the default (oldest public) channel
    const first = await db.chat.findFirst({ where: { spaceId: id, type: 'CHANNEL', isPrivate: false, archived: false }, orderBy: { createdAt: 'asc' } })
    if (first) await db.chatMember.createMany({ data: toAdd.map((userId) => ({ chatId: first.id, userId, role: 'MEMBER' as const })) }).catch(() => {})
    await db.notification.createMany({
      data: toAdd.filter((u) => u !== me.id).map((userId) => ({ userId, type: 'SYSTEM' as const, title: `You were added to ${acc.space.name}`, body: `${me.name} added you to the space "${acc.space.name}".`, link: `/dashboard?space=${id}` })),
    })
  }
  return json({ added: toAdd.length })
}
