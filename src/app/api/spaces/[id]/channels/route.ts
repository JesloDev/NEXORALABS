import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, forbidden, notFound } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { spaceAccess, channelName } from '@/lib/access'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const acc = await spaceAccess(me, id)
  if (!acc || !acc.canViewContent) return notFound('Space not found.')
  if (acc.space.archived) return forbidden('This space is archived.')
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }
  const name = channelName(String(body?.name || ''))
  if (name.length < 2) return badRequest('Channel name must be at least 2 letters or numbers.')
  if (await db.chat.findFirst({ where: { spaceId: id, type: 'CHANNEL', name } })) return badRequest(`#${name} already exists in this space.`)
  const isPrivate = !!body?.isPrivate

  // invited people must already be space members
  const wanted: string[] = Array.isArray(body?.memberIds) ? body.memberIds : []
  const valid = wanted.length ? (await db.spaceMember.findMany({ where: { spaceId: id, userId: { in: wanted } }, select: { userId: true } })).map((m) => m.userId) : []
  const others = valid.filter((u) => u !== me.id)

  // Public channels start with every space member; private ones with the invited list.
  let initial = others
  if (!isPrivate) initial = (await db.spaceMember.findMany({ where: { spaceId: id, userId: { not: me.id } }, select: { userId: true } })).map((m) => m.userId)

  const chat = await db.chat.create({
    data: {
      type: 'CHANNEL', name, spaceId: id, isPrivate, createdBy: me.id,
      topic: String(body?.topic || '').trim().slice(0, 200) || null,
      members: { create: [{ userId: me.id, role: 'ADMIN' }, ...initial.map((userId) => ({ userId, role: 'MEMBER' as const }))] },
    },
  })
  return json({ chat })
}
