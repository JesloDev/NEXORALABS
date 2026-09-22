import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/session'

// Membership-scoped access (RLS-like). Super admin can READ all chats but is
// read-only for chats they're not a member of.
export async function canReadChat(user: SessionUser, chatId: string) {
  const chat = await db.chat.findUnique({ where: { id: chatId }, select: { id: true } })
  if (!chat) return { ok: false as const }
  if (user.role === 'SUPER_ADMIN') return { ok: true as const, chat, isMember: false, canSend: false }
  const member = await db.chatMember.findUnique({ where: { chatId_userId: { chatId, userId: user.id } } })
  if (!member) return { ok: false as const }
  return { ok: true as const, chat, isMember: true, canSend: true, memberRole: member.role }
}

export async function canModerateChat(user: SessionUser, chatId: string) {
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    // group admin (ChatMember role ADMIN) can moderate their group
    const m = await db.chatMember.findUnique({ where: { chatId_userId: { chatId, userId: user.id } } })
    return !!m && m.role === 'ADMIN'
  }
  // SUPER_ADMIN can moderate any chat. ADMIN can moderate chats they are the ADMIN member of.
  if (user.role === 'SUPER_ADMIN') return true
  const m = await db.chatMember.findUnique({ where: { chatId_userId: { chatId, userId: user.id } } })
  return !!m && m.role === 'ADMIN'
}
