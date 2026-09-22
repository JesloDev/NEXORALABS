import { db } from '@/lib/db'
import { json } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// Pending registrations: users who verified their email and are awaiting approval.
export async function GET() {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const pending = await db.user.findMany({
    where: { status: 'PENDING', emailVerified: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, name: true, title: true, department: true, phone: true,
      emailVerified: true, createdAt: true, inviteLinkId: true,
      inviteLink: { select: { label: true, token: true } },
    },
  })
  // Also surface incomplete (unverified) registrations so admins can clean them
  const incomplete = await db.user.findMany({
    where: { status: 'PENDING', emailVerified: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, createdAt: true },
  })
  return json({ pending, incomplete })
}
