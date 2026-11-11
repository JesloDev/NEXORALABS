// Seed the NEXORALABS super admin + sample announcements.
// Run: bun run scripts/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

const SUPER_EMAIL = 'jesuloluwaojaomo@gmail.com'
const SUPER_PASSWORD = 'NexoraSecure!2025'

async function main() {
  const hash = await bcrypt.hash(SUPER_PASSWORD, 10)
  const existing = await db.user.findUnique({ where: { email: SUPER_EMAIL }, select: { password: true } })

  const superAdmin = await db.user.upsert({
    where: { email: SUPER_EMAIL },
    update: {
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: new Date(),
      approvedAt: new Date(),
      title: 'Founder & Super Administrator',
      department: 'Leadership',
      ...(existing && existing.password ? {} : { password: hash }),
    },
    create: {
      email: SUPER_EMAIL,
      name: 'Jesuloluwa Ojaomo',
      password: hash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: new Date(),
      approvedAt: new Date(),
      title: 'Founder & Super Administrator',
      department: 'Leadership',
      bio: 'Founder of NEXORALABS — turning bold ideas into sustainable, SDG-aligned solutions.',
    },
  })

  console.log('Super admin ensured:', superAdmin.email, '(', superAdmin.id, ')')

  const annCount = await db.announcement.count()
  if (annCount === 0) {
    await db.announcement.createMany({
      data: [
        {
          title: 'NEXORALABS Joins the UN SDG Action Network',
          summary: 'We are proud to formalize our partnership with the Sustainable Development Goals framework.',
          content:
            'NEXORALABS has officially aligned its innovation pipeline with the United Nations Sustainable Development Goals. Every solution we engineer is now mapped to specific SDG targets — from clean energy and climate action to quality education and decent work. This partnership ensures that the ideas we turn into products deliver measurable, lasting impact for communities and the planet.',
          category: 'PARTNERSHIP',
          published: true,
          publishedAt: new Date(),
          pinned: true,
          createdBy: superAdmin.id,
        },
        {
          title: 'Innovation Sprint 2025: Applications Open',
          summary: 'Our flagship program inviting founders to co-build sustainable solutions is now open.',
          content:
            'The 2025 Innovation Sprint is live. Selected teams receive technical mentorship, access to our engineering platform, and direct guidance on SDG alignment. We are looking for bold ideas in climate-tech, health access, food systems, and inclusive fintech. Submit your concept and let us turn it into a deployable, sustainable solution together.',
          category: 'EVENT',
          published: true,
          publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
          createdBy: superAdmin.id,
        },
        {
          title: 'New Internal Secure Collaboration Suite Launches',
          summary: 'Our team now communicates on a hardened, privacy-first internal platform.',
          content:
            'NEXORALABS employees now have access to a secure internal collaboration platform with hardened backend protections, membership-scoped conversations, and full activity monitoring. Invite-based onboarding ensures only approved team members ever enter the internal circle. This is part of our ongoing commitment to operational security and sustainable, scalable growth.',
          category: 'UPDATE',
          published: true,
          publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
          createdBy: superAdmin.id,
        },
      ],
    })
    console.log('Sample announcements created')
  } else {
    console.log('Announcements already exist, skipping')
  }

  console.log('\nSuper admin login:')
  console.log('  Email:    ', SUPER_EMAIL)
  console.log('  Password: ', SUPER_PASSWORD)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
