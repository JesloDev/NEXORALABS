import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, getClientInfo } from '@/lib/api-helpers'
import { hashPassword } from '@/lib/password'
import { sendEmail, emailShell } from '@/lib/email'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid request body') }
  const token = (body?.token || '').trim()
  const password = body?.password || ''
  if (!token) return badRequest('Missing reset token.')
  if (password.length < 8) return badRequest('Password must be at least 8 characters.')

  const user = await db.user.findFirst({ where: { passwordResetToken: token } })
  if (!user) return json({ error: 'This reset link is invalid or has already been used.' }, 400)
  if (!user.passwordResetTokenExpiry || user.passwordResetTokenExpiry < new Date()) {
    return json({ error: 'This reset link has expired. Please request a new one.' }, 400)
  }

  const hash = await hashPassword(password)
  await db.user.update({
    where: { id: user.id },
    data: {
      password: hash,
      passwordChangedAt: new Date(),
      passwordResetToken: null,
      passwordResetTokenExpiry: null,
    },
  })

  const { ip, userAgent } = getClientInfo(req)
  await logActivity({ userId: user.id, action: 'password_reset', details: { email: user.email }, ip, userAgent })

  await db.notification.create({
    data: {
      userId: user.id,
      type: 'ACCOUNT_CHANGE',
      title: 'Your password was changed',
      body: 'Your NEXORALABS account password was just reset. If this wasn\'t you, please contact an administrator immediately.',
    },
  }).catch(() => {})
  await sendEmail({
    to: user.email,
    subject: 'Your NEXORALABS password was changed',
    html: emailShell({
      title: 'Password changed',
      preheader: 'Your account password was just updated.',
      bodyHtml: `<p>Hi ${user.name},</p>
        <p>Your NEXORALABS account password was just reset. You can now sign in with your new password.</p>
        <p>If this wasn't you, please contact an administrator immediately.</p>`,
    }),
    text: `Hi ${user.name}, your NEXORALABS password was just changed. If this wasn't you, contact an administrator immediately.`,
  }).catch(() => {})

  return json({ ok: true })
}
