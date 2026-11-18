import { prisma } from '../src/config/database.js'

async function check() {
  console.log('--- Checking Database for Images ---')
  const members = await prisma.member.findMany({
    where: { avatarUrl: { not: null } },
    select: { id: true, name: true, memberCode: true, avatarUrl: true },
  })
  console.log(`Found ${members.length} members with avatar:`)
  members.forEach((m) => {
    const isBase64 = m.avatarUrl?.startsWith('data:image/')
    const len = m.avatarUrl?.length || 0
    console.log(` - Member [${m.memberCode}] ${m.name}: base64=${isBase64}, length=${len}, sample=${m.avatarUrl?.slice(0, 40)}...`)
  })

  const users = await prisma.user.findMany({
    where: { avatarUrl: { not: null } },
    select: { id: true, name: true, email: true, avatarUrl: true },
  })
  console.log(`\nFound ${users.length} users with avatar:`)
  users.forEach((u) => {
    const isBase64 = u.avatarUrl?.startsWith('data:image/')
    const len = u.avatarUrl?.length || 0
    console.log(` - User ${u.name} (${u.email}): base64=${isBase64}, length=${len}, sample=${u.avatarUrl?.slice(0, 40)}...`)
  })

  const gyms = await prisma.gym.findMany({
    where: { logo: { not: null } },
    select: { id: true, name: true, logo: true },
  })
  console.log(`\nFound ${gyms.length} gyms with logo:`)
  gyms.forEach((g) => {
    const isBase64 = g.logo?.startsWith('data:image/')
    const len = g.logo?.length || 0
    console.log(` - Gym ${g.name}: base64=${isBase64}, length=${len}, sample=${g.logo?.slice(0, 40)}...`)
  })

  await prisma.$disconnect()
  console.log('--- Check Complete ---')
}

check().catch((err) => {
  console.error('Error checking images:', err)
  process.exit(1)
})
