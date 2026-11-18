import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function resetDatabase() {
  console.log('🧹 Starting Full Database Wipe (Keeping Super Admin only)...')

  // 1. Delete Attendance records
  const att = await prisma.attendance.deleteMany({})
  console.log(`✅ Deleted ${att.count} Attendance records.`)

  // 2. Delete Payments
  const pay = await prisma.payment.deleteMany({})
  console.log(`✅ Deleted ${pay.count} Payment records.`)

  // 3. Delete Subscription Freezes
  const frz = await prisma.subscriptionFreeze.deleteMany({})
  console.log(`✅ Deleted ${frz.count} Subscription Freeze records.`)

  // 4. Delete Subscriptions
  const sub = await prisma.subscription.deleteMany({})
  console.log(`✅ Deleted ${sub.count} Subscription records.`)

  // 5. Delete Members
  const mem = await prisma.member.deleteMany({})
  console.log(`✅ Deleted ${mem.count} Member records.`)

  // 6. Delete Trainers
  const tr = await prisma.trainer.deleteMany({})
  console.log(`✅ Deleted ${tr.count} Trainer records.`)

  // 7. Delete Membership Plans
  const pln = await prisma.membershipPlan.deleteMany({})
  console.log(`✅ Deleted ${pln.count} Membership Plan records.`)

  // 8. Delete Notifications
  const notif = await prisma.notification.deleteMany({})
  console.log(`✅ Deleted ${notif.count} Notification records.`)

  // 9. Delete Audit Logs
  const logs = await prisma.auditLog.deleteMany({})
  console.log(`✅ Deleted ${logs.count} Audit Log records.`)

  // 10. Delete All Users EXCEPT Super Admin(s)
  // Super Admin: capt.ahmed@gymvip.eg (Owner) and rabea.elzayate@gmail.com
  const usersDeleted = await prisma.user.deleteMany({
    where: {
      email: {
        notIn: ['capt.ahmed@gymvip.eg', 'rabea.elzayate@gmail.com'],
      },
    },
  })
  console.log(`✅ Deleted ${usersDeleted.count} Staff & Test Users.`)

  // Ensure capt.ahmed@gymvip.eg is active with OWNER role and valid password
  const passwordHash = await bcrypt.hash('GymVIP2025#', 10)

  const owner = await prisma.user.findFirst({
    where: { email: 'capt.ahmed@gymvip.eg' },
  })

  if (owner) {
    await prisma.user.update({
      where: { id: owner.id },
      data: {
        role: Role.OWNER,
        isActive: true,
        passwordHash,
      },
    })
    console.log(`👑 Super Admin verified: ${owner.name} (${owner.email}) - Role: OWNER`)
  }

  // Also if rabea.elzayate@gmail.com exists, upgrade to OWNER
  const rabeaUser = await prisma.user.findFirst({
    where: { email: 'rabea.elzayate@gmail.com' },
  })

  if (rabeaUser) {
    await prisma.user.update({
      where: { id: rabeaUser.id },
      data: {
        role: Role.OWNER,
        isActive: true,
        passwordHash,
      },
    })
    console.log(`👑 Personal Super Admin verified: ${rabeaUser.name} (${rabeaUser.email}) - Role: OWNER`)
  }

  // Final count verification
  const finalMembers = await prisma.member.count()
  const finalSubs = await prisma.subscription.count()
  const finalPayments = await prisma.payment.count()
  const finalAttendance = await prisma.attendance.count()
  const finalPlans = await prisma.membershipPlan.count()
  const finalUsers = await prisma.user.count()

  console.log('\n📊 DATABASE SUMMARY AFTER CLEANUP:')
  console.log(`   - Members: ${finalMembers}`)
  console.log(`   - Subscriptions: ${finalSubs}`)
  console.log(`   - Payments: ${finalPayments}`)
  console.log(`   - Attendance: ${finalAttendance}`)
  console.log(`   - Plans: ${finalPlans}`)
  console.log(`   - Super Admin Users: ${finalUsers}`)
  console.log('✨ Database is completely fresh and ready for real data!\n')
}

resetDatabase()
  .catch((e) => {
    console.error('Error resetting database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
