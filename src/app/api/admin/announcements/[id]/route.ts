import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, notFound, badRequest } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin } from '@/lib/permissions'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }
  const data: any = {}
  if (typeof body?.title === 'string') data.title = body.title.trim()
  if (typeof body?.summary === 'string') data.summary = body.summary.trim()
  if (typeof body?.content === 'string') data.content = body.content.trim()
  if (body?.category) data.category = body.category
  if (typeof body?.imageUrl === 'string') data.imageUrl = body.imageUrl.trim() || null
  if (typeof body?.published === 'boolean') {
    data.published = body.published
    data.publishedAt = body.published ? (await db.announcement.findUnique({ where: { id }, select: { publishedAt: true } }))?.publishedAt ?? new Date() : null
  }
  if (typeof body?.pinned === 'boolean') data.pinned = body.pinned
  const announcement = await db.announcement.update({ where: { id }, data })
  return json({ announcement })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  await db.announcement.delete({ where: { id } }).catch(() => {})
  await logActivity({ userId: me.id, action: 'announcement_delete', details: { id } })
  return json({ ok: true })
}
