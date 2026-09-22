import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, notFound, badRequest } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin, canManageUser } from '@/lib/permissions'
import { logActivity } from '@/lib/activity'
import { sendEmail, emailShell } from '@/lib/email'

export const dynamic = 'force-dynamic'

// PATCH: suspend / unsuspend / change role
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const { userId } = await params
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true, status: true } })
  if (!target) return notFound('User not found.')

  const actions: string[] = []

  // Role change
  if (body?.role && body.role !== target.role) {
    const { changeRole } = canManageUser(me.role, target.role)
    if (!changeRole) return json({ error: 'You cannot change this user\'s role.' }, 403)
    if (!['ADMIN', 'EMPLOYEE'].includes(body.role)) return badRequest('Invalid role.')
    await db.user.update({ where: { id: userId }, data: { role: body.role } })
    actions.push(`role changed to ${body.role}`)
  }

  // Suspend / unsuspend
  if (body?.suspend === true) {
    const { suspend } = canManageUser(me.role, target.role)
    if (!suspend) return json({ error: 'You cannot suspend this user.' }, 403)
    await db.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } })
    actions.push('account suspended')
  } else if (body?.suspend === false) {
    if (target.status !== 'SUSPENDED') return badRequest('User is not suspended.')
    await db.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } })
    actions.push('account reactivated')
  }

  await logActivity({ userId: me.id, action: 'user_update', details: { targetId: userId, email: target.email, actions } })

  // Notify the user of account changes
  if (actions.length) {
    await db.notification.create({ data: { userId, type: 'ACCOUNT_CHANGE', title: 'Your account was updated', body: actions.join(', ') } }).catch(() => {})
    await sendEmail({
      to: target.email,
      subject: 'Your NEXORALABS account was updated',
      html: emailShell({ title: 'Account update', bodyHtml: `<p>Hi ${target.name},</p><p>Your account was updated by an administrator: ${actions.join(', ')}.</p>` }),
      text: `Your account was updated: ${actions.join(', ')}`,
    }).catch(() => {})
  }

  return json({ ok: true, actions })
}

// DELETE: permanently delete a user (admins can't delete super admins)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const { userId } = await params
  if (userId === me.id) return json({ error: 'You cannot delete your own account.' }, 400)

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true } })
  if (!target) return notFound('User not found.')

  const { delete: canDelete } = canManageUser(me.role, target.role)
  if (!canDelete) return json({ error: 'You cannot delete this user.' }, 403)

  await db.user.delete({ where: { id: userId } })
  await logActivity({ userId: me.id, action: 'user_delete', details: { email: target.email } })
  return json({ ok: true })
}
