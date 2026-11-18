import { prisma } from '../src/config/database.js'

async function check() {
  const plans = await prisma.membershipPlan.findMany()
  plans.forEach((p) => {
    console.log(`Plan [${p.id}]: name="${p.name}", price=${p.price}, duration=${p.durationDays}, desc=${JSON.stringify(p.description)}`)
  })
  await prisma.$disconnect()
}

check()
