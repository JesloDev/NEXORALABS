// Create or update an ADMIN account without storing credentials in the repo.
// Run: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' ADMIN_NAME='Your Name' bun run scripts/seed-admin.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD.')
  const name = process.env.ADMIN_NAME?.trim() || email.split('@')[0]
  const hash = await bcrypt.hash(password, 10)
  const user = await db.user.upsert({
    where: { email },
    update: { role: 'ADMIN', status: 'ACTIVE', emailVerified: new Date(), approvedAt: new Date(), password: hash },
    create: { email, name, password: hash, role: 'ADMIN', status: 'ACTIVE', emailVerified: new Date(), approvedAt: new Date() },
  })
  console.log(`Admin ready: ${user.email} (${user.id})`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
