import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, getClientInfo } from '@/lib/api-helpers'
import { sendEmail, emailShell } from '@/lib/email'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

// Generate a 6-digit OTP, store it on the waitlist entry, and email it.
// Waitlist entries are NEVER User accounts — they are prospective-customer records only.
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid request body') }
  const email = (body?.email || '').trim().toLowerCase()
  const name = (body?.name || '').trim()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return badRequest('A valid email is required.')
  if (!name || name.length < 2) return badRequest('Please enter your name.')

  const existing = await db.waitlistEntry.findUnique({ where: { email } })
  if (existing && existing.status === 'CONFIRMED') {
    return json({ ok: true, alreadyConfirmed: true, message: "You're already on the waitlist!" })
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const otpExpiry = new Date(Date.now() + 1000 * 60 * 10) // 10 minutes

  await db.waitlistEntry.upsert({
    where: { email },
    update: { name, otp, otpExpiry, otpAttempts: 0, status: 'PENDING_VERIFICATION' },
    create: { email, name, otp, otpExpiry, status: 'PENDING_VERIFICATION' },
  })

  const html = emailShell({
    title: 'Your NEXORALABS waitlist verification code',
    preheader: 'Use this code to confirm your email.',
    bodyHtml: `<p>Hi ${name},</p>
      <p>Please use the verification code below to confirm your email address and continue joining the NEXORALABS waitlist. This code expires in 10 minutes.</p>
      <p style="text-align:center;font-size:36px;font-weight:800;letter-spacing:0.3em;color:#0f766e;background:#f0fdfa;border:2px dashed #14b8a6;border-radius:12px;padding:20px;margin:20px 0;">${otp}</p>
      <p>If you didn't request this, you can safely ignore this email.</p>`,
  })
  const result = await sendEmail({
    to: email,
    subject: 'Your NEXORALABS verification code',
    html,
    text: `Your NEXORALABS verification code is ${otp}. It expires in 10 minutes.`,
  })

  const { ip, userAgent } = getClientInfo(req)
  await logActivity({ action: 'waitlist_otp_sent', details: { email }, ip, userAgent })

  if ((result as any)?.dev) {
    return json({ ok: true, devOtp: otp, message: 'Verification code sent (dev mode).' })
  }
  return json({ ok: true, message: 'A verification code has been sent to your email.' })
}
