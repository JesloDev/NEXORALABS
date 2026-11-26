import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, notFound } from '@/lib/api-helpers'
import { inviteProblem } from '@/lib/guest-tokens'

export const dynamic = 'force-dynamic'

// Public: what the join page shows. Only the space's name/icon, nothing else about the app.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const inv = await db.spaceInvite.findUnique({ where: { token }, include: { space: true } })
  if (!inv) return notFound('This invite link is not valid.')
  const problem = await inviteProblem(inv)
  if (problem) return json({ error: problem }, 410)
  return json({ space: { name: inv.space.name, icon: inv.space.icon, color: inv.space.color, description: inv.space.description } })
}
