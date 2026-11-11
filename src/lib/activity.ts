import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export interface ActivityCtx {
  userId?: string | null
  action: string
  details?: Record<string, unknown>
  ip?: string | null
  userAgent?: string | null
}

export async function logActivity(ctx: ActivityCtx) {
  try {
    await db.activityLog.create({
      data: {
        userId: ctx.userId ?? null,
        action: ctx.action,
        details: ctx.details ? JSON.stringify(ctx.details) : '{}',
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
      },
    })
  } catch (e) {
    console.error('[activity] failed to log', e)
  }
}
