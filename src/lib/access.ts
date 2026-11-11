import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/session'
import { getChatAccess as _chat, getSpaceAccess as _space } from '@/lib/access-core'

export * from '@/lib/access-core'

export const chatAccess = (user: SessionUser, chatId: string) => _chat(db, user, chatId)
export const spaceAccess = (user: SessionUser, spaceId: string) => _space(db, user, spaceId)
