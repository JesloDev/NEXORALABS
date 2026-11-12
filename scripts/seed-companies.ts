// Seed the landing-page companies into the database (only when none exist yet).
// Run: bun run scripts/seed-companies.ts
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const COMPANIES = ['RUSHNG', 'DON Fashion', 'Life Renewed Initiative (LRI)', 'SAFE-R', 'Chronikon', 'CreCreativeAfrica', 'ATERO']

async function main() {
  if ((await db.pipelineItem.count()) > 0) return console.log('Companies already exist — nothing to do.')
  const owner = await db.user.findFirst({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } }, orderBy: { createdAt: 'asc' } })
  if (!owner) throw new Error('No admin user found. Run the admin seed first.')
  await db.pipelineItem.createMany({
    data: COMPANIES.map((title, i) => ({ title, sdgTags: '', progress: 0, sortOrder: i, published: true, createdBy: owner.id })),
  })
  console.log(`Seeded ${COMPANIES.length} companies.`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
