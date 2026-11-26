import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

// Unread top-level messages per chat for one user, in ONE query (was one query per chat).
// Only chats the user is a member of appear; chats with nothing unread are simply absent.
export async function unreadByChat(userId: string): Promise<Map<string, number>> {
  const rows = await db.$queryRaw<{ chatId: string; n: number }[]>(Prisma.sql`
    SELECT cm."chatId" AS "chatId", COUNT(m."id")::int AS n
    FROM "nexora_chat_members" cm
    JOIN "nexora_messages" m
      ON m."chatId" = cm."chatId"
     AND m."parentId" IS NULL
     AND m."deletedAt" IS NULL
     AND m."senderId" <> ${userId}
     AND m."createdAt" > COALESCE(cm."lastReadAt", cm."joinedAt")
    WHERE cm."userId" = ${userId}
    GROUP BY cm."chatId"`)
  return new Map(rows.map((r) => [r.chatId, Number(r.n)]))
}
