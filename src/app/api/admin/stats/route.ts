import { db } from '@/lib/db'
import { json } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const [users, activeUsers, suspendedUsers, pendingApprovals, groups, directChats, messages, announcements, waitlist] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { status: 'ACTIVE' } }),
    db.user.count({ where: { status: 'SUSPENDED' } }),
    db.user.count({ where: { status: 'PENDING', emailVerified: { not: null } } }),
    db.chat.count({ where: { type: 'GROUP' } }),
    db.chat.count({ where: { type: 'DIRECT' } }),
    db.message.count(),
    db.announcement.count({ where: { published: true } }),
    db.waitlistEntry.count({ where: { status: 'CONFIRMED' } }),
  ])
  return json({
    stats: {
      users, activeUsers, suspendedUsers, pendingApprovals, groups, directChats, messages, announcements, waitlist,
    },
  })
}
