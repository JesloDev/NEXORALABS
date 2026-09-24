import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  const comments = await db.comment.findMany({
    orderBy: [{ createdAt: 'desc' }],
    include: { creator: { select: { id: true, name: true } } },
  })
  return json({ comments })
}

export async function POST(req: NextRequest) {
  const me = await getActiveSessionUser()
  if (!me || !isAdmin(me.role)) return json({ error: 'Unauthorized' }, 401)
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }
  const authorName = (body?.authorName || '').trim()
  const content = (body?.content || '').trim()
  if (!authorName || !content) return badRequest('Author name and content are required.')
  const comment = await db.comment.create({
    data: {
      authorName,
      authorRole: (body?.authorRole || '').trim() || null,
      authorCompany: (body?.authorCompany || '').trim() || null,
      content,
      rating: Math.max(1, Math.min(5, Number(body?.rating) || 5)),
      published: body?.published !== false,
      featured: body?.featured === true,
      createdBy: me.id,
    },
  })
  return json({ comment })
}
