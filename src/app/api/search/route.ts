import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { isOrgAdmin } from '@/lib/access'

export const dynamic = 'force-dynamic'

// Search messages + pages across everything the caller may read.
export async function GET(req: NextRequest) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const q = new URL(req.url).searchParams.get('q')?.trim() || ''
  if (q.length < 2) return json({ messages: [], pages: [] })
  const admin = isOrgAdmin(me.role)

  const spaceFilter = admin ? {} : { members: { some: { userId: me.id } } }
  const [pages, messages] = await Promise.all([
    db.page.findMany({
      where: { archived: false, space: spaceFilter, OR: [{ title: { contains: q } }, { content: { contains: q } }] },
      take: 10, orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, icon: true, spaceId: true, space: { select: { name: true } } },
    }),
    db.message.findMany({
      where: {
        deletedAt: null, content: { contains: q },
        chat: {
          OR: [
            { members: { some: { userId: me.id } } }, // my DMs / groups / joined channels
            ...(admin ? [{ type: 'CHANNEL' as const }] : []), // admins: every channel
          ],
        },
      },
      take: 20, orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, createdAt: true, parentId: true, sender: { select: { name: true } }, chat: { select: { id: true, name: true, type: true, spaceId: true } } },
    }),
  ])
  return json({ pages, messages })
}
