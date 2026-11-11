import { db } from '@/lib/db'
import { json } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const url = new URL(req.url)
  const role = url.searchParams.get('role') // optional filter
  const users = await db.user.findMany({
    where: role ? { role: role as any } : undefined,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, name: true, role: true, status: true,
      emailVerified: true, title: true, department: true, image: true,
      lastLoginAt: true, createdAt: true, approvedAt: true,
    },
  })
  return json({ users, currentUserId: me.id, currentRole: me.role })
}
