import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, forbidden, notFound, getClientInfo } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { spaceAccess, isOrgAdmin } from '@/lib/access'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

// Join a public space. Org admins can join ANY space (audited).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const acc = await spaceAccess(me, id)
  if (!acc) return notFound('Space not found.')
  if (acc.member) return json({ ok: true, already: true })
  if (!acc.canJoin) return forbidden('This space is invite-only.')

  await db.spaceMember.create({ data: { spaceId: id, userId: me.id, role: 'MEMBER' } })
  // auto-join public #general-style channels? Only the first-created channel, like Slack's default channel.
  const first = await db.chat.findFirst({ where: { spaceId: id, type: 'CHANNEL', isPrivate: false, archived: false }, orderBy: { createdAt: 'asc' } })
  if (first) await db.chatMember.create({ data: { chatId: first.id, userId: me.id, role: 'MEMBER' } }).catch(() => {})

  if (isOrgAdmin(me.role) && acc.space.visibility === 'PRIVATE') {
    logActivity({ userId: me.id, action: 'space.admin_join', details: { spaceId: id, name: acc.space.name }, ...getClientInfo(req) })
  }
  return json({ ok: true })
}
