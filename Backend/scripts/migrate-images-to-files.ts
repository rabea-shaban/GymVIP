import { prisma } from '../src/config/database.js'
import { saveBase64Image, ensureUploadDirs } from '../src/utils/fileStorage.util.js'
import fs from 'fs'
import path from 'path'

async function migrateImages() {
  console.log('=====================================================')
  console.log('  🚀 GymVIP: Migrating Database Images to Backend Files')
  console.log('=====================================================\n')

  ensureUploadDirs()

  let migratedMembers = 0
  let migratedUsers = 0
  let migratedGyms = 0

  // 1. Members
  console.log('📌 Scanning Members table...')
  const members = await prisma.member.findMany({
    where: { avatarUrl: { not: null } },
    select: { id: true, memberCode: true, name: true, avatarUrl: true },
  })

  for (const m of members) {
    if (m.avatarUrl && (m.avatarUrl.startsWith('data:image/') || m.avatarUrl.length > 500)) {
      const originalLen = m.avatarUrl.length
      const newPath = await saveBase64Image(m.avatarUrl, 'members', `member-${m.memberCode}`)
      if (newPath) {
        await prisma.member.update({
          where: { id: m.id },
          data: { avatarUrl: newPath },
        })
        migratedMembers++
        console.log(`  ✅ Member [${m.memberCode}] ${m.name}: ${originalLen} chars base64 -> ${newPath}`)
      } else {
        console.warn(`  ⚠️ Failed to save image for Member [${m.memberCode}] ${m.name}`)
      }
    } else {
      console.log(`  ℹ️ Member [${m.memberCode}] ${m.name}: Already a file path or URL: ${m.avatarUrl}`)
    }
  }

  // 2. Users (Staff & Trainers)
  console.log('\n📌 Scanning Users table...')
  const users = await prisma.user.findMany({
    where: { avatarUrl: { not: null } },
    select: { id: true, name: true, email: true, avatarUrl: true },
  })

  for (const u of users) {
    if (u.avatarUrl && (u.avatarUrl.startsWith('data:image/') || u.avatarUrl.length > 500)) {
      const originalLen = u.avatarUrl.length
      const cleanPrefix = `user-${u.email.split('@')[0]}`
      const newPath = await saveBase64Image(u.avatarUrl, 'users', cleanPrefix)
      if (newPath) {
        await prisma.user.update({
          where: { id: u.id },
          data: { avatarUrl: newPath },
        })
        migratedUsers++
        console.log(`  ✅ User ${u.name} (${u.email}): ${originalLen} chars base64 -> ${newPath}`)
      } else {
        console.warn(`  ⚠️ Failed to save image for User ${u.name}`)
      }
    } else {
      console.log(`  ℹ️ User ${u.name}: Already a file path or URL: ${u.avatarUrl}`)
    }
  }

  // 3. Gyms (Brand Logos)
  console.log('\n📌 Scanning Gyms table...')
  const gyms = await prisma.gym.findMany({
    where: { logo: { not: null } },
    select: { id: true, name: true, slug: true, logo: true },
  })

  for (const g of gyms) {
    if (g.logo && (g.logo.startsWith('data:image/') || g.logo.length > 500)) {
      const originalLen = g.logo.length
      const newPath = await saveBase64Image(g.logo, 'gyms', `gym-${g.slug}`)
      if (newPath) {
        await prisma.gym.update({
          where: { id: g.id },
          data: { logo: newPath },
        })
        migratedGyms++
        console.log(`  ✅ Gym ${g.name} (${g.slug}): ${originalLen} chars base64 -> ${newPath}`)
      } else {
        console.warn(`  ⚠️ Failed to save logo for Gym ${g.name}`)
      }
    } else {
      console.log(`  ℹ️ Gym ${g.name}: Already a file path or URL: ${g.logo}`)
    }
  }

  console.log('\n=====================================================')
  console.log('  🎉 Migration Completed Successfully!')
  console.log(`  - Members Migrated: ${migratedMembers}`)
  console.log(`  - Users Migrated:   ${migratedUsers}`)
  console.log(`  - Gyms Migrated:    ${migratedGyms}`)
  console.log('=====================================================')

  await prisma.$disconnect()
}

migrateImages().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
