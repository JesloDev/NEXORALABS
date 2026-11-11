import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Search active, verified users (for starting direct chats / adding to groups)
export async function GET(req: NextRequest) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const q = new URL(req.url).searchParams.get('q')?.trim() || ''
  const where = {
    status: 'ACTIVE' as const,
    emailVerified: { not: null },
    id: { not: me.id },
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
  }
  const users = await db.user.findMany({
    where,
    take: 25,
    select: { id: true, name: true, email: true, image: true, title: true, department: true, role: true },
  })
  return json({ users })
}
