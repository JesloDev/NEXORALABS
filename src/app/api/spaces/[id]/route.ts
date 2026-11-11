import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, forbidden, notFound, getClientInfo } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { spaceAccess, isOrgAdmin } from '@/lib/access'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const acc = await spaceAccess(me, id)
  if (!acc) return notFound('Space not found.')
  const { space } = acc

  const base = {
    id: space.id, name: space.name, slug: space.slug, description: space.description, icon: space.icon, color: space.color,
    visibility: space.visibility, archived: space.archived,
  }
  // Non-members of a private space (that are not admins) get nothing, not even existence.
  if (!acc.canViewContent && space.visibility === 'PRIVATE') return notFound('Space not found.')
  const access = { role: acc.member?.role ?? null, isMember: !!acc.member, viaAdmin: acc.viaAdmin, canJoin: acc.canJoin, canManage: acc.canManage, canViewContent: acc.canViewContent }
  if (!acc.canViewContent) return json({ space: base, access, channels: [], pages: [], members: [] })

  const admin = isOrgAdmin(me.role)
  const [channels, pages, members, myMemberships] = await Promise.all([
    db.chat.findMany({
      where: { spaceId: id, type: 'CHANNEL', archived: false, ...(admin ? {} : { OR: [{ isPrivate: false }, { members: { some: { userId: me.id } } }] }) },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { members: true } } },
    }),
    db.page.findMany({
      where: { spaceId: id, archived: false },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, parentId: true, title: true, icon: true, position: true, updatedAt: true },
    }),
    db.spaceMember.findMany({ where: { spaceId: id }, orderBy: { joinedAt: 'asc' }, include: { user: { select: { id: true, name: true, email: true, image: true, title: true, role: true } } } }),
    db.chatMember.findMany({ where: { userId: me.id, chat: { spaceId: id } }, select: { chatId: true, lastReadAt: true, joinedAt: true } }),
  ])
  const mine = new Map(myMemberships.map((m) => [m.chatId, m]))
  const channelsOut = await Promise.all(
    channels.map(async (c) => {
      const m = mine.get(c.id)
      const unread = m
        ? await db.message.count({ where: { chatId: c.id, parentId: null, deletedAt: null, senderId: { not: me.id }, createdAt: { gt: m.lastReadAt ?? m.joinedAt } } })
        : 0
      return { id: c.id, name: c.name, topic: c.topic, description: c.description, isPrivate: c.isPrivate, isMember: !!m, memberCount: c._count.members, unread }
    }),
  )

  return json({
    space: base,
    access,
    channels: channelsOut,
    pages,
    members: members.map((m) => ({ ...m.user, spaceRole: m.role, orgRole: m.user.role, joinedAt: m.joinedAt })),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const acc = await spaceAccess(me, id)
  if (!acc || !acc.canViewContent) return notFound('Space not found.')
  if (!acc.canManage) return forbidden('You cannot edit this space.')
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }
  const data: any = {}
  if (typeof body?.name === 'string' && body.name.trim().length >= 2) data.name = body.name.trim().slice(0, 60)
  if (typeof body?.description === 'string') data.description = body.description.trim() || null
  if (typeof body?.icon === 'string') data.icon = body.icon.trim().slice(0, 4) || null
  if (typeof body?.color === 'string' && /^#[0-9a-f]{6}$/i.test(body.color)) data.color = body.color
  if (body?.visibility === 'PUBLIC' || body?.visibility === 'PRIVATE') data.visibility = body.visibility
  if (typeof body?.archived === 'boolean') data.archived = body.archived
  const space = await db.space.update({ where: { id }, data })
  logActivity({ userId: me.id, action: 'space.update', details: { spaceId: id, fields: Object.keys(data) }, ...getClientInfo(req) })
  return json({ space })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const acc = await spaceAccess(me, id)
  if (!acc || !acc.canViewContent) return notFound('Space not found.')
  // Destroying a whole company partition: org admins or the space OWNER only.
  if (!isOrgAdmin(me.role) && acc.member?.role !== 'OWNER') return forbidden('Only a space owner or an admin can delete a space.')
  await db.space.delete({ where: { id } }) // cascades channels, messages, pages, members
  logActivity({ userId: me.id, action: 'space.delete', details: { spaceId: id, name: acc.space.name }, ...getClientInfo(req) })
  return json({ ok: true })
}
