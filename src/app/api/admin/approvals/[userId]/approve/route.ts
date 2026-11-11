import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, notFound } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin } from '@/lib/permissions'
import { logActivity } from '@/lib/activity'
import { sendEmail, emailShell, baseUrl } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const { userId } = await params

  const target = await db.user.findUnique({ where: { id: userId } })
  if (!target) return notFound('User not found.')
  if (target.status !== 'PENDING' || !target.emailVerified) {
    return json({ error: 'Only verified pending users can be approved.' }, 400)
  }

  await db.user.update({
    where: { id: userId },
    data: { status: 'ACTIVE', approvedBy: me.id, approvedAt: new Date() },
  })
  await logActivity({ userId: me.id, action: 'user_approve', details: { targetId: userId, email: target.email } })

  // In-app + email notification
  await db.notification.create({
    data: { userId, type: 'APPROVAL', title: 'Welcome to the NEXORALABS team!', body: 'Your access has been approved. You can now sign in to the internal circle.' },
  }).catch(() => {})
  const html = emailShell({
    title: 'Your access has been approved',
    preheader: 'Welcome to the NEXORALABS internal circle.',
    bodyHtml: `<p>Hi ${target.name},</p>
      <p>Great news — your registration has been approved by an administrator. You now have access to the NEXORALABS internal circle where you can collaborate securely with the team.</p>
      <p>Sign in with your email and password to get started.</p>`,
    cta: { label: 'Sign in to NEXORALABS', href: `${baseUrl}/auth/signin` },
  })
  await sendEmail({ to: target.email, subject: 'Your NEXORALABS access is approved', html, text: `Hi ${target.name}, your NEXORALABS access is approved. Sign in at ${baseUrl}/auth/signin` })

  return json({ ok: true })
}
