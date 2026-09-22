import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const pinnedOnly = url.searchParams.get('pinned') === '1'
  const limit = Math.min(Number(url.searchParams.get('limit') || 20), 50)

  const where = { published: true, ...(pinnedOnly ? { pinned: true } : {}) }
  const announcements = await db.announcement.findMany({
    where,
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      category: true,
      imageUrl: true,
      pinned: true,
      publishedAt: true,
    },
  })
  return json({ announcements })
}
