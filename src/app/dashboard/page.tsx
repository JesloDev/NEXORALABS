import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { DashboardApp } from '@/components/dashboard/dashboard-app'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/auth/signin?callbackUrl=/dashboard')

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, email: true, name: true, role: true, status: true,
      emailVerified: true, image: true, title: true, department: true, phone: true, bio: true,
    },
  })
  if (!user) redirect('/auth/signin')

  // Must be verified + active to reach the internal circle
  if (!user.emailVerified) redirect('/auth/signin?error=AccessDenied')
  if (user.status === 'SUSPENDED') redirect('/auth/signin?error=AccessDenied')
  if (user.status === 'PENDING') redirect('/auth/signin?error=AccessDenied')

  return <DashboardApp user={user} />
}
