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
  if (typeof body?.authorName === 'string') data.authorName = body.authorName.trim()
  if (typeof body?.authorRole === 'string') data.authorRole = body.authorRole.trim() || null
  if (typeof body?.authorCompany === 'string') data.authorCompany = body.authorCompany.trim() || null
  if (typeof body?.content === 'string') data.content = body.content.trim()
  if (typeof body?.rating === 'number') data.rating = Math.max(1, Math.min(5, body.rating))
  if (typeof body?.published === 'boolean') data.published = body.published
  if (typeof body?.featured === 'boolean') data.featured = body.featured
  const comment = await db.comment.update({ where: { id }, data }).catch(() => null)
  if (!comment) return notFound('Comment not found.')
  return json({ comment })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  await db.comment.delete({ where: { id } }).catch(() => {})
  return json({ ok: true })
}
