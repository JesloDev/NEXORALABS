import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, getClientInfo } from '@/lib/api-helpers'
import { consumeToken, issueToken, inviteProblem } from '@/lib/guest-tokens'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

// Public: the emailed link lands here. Proves the email is real, then adds the person to THAT space only.
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid request.') }
  const row = await consumeToken(String(body?.token || ''), 'SPACE_JOIN')
  if (!row || !row.inviteId || !row.spaceId) return json({ error: 'This confirmation link is invalid or has already been used.' }, 400)

  const inv = await db.spaceInvite.findUnique({ where: { id: row.inviteId }, include: { space: true } })
  const problem = await inviteProblem(inv)
  if (problem) return json({ error: problem }, 410)

  let user = await db.user.findUnique({ where: { email: row.email } })
  if (user && (user.status !== 'ACTIVE' || !user.emailVerified)) {
    return json({ error: 'This email belongs to an account that cannot join spaces right now. Contact an administrator.' }, 403)
  }
  const isNew = !user
  if (!user) {
    user = await db.user.create({
      data: { email: row.email, name: row.name || row.email.split('@')[0], role: 'GUEST', status: 'ACTIVE', emailVerified: new Date() },
    })
  }

  const already = await db.spaceMember.findUnique({ where: { spaceId_userId: { spaceId: row.spaceId, userId: user.id } } })
  if (!already) {
    if (inv!.maxUses !== null) {
      const claimed = await db.spaceInvite.updateMany({ where: { id: inv!.id, currentUses: { lt: inv!.maxUses } }, data: { currentUses: { increment: 1 } } })
      if (!claimed.count) return json({ error: 'This invite link has reached its limit.' }, 410)
    } else {
      await db.spaceInvite.update({ where: { id: inv!.id }, data: { currentUses: { increment: 1 } } })
    }
    await db.spaceMember.create({ data: { spaceId: row.spaceId, userId: user.id, role: 'MEMBER' } })
    const first = await db.chat.findFirst({ where: { spaceId: row.spaceId, type: 'CHANNEL', isPrivate: false, archived: false }, orderBy: { createdAt: 'asc' } })
    if (first) await db.chatMember.create({ data: { chatId: first.id, userId: user.id, role: 'MEMBER' } }).catch(() => {})
    await db.notification.create({
      data: { userId: inv!.createdBy, type: 'SYSTEM', title: `${user.name} joined ${inv!.space.name}`, body: 'They joined with your space invite link.', link: `/dashboard?space=${row.spaceId}` },
    }).catch(() => {})
    logActivity({ userId: user.id, action: 'space.guest_join', details: { spaceId: row.spaceId, inviteId: inv!.id, isNew }, ...getClientInfo(req) })
  }

  // Outside guests get signed in right away; existing company accounts sign in normally.
  if (user.role === 'GUEST') {
    const loginToken = await issueToken({ kind: 'GUEST_LOGIN', email: user.email, minutes: 10 })
    return json({ ok: true, spaceId: row.spaceId, spaceName: inv!.space.name, loginToken })
  }
  return json({ ok: true, spaceId: row.spaceId, spaceName: inv!.space.name, existingAccount: true })
}
