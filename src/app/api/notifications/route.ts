import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json } from '@/lib/api-helpers'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const me = await getSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const notifications = await db.notification.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const unread = await db.notification.count({ where: { userId: me.id, read: false } })
  return json({ notifications, unread })
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  let body: any
  try { body = await req.json() } catch { body = {} }
  if (body?.markAll) {
    await db.notification.updateMany({ where: { userId: me.id, read: false }, data: { read: true } })
    return json({ ok: true })
  }
  if (body?.id) {
    await db.notification.updateMany({ where: { id: body.id, userId: me.id }, data: { read: true } })
    return json({ ok: true })
  }
  return json({ ok: true })
}
