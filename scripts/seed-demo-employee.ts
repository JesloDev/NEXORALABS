// Create a second approved employee for chat testing.
// Run: bun run scripts/seed-demo-employee.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('DemoEmployee!2025', 10)
  const u = await db.user.upsert({
    where: { email: 'ada.demo@nexoralabs.com' },
    update: {},
    create: {
      email: 'ada.demo@nexoralabs.com',
      name: 'Ada Demo',
      password: hash,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      emailVerified: new Date(),
      approvedAt: new Date(),
      title: 'Product Engineer',
      department: 'Engineering',
      bio: 'Demo employee for testing the internal chat.',
    },
  })
  console.log('Demo employee ensured:', u.email, '(', u.id, ')')
  console.log('Password: DemoEmployee!2025')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
