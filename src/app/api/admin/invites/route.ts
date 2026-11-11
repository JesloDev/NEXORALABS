import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin } from '@/lib/permissions'
import { genToken } from '@/lib/api-helpers'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

export async function GET() {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const invites = await db.inviteLink.findMany({
    orderBy: { createdAt: 'desc' },
    include: { creator: { select: { id: true, name: true } }, _count: { select: { users: true } } },
  })
  const now = new Date()
  const data = invites.map((i) => {
    const expiredByDate = i.expiresAt < now
    const exhausted = i.currentUses >= i.maxUses
    const inactive = !i.active
    return {
      id: i.id,
      token: i.token,
      label: i.label,
      maxUses: i.maxUses,
      currentUses: i.currentUses,
      registrations: i._count.users,
      expiresAt: i.expiresAt,
      active: i.active,
      valid: !expiredByDate && !exhausted && !inactive,
      expiredByDate,
      exhausted,
      inactive,
      createdAt: i.createdAt,
      createdBy: i.creator,
    }
  })
  return json({ invites: data })
}

export async function POST(req: NextRequest) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)

  let body: any
  try { body = await req.json() } catch { body = {} }
  const maxUses = Math.max(1, Math.min(Number(body?.maxUses) || 1, 1000))
  const expiresInDays = Math.max(1, Math.min(Number(body?.expiresInDays) || 7, 365))
  const label = (body?.label || '').trim() || null

  const token = genToken()
  const invite = await db.inviteLink.create({
    data: {
      token,
      label,
      createdBy: me.id,
      maxUses,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * expiresInDays),
    },
  })
  await logActivity({ userId: me.id, action: 'invite_create', details: { inviteId: invite.id, maxUses } })
  return json({ invite })
}
