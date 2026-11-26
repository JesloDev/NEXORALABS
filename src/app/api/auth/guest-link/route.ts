import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest } from '@/lib/api-helpers'
import { sendEmail, emailShell, baseUrl } from '@/lib/email'
import { issueToken, throttled, EMAIL_RE } from '@/lib/guest-tokens'

export const dynamic = 'force-dynamic'

// Returning guests have no password: they ask for a sign-in link. Same answer whether or not the email exists.
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid request.') }
  const email = String(body?.email || '').trim().toLowerCase().slice(0, 200)
  if (!EMAIL_RE.test(email)) return badRequest('Please enter a valid email address.')
  const user = await db.user.findUnique({ where: { email } })
  if (user && user.role === 'GUEST' && user.status === 'ACTIVE' && user.emailVerified && !(await throttled(email, 'GUEST_LOGIN'))) {
    const t = await issueToken({ kind: 'GUEST_LOGIN', email, minutes: 15 })
    const url = `${baseUrl}/auth/guest?token=${t}`
    await sendEmail({
      to: email,
      subject: 'Your NEXORALABS sign-in link',
      html: emailShell({ title: 'Sign in to your space', preheader: 'Your one-time sign-in link.', bodyHtml: '<p>Use the button below to sign in. The link works once and expires in 15 minutes.</p><p style="font-size:13px;color:#64748b;">If you did not ask for this, ignore this email.</p>', cta: { label: 'Sign in', href: url } }),
      text: `Sign in to NEXORALABS: ${url}`,
    }).catch(() => {})
    if (process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY) return json({ ok: true, devUrl: url })
  }
  return json({ ok: true })
}
