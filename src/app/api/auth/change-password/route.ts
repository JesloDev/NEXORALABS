import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, getClientInfo } from '@/lib/api-helpers'
import { hashPassword, verifyPassword } from '@/lib/password'
import { sendEmail, emailShell } from '@/lib/email'
import { getActiveSessionUser } from '@/lib/session'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

// Change password while signed in (from Profile page)
export async function POST(req: NextRequest) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)

  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid request body') }
  const currentPassword = body?.currentPassword || ''
  const newPassword = body?.newPassword || ''
  if (!currentPassword || !newPassword) return badRequest('Both passwords are required.')
  if (newPassword.length < 8) return badRequest('New password must be at least 8 characters.')
  if (newPassword === currentPassword) return badRequest('New password must be different from your current one.')

  const user = await db.user.findUnique({ where: { id: me.id }, select: { id: true, email: true, name: true, password: true } })
  if (!user || !user.password) return json({ error: 'Account has no password set.' }, 400)

  const ok = await verifyPassword(currentPassword, user.password)
  if (!ok) return json({ error: 'Your current password is incorrect.' }, 400)

  const hash = await hashPassword(newPassword)
  await db.user.update({
    where: { id: user.id },
    data: { password: hash, passwordChangedAt: new Date() },
  })

  const { ip, userAgent } = getClientInfo(req)
  await logActivity({ userId: me.id, action: 'password_change', details: {}, ip, userAgent })

  await db.notification.create({
    data: {
      userId: me.id,
      type: 'ACCOUNT_CHANGE',
      title: 'Your password was changed',
      body: 'Your NEXORALABS account password was just updated from your profile.',
    },
  }).catch(() => {})
  await sendEmail({
    to: user.email,
    subject: 'Your NEXORALABS password was changed',
    html: emailShell({
      title: 'Password changed',
      preheader: 'Your account password was updated from your profile.',
      bodyHtml: `<p>Hi ${user.name},</p>
        <p>Your NEXORALABS account password was just updated from your profile settings.</p>
        <p>If this wasn't you, please contact an administrator immediately.</p>`,
    }),
    text: `Hi ${user.name}, your NEXORALABS password was just changed. If this wasn't you, contact an administrator immediately.`,
  }).catch(() => {})

  return json({ ok: true })
}
