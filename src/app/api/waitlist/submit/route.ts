import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, getClientInfo } from '@/lib/api-helpers'
import { sendEmail, emailShell } from '@/lib/email'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

// Finalize a waitlist submission. Requires a valid OTP that was sent to the
// email. Waitlist entries are NOT User accounts — they never get credentials
// or sign-in access. Only invite-link registration + admin approval creates users.
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid request body') }
  const email = (body?.email || '').trim().toLowerCase()
  const name = (body?.name || '').trim()
  const company = (body?.company || '').trim() || null
  const role = (body?.role || '').trim() || null
  const interest = (body?.interest || '').trim() || null
  const message = (body?.message || '').trim() || null
  const otp = (body?.otp || '').trim()

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return badRequest('A valid email is required.')
  if (!name || name.length < 2) return badRequest('Please enter your name.')
  if (!otp) return badRequest('Please enter the verification code sent to your email.')

  const entry = await db.waitlistEntry.findUnique({ where: { email } })
  if (!entry || !entry.otp) {
    return json({ error: 'No verification code was sent to this email. Please request a new code.' }, 400)
  }
  if (entry.status === 'CONFIRMED') {
    return json({ ok: true, alreadyConfirmed: true, message: "You're already on the waitlist!" })
  }
  if (entry.otpExpiry && entry.otpExpiry < new Date()) {
    return json({ error: 'Your verification code has expired. Please request a new one.' }, 400)
  }
  if (entry.otpAttempts >= 5) {
    return json({ error: 'Too many incorrect attempts. Please request a new code.' }, 400)
  }
  if (entry.otp !== otp) {
    await db.waitlistEntry.update({ where: { id: entry.id }, data: { otpAttempts: { increment: 1 } } })
    return json({ error: 'Incorrect verification code. Please try again.' }, 400)
  }

  // OTP verified — finalize the waitlist entry
  await db.waitlistEntry.update({
    where: { id: entry.id },
    data: {
      name, company, role, interest, message,
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      otp: null,
      otpExpiry: null,
      otpAttempts: 0,
    },
  })

  const { ip, userAgent } = getClientInfo(req)
  await logActivity({ action: 'waitlist_confirmed', details: { email }, ip, userAgent })

  const html = emailShell({
    title: "You're on the NEXORALABS waitlist!",
    preheader: 'Your email is confirmed.',
    bodyHtml: `<p>Hi ${name},</p>
      <p>Your email is confirmed and you're officially on the NEXORALABS waitlist.</p>
      <p>We're thrilled to have you on this journey. Our team reviews every entry and will reach out as we onboard new partners and customers.</p>
      <p>Thank you for believing in sustainable growth.</p>`,
  })
  await sendEmail({
    to: email,
    subject: "You're on the NEXORALABS waitlist!",
    html,
    text: `Hi ${name}, your email is confirmed and you're on the NEXORALABS waitlist.`,
  })

  return json({ ok: true, confirmed: true })
}
