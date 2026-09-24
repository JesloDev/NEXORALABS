import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, notFound } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }
  const data: any = {}
  if (typeof body?.title === 'string') data.title = body.title.trim()
  if (typeof body?.sdgTags === 'string') data.sdgTags = body.sdgTags.trim()
  if (typeof body?.progress === 'number') data.progress = Math.max(0, Math.min(100, body.progress))
  if (typeof body?.iconName === 'string') data.iconName = body.iconName.trim() || 'Leaf'
  if (typeof body?.published === 'boolean') data.published = body.published
  if (typeof body?.sortOrder === 'number') data.sortOrder = body.sortOrder
  const item = await db.pipelineItem.update({ where: { id }, data }).catch(() => null)
  if (!item) return notFound('Item not found.')
  return json({ item })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  await db.pipelineItem.delete({ where: { id } }).catch(() => {})
  return json({ ok: true })
}
