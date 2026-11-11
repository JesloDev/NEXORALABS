import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, forbidden, notFound, getClientInfo } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { chatAccess, isOrgAdmin } from '@/lib/access'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

// Join a channel (public: any space member; private: org admins only, audited).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const a = await chatAccess(me, id)
  if (!a || !a.canRead) return notFound('Channel not found.')
  if (a.isMember) return json({ ok: true, already: true })
  if (!a.canJoin) return forbidden('You cannot join this channel.')
  await db.chatMember.create({ data: { chatId: id, userId: me.id, role: 'MEMBER' } })
  if (a.chat.isPrivate && isOrgAdmin(me.role)) {
    logActivity({ userId: me.id, action: 'channel.admin_join', details: { chatId: id, name: a.chat.name, spaceId: a.chat.spaceId }, ...getClientInfo(req) })
  }
  return json({ ok: true })
}
