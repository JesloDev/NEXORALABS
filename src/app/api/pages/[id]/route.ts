import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, forbidden, notFound } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { spaceAccess } from '@/lib/access'

export const dynamic = 'force-dynamic'
const MAX_CONTENT = 200_000

async function load(me: Awaited<ReturnType<typeof getActiveSessionUser>>, id: string) {
  if (!me) return null
  const page = await db.page.findUnique({ where: { id }, include: { updater: { select: { id: true, name: true } }, creator: { select: { id: true, name: true } } } })
  if (!page) return null
  const acc = await spaceAccess(me, page.spaceId)
  if (!acc || !acc.canViewContent) return null // not a member and not an admin → page does not exist for you
  return { page, acc }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const r = await load(me, (await params).id)
  if (!r) return notFound('Page not found.')
  return json({ page: r.page, canEdit: !r.acc.space.archived })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const r = await load(me, (await params).id)
  if (!r) return notFound('Page not found.')
  if (r.acc.space.archived) return forbidden('This space is archived.')
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }

  const data: any = { updatedBy: me.id }
  if (typeof body?.title === 'string') data.title = body.title.trim().slice(0, 120) || 'Untitled'
  if (typeof body?.icon === 'string') data.icon = body.icon.trim().slice(0, 4) || null
  if (typeof body?.content === 'string') {
    if (body.content.length > MAX_CONTENT) return badRequest('Page is too large.')
    data.content = body.content
  }
  if (typeof body?.archived === 'boolean') data.archived = body.archived
  if ('parentId' in (body || {})) {
    const newParent: string | null = body.parentId || null
    if (newParent) {
      // same space, and no cycles (a page can't move under itself or a descendant)
      let cur: string | null = newParent
      while (cur) {
        if (cur === r.page.id) return badRequest('A page cannot be moved inside itself.')
        const p: { parentId: string | null; spaceId: string } | null = await db.page.findUnique({ where: { id: cur }, select: { parentId: true, spaceId: true } })
        if (!p || p.spaceId !== r.page.spaceId) return badRequest('Invalid parent page.')
        cur = p.parentId
      }
    }
    data.parentId = newParent
  }
  const page = await db.page.update({ where: { id: r.page.id }, data, select: { id: true, title: true, icon: true, parentId: true, updatedAt: true } })
  return json({ page })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const r = await load(me, (await params).id)
  if (!r) return notFound('Page not found.')
  const can = r.acc.canManage || r.page.createdBy === me.id
  if (!can) return forbidden('Only the page author or a space manager can delete this page.')
  await db.page.delete({ where: { id: r.page.id } }) // children cascade
  return json({ ok: true })
}
