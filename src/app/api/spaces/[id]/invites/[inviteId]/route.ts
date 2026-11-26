import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, forbidden, notFound, getClientInfo } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { spaceAccess } from '@/lib/access'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

// Turn an invite link off. Already-joined members stay; the link just stops working.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; inviteId: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id, inviteId } = await params
  const acc = await spaceAccess(me, id)
  if (!acc || !acc.canViewContent) return notFound('Space not found.')
  if (!acc.canManage) return forbidden('Only space owners and admins can manage invite links.')
  const res = await db.spaceInvite.updateMany({ where: { id: inviteId, spaceId: id }, data: { active: false } })
  if (!res.count) return notFound('Invite not found.')
  logActivity({ userId: me.id, action: 'space.invite_revoke', details: { spaceId: id, inviteId }, ...getClientInfo(req) })
  return json({ ok: true })
}
