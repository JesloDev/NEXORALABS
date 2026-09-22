import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest } from '@/lib/api-helpers'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

// Completes email verification during registration. The user is still PENDING
// (awaiting admin approval) — they cannot sign in until an admin approves them.
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return badRequest('Missing verification token.')

  const user = await db.user.findFirst({ where: { verifyToken: token } })
  if (!user) return json({ ok: false, error: 'This verification link is invalid or already used.' }, 400)
  if (user.emailVerified) return json({ ok: true, alreadyVerified: true })
  if (user.verifyTokenExpiry && user.verifyTokenExpiry < new Date()) {
    return json({ ok: false, error: 'This verification link has expired. Please re-register via your invite link.' }, 400)
  }

  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), verifyToken: null, verifyTokenExpiry: null },
  })
  await logActivity({ userId: user.id, action: 'email_verified', details: { email: user.email } })

  return json({ ok: true, verified: true })
}
