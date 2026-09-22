import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin } from '@/lib/permissions'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  // Revoke = set inactive (preserves audit trail)
  const invite = await db.inviteLink.update({ where: { id }, data: { active: false } })
  await logActivity({ userId: me.id, action: 'invite_revoke', details: { inviteId: id } })
  return json({ ok: true, invite })
}
