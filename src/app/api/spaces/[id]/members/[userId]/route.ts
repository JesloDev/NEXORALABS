import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, forbidden, notFound } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { spaceAccess } from '@/lib/access'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id, userId } = await params
  const acc = await spaceAccess(me, id)
  if (!acc || !acc.canViewContent) return notFound('Space not found.')
  if (!acc.canManage) return forbidden('You cannot manage members of this space.')
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }
  const role = ['OWNER', 'ADMIN', 'MEMBER'].includes(body?.role) ? body.role : null
  if (!role) return badRequest('Invalid role.')
  if (role === 'OWNER' && acc.member?.role !== 'OWNER' && !acc.viaAdmin && me.role === 'EMPLOYEE') return forbidden('Only an owner can assign owners.')
  const target = await db.spaceMember.findUnique({ where: { spaceId_userId: { spaceId: id, userId } } })
  if (!target) return notFound('Member not found.')
  if (target.role === 'OWNER' && role !== 'OWNER') {
    const owners = await db.spaceMember.count({ where: { spaceId: id, role: 'OWNER' } })
    if (owners <= 1) return badRequest('A space needs at least one owner.')
  }
  await db.spaceMember.update({ where: { id: target.id }, data: { role } })
  return json({ ok: true })
}

// Remove a member, or leave a space yourself.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id, userId } = await params
  const acc = await spaceAccess(me, id)
  if (!acc || !acc.canViewContent) return notFound('Space not found.')
  const isSelf = userId === me.id
  if (!isSelf && !acc.canManage) return forbidden('You cannot remove this member.')
  const target = await db.spaceMember.findUnique({ where: { spaceId_userId: { spaceId: id, userId } } })
  if (!target) return notFound('Member not found.')
  if (target.role === 'OWNER') {
    const owners = await db.spaceMember.count({ where: { spaceId: id, role: 'OWNER' } })
    if (owners <= 1) return badRequest('Transfer ownership before removing the last owner.')
  }
  await db.$transaction([
    db.chatMember.deleteMany({ where: { userId, chat: { spaceId: id } } }), // out of all the space's channels
    db.spaceMember.delete({ where: { id: target.id } }),
  ])
  return json({ ok: true })
}
