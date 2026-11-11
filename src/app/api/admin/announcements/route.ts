import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin } from '@/lib/permissions'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

export async function GET() {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    include: { creator: { select: { id: true, name: true } } },
  })
  return json({ announcements })
}

export async function POST(req: NextRequest) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }
  const title = (body?.title || '').trim()
  const summary = (body?.summary || '').trim()
  const content = (body?.content || '').trim()
  if (!title || !summary || !content) return badRequest('Title, summary and content are required.')
  const publish = body?.publish === true
  const announcement = await db.announcement.create({
    data: {
      title, summary, content,
      category: body?.category || 'NEWS',
      imageUrl: body?.imageUrl?.trim() || null,
      published: publish,
      publishedAt: publish ? new Date() : null,
      pinned: body?.pinned === true,
      createdBy: me.id,
    },
  })
  await logActivity({ userId: me.id, action: 'announcement_create', details: { id: announcement.id } })
  return json({ announcement })
}
