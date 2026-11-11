import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, notFound } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { chatAccess } from '@/lib/access'

export const dynamic = 'force-dynamic'

const include = {
  sender: { select: { id: true, name: true, email: true, image: true } },
  reactions: { select: { emoji: true, userId: true } },
  _count: { select: { replies: { where: { deletedAt: null } } } },
} as const

const shape = ({ _count, ...m }: any) => ({ ...m, replyCount: _count.replies })

// Channel/main timeline = top-level messages. ?parent=<messageId> returns that thread's replies.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const a = await chatAccess(me, id)
  if (!a || !a.canRead) return notFound('Conversation not found.')

  const url = new URL(req.url)
  const before = url.searchParams.get('before')
  const parent = url.searchParams.get('parent')
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 100)

  if (parent) {
    const replies = await db.message.findMany({
      where: { chatId: id, parentId: parent, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include,
    })
    return json({ messages: replies.map(shape), hasMore: false })
  }

  const messages = await db.message.findMany({
    where: { chatId: id, parentId: null, deletedAt: null, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include,
  })

  if (a.isMember) {
    await db.chatMember.update({ where: { chatId_userId: { chatId: id, userId: me.id } }, data: { lastReadAt: new Date() } }).catch(() => {})
  }
  return json({ messages: messages.reverse().map(shape), hasMore: messages.length === limit })
}
