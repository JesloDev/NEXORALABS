import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, notFound } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

// Returns whether an invite is still valid. An invite is "expired" ONLY when
// expiresAt passes, currentUses >= maxUses, or active=false. Not before.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await db.inviteLink.findUnique({
    where: { token },
    include: { creator: { select: { name: true } } },
  })
  if (!invite) return notFound('This invite link does not exist.')

  const now = new Date()
  const expiredByDate = invite.expiresAt < now
  const exhausted = invite.currentUses >= invite.maxUses
  const inactive = !invite.active
  const expired = expiredByDate || exhausted || inactive

  return json({
    ok: true,
    valid: !expired,
    expired,
    reasons: {
      expiredByDate,
      exhausted,
      inactive,
    },
    invite: {
      label: invite.label,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      currentUses: invite.currentUses,
      createdBy: invite.creator?.name || 'Administrator',
    },
  })
}
