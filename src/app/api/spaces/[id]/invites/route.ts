import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, forbidden, notFound, genToken, getClientInfo } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { spaceAccess } from '@/lib/access'
import { baseUrl } from '@/lib/email'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

async function manager(id: string) {
  const me = await getActiveSessionUser()
  if (!me) return { err: json({ error: 'Unauthorized' }, 401) }
  const acc = await spaceAccess(me, id)
  if (!acc || !acc.canViewContent) return { err: notFound('Space not found.') }
  if (!acc.canManage) return { err: forbidden('Only space owners and admins can manage invite links.') }
  return { me, acc }
}

const shape = (i: any) => ({
  id: i.id, label: i.label, token: i.token, url: `${baseUrl}/join/${i.token}`,
  maxUses: i.maxUses, currentUses: i.currentUses, expiresAt: i.expiresAt, active: i.active, createdAt: i.createdAt,
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const m = await manager(id)
  if (m.err) return m.err
  const invites = await db.spaceInvite.findMany({ where: { spaceId: id, active: true }, orderBy: { createdAt: 'desc' } })
  return json({ invites: invites.map(shape) })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const m = await manager(id)
  if (m.err) return m.err
  if (m.acc!.space.archived) return forbidden('This space is archived.')
  let body: any = {}
  try { body = await req.json() } catch {}
  const label = typeof body?.label === 'string' ? body.label.trim().slice(0, 60) || null : null
  const maxUses = Number.isInteger(body?.maxUses) && body.maxUses > 0 ? Math.min(body.maxUses, 10000) : null
  const days = Number.isInteger(body?.expiresInDays) && body.expiresInDays > 0 ? Math.min(body.expiresInDays, 365) : null
  const invite = await db.spaceInvite.create({
    data: { spaceId: id, token: genToken(24), label, maxUses, expiresAt: days ? new Date(Date.now() + days * 86400_000) : null, createdBy: m.me!.id },
  })
  logActivity({ userId: m.me!.id, action: 'space.invite_create', details: { spaceId: id, inviteId: invite.id }, ...getClientInfo(req) })
  return json({ invite: shape(invite) })
}
