import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, notFound } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { canModerateChat } from '@/lib/chat-access'

export const dynamic = 'force-dynamic'

// Remove a member from a group. Members can also remove (leave) themselves.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id, userId } = await params

  const member = await db.chatMember.findUnique({ where: { chatId_userId: { chatId: id, userId } } })
  if (!member) return notFound('Member not found in this conversation.')

  const isSelf = userId === me.id
  const canModerate = await canModerateChat(me, id)
  if (!isSelf && !canModerate) return json({ error: 'You cannot remove this member.' }, 403)

  await db.chatMember.delete({ where: { id: member.id } })

  // If a group has no members left, delete it. If it was the last admin, promote oldest member.
  const remaining = await db.chatMember.findMany({ where: { chatId: id }, orderBy: { joinedAt: 'asc' }, take: 1 })
  if (remaining.length === 0) {
    await db.chat.delete({ where: { id } }).catch(() => {})
    return json({ ok: true, deleted: true })
  }
  // ensure an admin exists
  const hasAdmin = await db.chatMember.findFirst({ where: { chatId: id, role: 'ADMIN' } })
  if (!hasAdmin) {
    await db.chatMember.update({ where: { id: remaining[0].id }, data: { role: 'ADMIN' } })
  }
  return json({ ok: true })
}
