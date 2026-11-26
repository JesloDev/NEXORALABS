// Single source of truth for who can see/do what. Pure functions over a Prisma
// client so BOTH the Next.js API and the socket service import it (no '@/' aliases).
//
// Rules
//  - Org admins (ADMIN, SUPER_ADMIN) can open EVERY space, channel (private too)
//    and page. They can read and moderate everywhere; posting in a channel needs
//    a one-click join (audited), exactly like a Slack workspace admin.
//  - DMs and group chats are private to their members, for every role (including SUPER_ADMIN).
//  - Space members see that space's content. Public spaces are discoverable and
//    joinable; private spaces are invite-only.
//  - Public channels: any space member can read, join, post. Private channels:
//    channel members + org admins only.
//  - GUESTS (outside collaborators invited by a space link) are not employees.
//    They see ONLY spaces they are a member of: no admin view, no public join,
//    no DMs, no directory. Org-wide admin rules never apply to them.
import type { PrismaClient, Chat, Space, SpaceMember, SpaceRole } from '@prisma/client'

export interface Actor {
  id: string
  role: string
}

export const isOrgAdmin = (role: string) => role === 'ADMIN' || role === 'SUPER_ADMIN'
export const isGuest = (role: string) => role === 'GUEST'
const MANAGER_ROLES: SpaceRole[] = ['OWNER', 'ADMIN']

export interface SpaceAccess {
  space: Space
  member: SpaceMember | null
  viaAdmin: boolean // org admin looking at a space they are not a member of
  canViewContent: boolean
  canJoin: boolean
  canManage: boolean
}

export async function getSpaceAccess(db: PrismaClient, actor: Actor, spaceId: string): Promise<SpaceAccess | null> {
  const space = await db.space.findUnique({ where: { id: spaceId } })
  if (!space) return null
  const member = await db.spaceMember.findUnique({ where: { spaceId_userId: { spaceId, userId: actor.id } } })
  const admin = isOrgAdmin(actor.role)
  const guest = isGuest(actor.role)
  const canViewContent = !!member || admin
  return {
    space,
    member,
    viaAdmin: admin && !member,
    canViewContent,
    canJoin: !guest && !member && (space.visibility === 'PUBLIC' || admin) && !space.archived,
    canManage: admin || (!guest && !!member && MANAGER_ROLES.includes(member.role)),
  }
}

export interface ChatAccess {
  chat: Chat
  isMember: boolean
  memberRole: 'ADMIN' | 'MEMBER' | null
  canRead: boolean
  canSend: boolean
  canModerate: boolean
  canJoin: boolean
  viaAdmin: boolean
  space: SpaceAccess | null
}

export async function getChatAccess(db: PrismaClient, actor: Actor, chatId: string): Promise<ChatAccess | null> {
  const chat = await db.chat.findUnique({ where: { id: chatId } })
  if (!chat) return null
  const cm = await db.chatMember.findUnique({ where: { chatId_userId: { chatId, userId: actor.id } } })
  const isMember = !!cm
  const memberRole = cm?.role ?? null

  if (chat.type !== 'CHANNEL') {
    return {
      chat,
      isMember,
      memberRole,
      canRead: isMember,
      canSend: isMember,
      canModerate: isMember && memberRole === 'ADMIN',
      canJoin: false,
      viaAdmin: false,
      space: null,
    }
  }

  const space = chat.spaceId ? await getSpaceAccess(db, actor, chat.spaceId) : null
  const admin = isOrgAdmin(actor.role)
  const spaceOk = !!space?.canViewContent
  const canRead = spaceOk && (!chat.isPrivate || isMember || admin)
  return {
    chat,
    isMember,
    memberRole,
    canRead,
    canSend: canRead && isMember && !chat.archived && !space!.space.archived,
    canModerate: canRead && (memberRole === 'ADMIN' || !!space?.canManage),
    canJoin: canRead && !isMember && !chat.archived,
    viaAdmin: admin && !isMember && canRead,
    space,
  }
}

// Rooms a socket should auto-join on connect.
export async function realtimeChatIds(db: PrismaClient, actor: Actor): Promise<string[]> {
  const mine = (await db.chatMember.findMany({ where: { userId: actor.id }, select: { chatId: true } })).map((m) => m.chatId)
  if (isGuest(actor.role)) {
    // only channels of spaces they still belong to
    const spaceIds = (await db.spaceMember.findMany({ where: { userId: actor.id }, select: { spaceId: true } })).map((m) => m.spaceId)
    const ok = await db.chat.findMany({ where: { id: { in: mine }, type: 'CHANNEL', spaceId: { in: spaceIds } }, select: { id: true } })
    return ok.map((c) => c.id)
  }
  if (isOrgAdmin(actor.role)) {
    const channels = (await db.chat.findMany({ where: { type: 'CHANNEL' }, select: { id: true } })).map((c) => c.id)
    return Array.from(new Set([...mine, ...channels]))
  }
  return mine
}

export function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'space'
  )
}

// Channel names: lowercase, dashes, like Slack.
export function channelName(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

// "@Full Name" mentions → user ids (matched against a known member list).
export function extractMentions(content: string, members: { id: string; name: string }[]) {
  const lower = content.toLowerCase()
  const ids = new Set<string>()
  if (/(^|\s)@(channel|here)\b/i.test(content)) members.forEach((m) => ids.add(m.id))
  for (const m of members) if (lower.includes(`@${m.name.toLowerCase()}`)) ids.add(m.id)
  return [...ids]
}
