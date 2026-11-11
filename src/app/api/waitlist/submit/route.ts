import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, getClientInfo, genToken } from '@/lib/api-helpers'
import { sendEmail, emailShell, baseUrl } from '@/lib/email'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid request body')
  }
  const email = (body?.email || '').trim().toLowerCase()
  const name = (body?.name || '').trim()
  const company = (body?.company || '').trim() || null
  const role = (body?.role || '').trim() || null
  const interest = (body?.interest || '').trim() || null
  const message = (body?.message || '').trim() || null

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return badRequest('A valid email is required.')
  if (!name || name.length < 2) return badRequest('Please enter your name.')

  // Waitlist entries are NOT users. A verified waitlist entry never creates a
  // User record — it is a prospective-customer record only.
  const existing = await db.waitlistEntry.findUnique({ where: { email } })
  if (existing && existing.status === 'CONFIRMED') {
    return json({ ok: true, alreadyConfirmed: true, message: "You're already on the waitlist!" })
  }

  const token = genToken()
  const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24h

  const entry = await db.waitlistEntry.upsert({
    where: { email },
    update: {
      name, company, role, interest, message,
      status: 'PENDING_VERIFICATION',
      verifyToken: token,
      verifyTokenExpiry: expiry,
    },
    create: {
      email, name, company, role, interest, message,
      status: 'PENDING_VERIFICATION',
      verifyToken: token,
      verifyTokenExpiry: expiry,
    },
  })

  const verifyUrl = `${baseUrl}/waitlist?verify=${token}`
  const { ip, userAgent } = getClientInfo(req)
  await logActivity({ action: 'waitlist_submit', details: { email }, ip, userAgent })

  const html = emailShell({
    title: 'Confirm your email to join the NEXORALABS waitlist',
    preheader: 'One quick step to confirm your email.',
    bodyHtml: `<p>Hi ${name},</p>
      <p>Thanks for your interest in NEXORALABS! Before we add you to the waitlist, we just need to confirm your email address is correct.</p>
      <p>Click the button below to verify your email. This link expires in 24 hours.</p>`,
    cta: { label: 'Verify my email', href: verifyUrl },
  })
  const emailResult = await sendEmail({
    to: email,
    subject: 'Confirm your email — NEXORALABS waitlist',
    html,
    text: `Confirm your email to join the NEXORALABS waitlist: ${verifyUrl}`,
  })

  return json({
    ok: true,
    needsVerification: true,
    // In dev (no Resend key) the verify URL is returned so the flow completes.
    devVerifyUrl: (emailResult as any)?.dev ? verifyUrl : undefined,
  })
}
