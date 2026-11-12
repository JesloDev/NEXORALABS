import { db } from '@/lib/db'
import { json } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const comments = await db.comment.findMany({
      where: { published: true },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 12,
      select: { id: true, authorName: true, authorRole: true, authorCompany: true, content: true, rating: true, featured: true, createdAt: true },
    })
    return json({ comments })
  } catch {
    return json({ comments: [] })
  }
}
