import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, notFound, badRequest } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const entry = await db.waitlistEntry.findUnique({ where: { id } })
  if (!entry) return notFound('Entry not found.')
  let body: any = {}
  try { body = await req.json() } catch {}
  const status = body?.status === 'CONTACTED' ? 'CONTACTED' : 'CONFIRMED'
  const updated = await db.waitlistEntry.update({ where: { id }, data: { status } })
  return json({ entry: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  await db.waitlistEntry.delete({ where: { id } }).catch(() => {})
  return json({ ok: true })
}
