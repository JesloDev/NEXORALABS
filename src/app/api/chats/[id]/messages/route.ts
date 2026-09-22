import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, notFound } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { canReadChat } from '@/lib/chat-access'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const access = await canReadChat(me, id)
  if (!access.ok) return notFound('Conversation not found.')

  const url = new URL(req.url)
  const before = url.searchParams.get('before') // ISO date cursor
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 100)

  const messages = await db.message.findMany({
    where: { chatId: id, deletedAt: null, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { sender: { select: { id: true, name: true, email: true, image: true } } },
  })

  // mark read for members
  if (access.isMember) {
    await db.chatMember.update({
      where: { chatId_userId: { chatId: id, userId: me.id } },
      data: { lastReadAt: new Date() },
    }).catch(() => {})
  }

  return json({ messages: messages.reverse(), hasMore: messages.length === limit })
}
