import { db } from '@/lib/db'
import { json } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const items = await db.pipelineItem.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, title: true, sdgTags: true, progress: true, iconName: true, sortOrder: true },
    })
    return json({ items })
  } catch {
    return json({ items: [] })
  }
}
