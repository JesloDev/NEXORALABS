import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest } from '@/lib/api-helpers'
import { sendEmail, emailShell, baseUrl } from '@/lib/email'
import { issueToken, inviteProblem, throttled, EMAIL_RE } from '@/lib/guest-tokens'

export const dynamic = 'force-dynamic'

// Public: name + email → verification email. Nothing is created until the link is opened.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid request.') }
  const name = String(body?.name || '').trim().replace(/\s+/g, ' ').slice(0, 60)
  const email = String(body?.email || '').trim().toLowerCase().slice(0, 200)
  if (name.length < 2) return badRequest('Please enter your name.')
  if (!EMAIL_RE.test(email)) return badRequest('Please enter a valid email address.')

  const inv = await db.spaceInvite.findUnique({ where: { token }, include: { space: true } })
  const problem = await inviteProblem(inv)
  if (problem) return json({ error: problem }, 410)

  if (!(await throttled(email, 'SPACE_JOIN'))) {
    const t = await issueToken({ kind: 'SPACE_JOIN', email, name, spaceId: inv!.spaceId, inviteId: inv!.id, minutes: 60 })
    const url = `${baseUrl}/auth/space-verify?token=${t}`
    await sendEmail({
      to: email,
      subject: `Confirm your email to join ${inv!.space.name}`,
      html: emailShell({
        title: `Join ${inv!.space.name}`,
        preheader: 'Confirm your email address to join the space.',
        bodyHtml: `<p>Hi ${name.replace(/[<>&"]/g, '')},</p><p>Confirm your email address to join <strong>${inv!.space.name.replace(/[<>&"]/g, '')}</strong> on NEXORALABS. This link works once and expires in 1 hour.</p><p style="font-size:13px;color:#64748b;">If you didn't ask to join, ignore this email.</p>`,
        cta: { label: 'Confirm and join', href: url },
      }),
      text: `Confirm your email to join ${inv!.space.name}: ${url}`,
    }).catch(() => {})
    if (process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY) return json({ ok: true, devUrl: url })
  }
  return json({ ok: true })
}
