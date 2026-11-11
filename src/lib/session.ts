import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import type { User } from '@prisma/client'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: User['role']
  status: User['status']
  emailVerified: boolean
  image?: string | null
  title?: string | null
  department?: string | null
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      emailVerified: true,
      image: true,
      title: true,
      department: true,
    },
  })
  if (!user) return null
  return {
    ...user,
    emailVerified: !!user.emailVerified,
  }
}

// Strict session: only ACTIVE + emailVerified users may use the internal platform.
export async function getActiveSessionUser(): Promise<SessionUser | null> {
  const u = await getSessionUser()
  if (!u) return null
  if (u.status !== 'ACTIVE' || !u.emailVerified) return null
  return u
}
