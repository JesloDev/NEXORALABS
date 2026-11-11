import type { SessionUser } from '@/lib/session'
import { chatAccess } from '@/lib/access'

// Thin wrappers over the single access model in access-core.ts (DMs, groups and channels).
export async function canReadChat(user: SessionUser, chatId: string) {
  const a = await chatAccess(user, chatId)
  if (!a || !a.canRead) return { ok: false as const }
  return { ok: true as const, chat: a.chat, isMember: a.isMember, canSend: a.canSend, memberRole: a.memberRole }
}

export async function canModerateChat(user: SessionUser, chatId: string) {
  const a = await chatAccess(user, chatId)
  return !!a && a.canModerate
}
