import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Home list: direct messages and groups only. Channels live inside Spaces (/api/spaces/:id).
export async function GET() {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)

  const memberRecords = await db.chatMember.findMany({
    where: { userId: me.id, chat: { type: { in: ['DIRECT', 'GROUP'] } } },
    select: { chatId: true, lastReadAt: true, joinedAt: true },
  })
  const mine = new Map(memberRecords.map((m) => [m.chatId, m]))

  const chats = await db.chat.findMany({
    where: { type: { in: ['DIRECT', 'GROUP'] }, id: { in: [...mine.keys()] } },
    orderBy: { updatedAt: 'desc' },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, image: true, title: true, department: true, status: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, where: { deletedAt: null, parentId: null }, include: { sender: { select: { id: true, name: true } } } },
    },
  })

  const result = await Promise.all(chats.map(async (c) => {
    const m = mine.get(c.id)
    const last = c.messages[0]
    const unread = m
      ? await db.message.count({ where: { chatId: c.id, parentId: null, deletedAt: null, senderId: { not: me.id }, createdAt: { gt: m.lastReadAt ?? m.joinedAt } } })
      : 0
    return {
      id: c.id, type: c.type, name: c.name, description: c.description, avatar: c.avatar,
      createdAt: c.createdAt, updatedAt: c.updatedAt,
      isMember: !!m, canSend: !!m,
      members: c.members.map((x) => ({ ...x.user, memberRole: x.role, joinedAt: x.joinedAt })),
      lastMessage: last ? { id: last.id, content: last.content, createdAt: last.createdAt, sender: last.sender } : null,
      unread,
    }
  }))

  return json({ chats: result })
}

export async function POST(req: NextRequest) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)

  let body: any
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid body')
  }

  const type = body?.type
  const name = (body?.name || '').trim()
  const description = (body?.description || '').trim() || null
  const memberIds: string[] = Array.isArray(body?.memberIds) ? body.memberIds : []

  if (type === 'GROUP') {
    if (!name || name.length < 2) return badRequest('Please provide a group name.')
    // all members must be active users
    const users = await db.user.findMany({ where: { id: { in: memberIds }, status: 'ACTIVE', emailVerified: { not: null } }, select: { id: true } })
    const validIds = new Set(users.map((u) => u.id))
    const allMembers = Array.from(new Set([me.id, ...memberIds.filter((id) => validIds.has(id))]))

    const chat = await db.chat.create({
      data: {
        type: 'GROUP',
        name,
        description,
        createdBy: me.id,
        members: {
          create: allMembers.map((uid) => ({ userId: uid, role: uid === me.id ? 'ADMIN' : 'MEMBER' })),
        },
      },
      include: { members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } } },
    })
    return json({ chat })
  }

  if (type === 'DIRECT') {
    const otherId = (body?.userId || '').trim()
    if (!otherId) return badRequest('Select a user to chat with.')
    if (otherId === me.id) return badRequest("You can't start a direct chat with yourself.")
    const other = await db.user.findFirst({ where: { id: otherId, status: 'ACTIVE', emailVerified: { not: null } } })
    if (!other) return badRequest('User is not available.')

    // find existing direct chat with exactly these two members
    const existing = await db.chat.findFirst({
      where: { type: 'DIRECT', members: { every: { userId: { in: [me.id, otherId] } } } },
      include: { members: true },
    })
    const directExisting = existing && existing.members.length === 2 && existing.members.every((m) => [me.id, otherId].includes(m.userId))
    if (directExisting) {
      return json({ chat: existing, existed: true })
    }

    const chat = await db.chat.create({
      data: {
        type: 'DIRECT',
        createdBy: me.id,
        members: { create: [{ userId: me.id, role: 'MEMBER' }, { userId: otherId, role: 'MEMBER' }] },
      },
      include: { members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } } },
    })
    return json({ chat })
  }

  return badRequest('Unknown chat type.')
}
