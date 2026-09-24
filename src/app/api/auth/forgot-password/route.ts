import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, genToken, getClientInfo } from '@/lib/api-helpers'
import { sendEmail, emailShell, baseUrl } from '@/lib/email'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

// Request a password reset. We always return ok=true (even if the email
// doesn't exist) to avoid leaking which emails are registered.
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid request body') }
  const email = (body?.email || '').trim().toLowerCase()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return badRequest('A valid email is required.')

  const user = await db.user.findUnique({ where: { email } })
  if (user && user.emailVerified && user.status === 'ACTIVE' && user.password) {
    const token = genToken()
    const expiry = new Date(Date.now() + 1000 * 60 * 30) // 30 minutes
    await db.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetTokenExpiry: expiry },
    })
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`
    const html = emailShell({
      title: 'Reset your NEXORALABS password',
      preheader: 'You requested a password reset.',
      bodyHtml: `<p>Hi ${user.name},</p>
        <p>We received a request to reset the password on your NEXORALABS account. Click the button below to choose a new password. This link expires in 30 minutes.</p>
        <p style="background:#f8fafc;border-left:3px solid #0f766e;padding:12px 16px;border-radius:8px;margin:16px 0;font-size:13px;">
          If you didn't request this, you can safely ignore this email — your password will stay the same.
        </p>`,
      cta: { label: 'Reset password', href: resetUrl },
    })
    const result = await sendEmail({
      to: email,
      subject: 'Reset your NEXORALABS password',
      html,
      text: `Reset your NEXORALABS password: ${resetUrl}`,
    })
    const { ip, userAgent } = getClientInfo(req)
    await logActivity({ userId: user.id, action: 'password_reset_request', details: { email }, ip, userAgent })

    if ((result as any)?.dev) {
      return json({ ok: true, devResetUrl: resetUrl })
    }
  }
  return json({ ok: true, message: 'If an account exists for that email, a reset link has been sent.' })
}
