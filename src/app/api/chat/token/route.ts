import { db } from '@/lib/db'
import { json } from '@/lib/api-helpers'
import { mintSocketToken } from '@/lib/socket-token'
import { getActiveSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getActiveSessionUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)
  const token = mintSocketToken({ userId: user.id, email: user.email, name: user.name, role: user.role })
  return json({ token })
}
