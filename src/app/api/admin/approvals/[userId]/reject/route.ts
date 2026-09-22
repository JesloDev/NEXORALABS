import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, notFound } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin } from '@/lib/permissions'
import { logActivity } from '@/lib/activity'
import { sendEmail, emailShell } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Rejection deletes the user record entirely so the email can re-register.
export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const { userId } = await params

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, status: true, role: true } })
  if (!target) return notFound('User not found.')
  if (target.role === 'SUPER_ADMIN') return json({ error: 'You cannot reject a super admin.' }, 403)

  let body: any = {}
  try { body = await req.json() } catch {}
  const reason = (body?.reason || '').trim() || null

  // Email before deletion (capture address)
  await sendEmail({
    to: target.email,
    subject: 'Update on your NEXORALABS registration',
    html: emailShell({
      title: 'Update on your registration',
      bodyHtml: `<p>Hi ${target.name},</p>
        <p>Thank you for your interest in joining NEXORALABS. After review, we are unable to approve your registration at this time${reason ? `: ${reason}` : '.'}</p>
        <p>If you believe this is an error, please contact your administrator. You may be re-invited in the future.</p>`,
    }),
    text: `Hi ${target.name}, your NEXORALABS registration was not approved.${reason ? ` Reason: ${reason}` : ''}`,
  }).catch(() => {})

  // Delete the user record → frees the email for re-registration
  await db.user.delete({ where: { id: userId } })
  await logActivity({ userId: me.id, action: 'user_reject', details: { email: target.email, reason } })

  return json({ ok: true })
}
