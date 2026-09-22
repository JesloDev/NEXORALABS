import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || 200), 500)
  const logs = await db.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  })
  return json({ logs })
}
