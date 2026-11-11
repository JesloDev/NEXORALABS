import { db } from '@/lib/db'
import { json } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const entries = await db.waitlistEntry.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, company: true, role: true, interest: true, message: true, status: true, confirmedAt: true, createdAt: true },
  })
  return json({ entries })
}
