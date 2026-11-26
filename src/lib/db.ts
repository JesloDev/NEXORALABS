import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Serverless (Vercel) starts many short-lived instances. Prisma's default pool opens up to
// (CPUs x 2 + 1) connections PER instance, which exhausts a small hosted Postgres and shows up as
// "This page couldn't load". Cap each instance, and wait a bit longer for a free connection.
// Set DB_CONNECTION_LIMIT to override (or put connection_limit in DATABASE_URL yourself).
function withPoolLimits(url: string | undefined) {
  if (!url) return undefined
  try {
    const u = new URL(url)
    if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', process.env.DB_CONNECTION_LIMIT || '5')
    if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '20')
    if (!u.searchParams.has('connect_timeout')) u.searchParams.set('connect_timeout', '15')
    return u.toString()
  } catch {
    return url
  }
}

const url = withPoolLimits(process.env.DATABASE_URL)

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    // never log every query in production: it slows each request and floods the logs
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  })

// reuse the client across hot reloads in dev; in production each instance builds it once at import
globalForPrisma.prisma = db
