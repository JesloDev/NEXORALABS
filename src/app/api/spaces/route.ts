import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, forbidden, getClientInfo } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isOrgAdmin, slugify } from '@/lib/access'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

// Spaces visible to the caller:
//  - org admins: ALL spaces (private ones flagged viaAdmin when not a member)
//  - everyone else: spaces they belong to + public spaces they can discover/join
export async function GET() {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const admin = isOrgAdmin(me.role)

  const spaces = await db.space.findMany({
    where: admin
      ? {}
      : { OR: [{ visibility: 'PUBLIC' }, { members: { some: { userId: me.id } } }] },
    orderBy: { createdAt: 'asc' },
    include: {
      members: { where: { userId: me.id }, select: { role: true } },
      _count: { select: { members: true, pages: true, channels: true } },
    },
  })

  // unread per space (member channels only)
  const myChannelMemberships = await db.chatMember.findMany({
    where: { userId: me.id, chat: { type: 'CHANNEL' } },
    select: { chatId: true, lastReadAt: true, joinedAt: true, chat: { select: { spaceId: true } } },
  })
  const unreadBySpace = new Map<string, number>()
  await Promise.all(
    myChannelMemberships.map(async (m) => {
      const n = await db.message.count({
        where: { chatId: m.chatId, parentId: null, deletedAt: null, senderId: { not: me.id }, createdAt: { gt: m.lastReadAt ?? m.joinedAt } },
      })
      if (n && m.chat.spaceId) unreadBySpace.set(m.chat.spaceId, (unreadBySpace.get(m.chat.spaceId) ?? 0) + n)
    }),
  )

  return json({
    spaces: spaces.map((s) => ({
      id: s.id, name: s.name, slug: s.slug, description: s.description, icon: s.icon, color: s.color,
      visibility: s.visibility, archived: s.archived, createdAt: s.createdAt,
      role: s.members[0]?.role ?? null,
      isMember: s.members.length > 0,
      viaAdmin: admin && s.members.length === 0,
      memberCount: s._count.members, pageCount: s._count.pages, channelCount: s._count.channels,
      unread: unreadBySpace.get(s.id) ?? 0,
    })),
  })
}

// Only org admins create spaces (company/team partitions).
export async function POST(req: NextRequest) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  if (!isOrgAdmin(me.role)) return forbidden('Only admins can create spaces.')
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }

  const name = String(body?.name || '').trim()
  if (name.length < 2 || name.length > 60) return badRequest('Space name must be 2-60 characters.')
  const visibility = body?.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC'
  const memberIds: string[] = Array.isArray(body?.memberIds) ? body.memberIds : []

  let slug = slugify(name)
  if (await db.space.findUnique({ where: { slug } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

  const users = memberIds.length
    ? await db.user.findMany({ where: { id: { in: memberIds }, status: 'ACTIVE', emailVerified: { not: null } }, select: { id: true } })
    : []
  const others = users.map((u) => u.id).filter((id) => id !== me.id)

  const space = await db.space.create({
    data: {
      name, slug, visibility,
      description: String(body?.description || '').trim() || null,
      icon: String(body?.icon || '').trim().slice(0, 4) || null,
      color: /^#[0-9a-f]{6}$/i.test(body?.color || '') ? body.color : null,
      createdBy: me.id,
      members: { create: [{ userId: me.id, role: 'OWNER' }, ...others.map((userId) => ({ userId, role: 'MEMBER' as const }))] },
    },
  })

  // every space starts with #general; all initial members join it
  await db.chat.create({
    data: {
      type: 'CHANNEL', name: 'general', topic: 'Company-wide announcements and chatter', spaceId: space.id, createdBy: me.id,
      members: { create: [{ userId: me.id, role: 'ADMIN' }, ...others.map((userId) => ({ userId, role: 'MEMBER' as const }))] },
    },
  })
  await db.page.create({
    data: { spaceId: space.id, title: 'Welcome', icon: '👋', createdBy: me.id, content: `# Welcome to ${name}\n\nThis is your space's home page. Use the sidebar to open channels and pages.\n` },
  })

  logActivity({ userId: me.id, action: 'space.create', details: { spaceId: space.id, name }, ...getClientInfo(req) })
  return json({ space })
}
