import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const items = await db.pipelineItem.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: { creator: { select: { id: true, name: true } } },
  })
  return json({ items })
}

export async function POST(req: NextRequest) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }
  const title = (body?.title || '').trim()
  const sdgTags = (body?.sdgTags || '').trim()
  if (!title || !sdgTags) return badRequest('Title and SDG tags are required.')
  const progress = Math.max(0, Math.min(100, Number(body?.progress) || 0))
  const item = await db.pipelineItem.create({
    data: {
      title, sdgTags, progress,
      iconName: (body?.iconName || 'Leaf').trim(),
      published: body?.published !== false,
      sortOrder: Number(body?.sortOrder) || 0,
      createdBy: me.id,
    },
  })
  return json({ item })
}
