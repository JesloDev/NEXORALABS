import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { genToken } from '@/lib/api-helpers'
import type { AuthTokenKind } from '@prisma/client'

// One-time links for outside collaborators. Only a SHA-256 hash is stored, so a DB leak
// does not hand out working links. Each token works once and expires quickly.
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex')
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export async function issueToken(opts: { kind: AuthTokenKind; email: string; name?: string | null; spaceId?: string | null; inviteId?: string | null; minutes: number }) {
  const token = genToken()
  await db.authToken.create({
    data: { tokenHash: hashToken(token), kind: opts.kind, email: opts.email, name: opts.name ?? null, spaceId: opts.spaceId ?? null, inviteId: opts.inviteId ?? null, expiresAt: new Date(Date.now() + opts.minutes * 60_000) },
  })
  return token
}

// Atomically burns a token: returns the row only for the first caller.
export async function consumeToken(token: string, kind: AuthTokenKind) {
  if (!token || token.length < 20 || token.length > 200) return null
  const tokenHash = hashToken(token)
  const row = await db.authToken.findUnique({ where: { tokenHash } })
  if (!row || row.kind !== kind || row.usedAt || row.expiresAt < new Date()) return null
  const res = await db.authToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } })
  return res.count === 1 ? row : null
}

// Max 5 links per email per hour per kind (silently ignored beyond that).
export async function throttled(email: string, kind: AuthTokenKind) {
  const n = await db.authToken.count({ where: { email, kind, createdAt: { gt: new Date(Date.now() - 3600_000) } } })
  return n >= 5
}

export async function inviteProblem(inv: { active: boolean; expiresAt: Date | null; maxUses: number | null; currentUses: number; space: { archived: boolean } } | null) {
  if (!inv) return 'This invite link is not valid.'
  if (!inv.active) return 'This invite link has been turned off.'
  if (inv.expiresAt && inv.expiresAt < new Date()) return 'This invite link has expired.'
  if (inv.maxUses !== null && inv.currentUses >= inv.maxUses) return 'This invite link has reached its limit.'
  if (inv.space.archived) return 'This space is archived.'
  return null
}
