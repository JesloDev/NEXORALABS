import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest } from '@/lib/api-helpers'
import { sendEmail, emailShell } from '@/lib/email'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return badRequest('Missing verification token.')

  const entry = await db.waitlistEntry.findFirst({
    where: { verifyToken: token },
  })
  if (!entry) return json({ ok: false, error: 'This verification link is invalid or has already been used.' }, 400)

  if (entry.status === 'CONFIRMED') {
    return json({ ok: true, alreadyConfirmed: true })
  }
  if (entry.verifyTokenExpiry && entry.verifyTokenExpiry < new Date()) {
    return json({ ok: false, error: 'This verification link has expired. Please submit the waitlist form again.' }, 400)
  }

  await db.waitlistEntry.update({
    where: { id: entry.id },
    data: { status: 'CONFIRMED', confirmedAt: new Date(), verifyToken: null, verifyTokenExpiry: null },
  })
  await logActivity({ action: 'waitlist_verified', details: { email: entry.email } })

  // Confirmation email
  const html = emailShell({
    title: "You're on the NEXORALABS waitlist!",
    preheader: 'Your email is confirmed.',
    bodyHtml: `<p>Hi ${entry.name},</p>
      <p>Your email is confirmed and you're officially on the NEXORALABS waitlist. 🎉</p>
      <p>We're thrilled to have you on this journey. Our team reviews every entry and will reach out as we onboard new partners and customers. In the meantime, follow along as we turn bold ideas into sustainable, SDG-aligned solutions.</p>
      <p>Thank you for believing in sustainable growth.</p>`,
  })
  await sendEmail({
    to: entry.email,
    subject: "You're on the NEXORALABS waitlist!",
    html,
    text: `Hi ${entry.name}, your email is confirmed and you're on the NEXORALABS waitlist.`,
  })

  return json({ ok: true, confirmed: true })
}
