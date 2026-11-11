import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, forbidden, notFound } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { spaceAccess } from '@/lib/access'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const acc = await spaceAccess(me, id)
  if (!acc || !acc.canViewContent) return notFound('Space not found.')
  if (acc.space.archived) return forbidden('This space is archived.')
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }

  let parentId: string | null = null
  if (body?.parentId) {
    const parent = await db.page.findFirst({ where: { id: String(body.parentId), spaceId: id } })
    if (!parent) return badRequest('Parent page not found in this space.')
    parentId = parent.id
  }
  const last = await db.page.findFirst({ where: { spaceId: id, parentId }, orderBy: { position: 'desc' }, select: { position: true } })
  const page = await db.page.create({
    data: {
      spaceId: id, parentId, createdBy: me.id, updatedBy: me.id,
      title: String(body?.title || '').trim().slice(0, 120) || 'Untitled',
      icon: String(body?.icon || '').trim().slice(0, 4) || null,
      content: typeof body?.content === 'string' ? body.content : '',
      position: (last?.position ?? -1) + 1,
    },
  })
  return json({ page })
}
