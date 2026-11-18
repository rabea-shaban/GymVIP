/**
 * GymVIP - Fresh Commercial Installation & Database Reset Tool
 * Run this to reset the entire database to a clean, fresh-install commercial state.
 * Usage:
 *   npm run system:fresh-install
 */

import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('../Backend/node_modules/@prisma/client/index.js');
const bcrypt = require('../Backend/node_modules/bcrypt/bcrypt.js');

const prisma = new PrismaClient();

async function runFreshInstall() {
  console.log('\n=============================================================');
  console.log('   🚀 GymVIP Commercial SaaS - Fresh System Installation');
  console.log('=============================================================\n');

  console.log('⏳ جاري إعادة تهيئة وتصفير قاعدة البيانات...');

  // 1. Delete all transactional, customer, and temporary records
  await prisma.attendance.deleteMany();
  await prisma.subscriptionFreeze.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.member.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.systemLicense.deleteMany();
  await prisma.backupRecord.deleteMany();

  console.log('✅ تم تصفير بيانات الأعضاء والاشتراكات والمدفوعات والتراخيص القديمة.');

  // 2. Setup Default Primary Gym Tenant
  const gym = await prisma.gym.upsert({
    where: { slug: 'gymvip-maadi' },
    update: {
      name: 'جيم في أي بي - المركز الرئيسي',
      phone: '01012345678',
      email: 'maadi@gymvip.eg',
      address: 'شارع النصر، المعادي، القاهرة',
      city: 'القاهرة',
      currency: 'EGP',
      timezone: 'Africa/Cairo',
      isActive: true,
      setupCompleted: true,
      subscriptionReminderEnabled: true,
      subscriptionReminderDays: JSON.stringify([7, 3, 1]),
      subscriptionFreezeEnabled: true,
      allowedFreezeDurations: JSON.stringify([7, 14, 30]),
      maxFreezeDays: 90,
      allowManualCheckout: true,
    },
    create: {
      name: 'جيم في أي بي - المركز الرئيسي',
      slug: 'gymvip-maadi',
      phone: '01012345678',
      email: 'maadi@gymvip.eg',
      address: 'شارع النصر، المعادي، القاهرة',
      city: 'القاهرة',
      currency: 'EGP',
      timezone: 'Africa/Cairo',
      isActive: true,
      setupCompleted: true,
      subscriptionReminderEnabled: true,
      subscriptionReminderDays: JSON.stringify([7, 3, 1]),
      subscriptionFreezeEnabled: true,
      allowedFreezeDurations: JSON.stringify([7, 14, 30]),
      maxFreezeDays: 90,
      allowManualCheckout: true,
    },
  });

  // 3. Reset or Create Default Initial Admin Account
  const defaultPasswordHash = await bcrypt.hash('GymVIP2025#', 10);
  const initialAdminEmail = 'capt.ahmed@gymvip.eg';

  // Delete all users except owner and trainer to keep database ultra-clean
  await prisma.user.deleteMany({
    where: {
      email: { notIn: [initialAdminEmail, 'coach.tarek@gymvip.eg'] },
    },
  });

  await prisma.user.upsert({
    where: {
      gymId_email: {
        gymId: gym.id,
        email: initialAdminEmail,
      },
    },
    update: {
      name: 'مدير النظام الرئيسي',
      passwordHash: defaultPasswordHash,
      role: 'OWNER',
      isActive: true,
      lastLoginAt: null,
    },
    create: {
      gymId: gym.id,
      name: 'مدير النظام الرئيسي',
      email: initialAdminEmail,
      phone: '01012345678',
      passwordHash: defaultPasswordHash,
      role: 'OWNER',
      isActive: true,
    },
  });

  // 4. Ensure 4 Standard Membership Plans Exist
  const standardPlans = [
    { name: 'باقة شهرية - حديد ولياقة', price: 650, durationDays: 30 },
    { name: 'باقة ربع سنوية - VIP', price: 1750, durationDays: 90 },
    { name: 'باقة نصف سنوية - ذهبية', price: 3200, durationDays: 180 },
    { name: 'باقة سنوية شاملة - ماسية', price: 5500, durationDays: 365 },
  ];

  for (const plan of standardPlans) {
    await prisma.membershipPlan.upsert({
      where: {
        gymId_name: {
          gymId: gym.id,
          name: plan.name,
        },
      },
      update: {
        price: plan.price,
        durationDays: plan.durationDays,
        isActive: true,
      },
      create: {
        gymId: gym.id,
        name: plan.name,
        price: plan.price,
        durationDays: plan.durationDays,
        currency: 'EGP',
        isActive: true,
      },
    });
  }

  // 5. Ensure Trainer exists
  const trainerUser = await prisma.user.upsert({
    where: {
      gymId_email: {
        gymId: gym.id,
        email: 'coach.tarek@gymvip.eg',
      },
    },
    update: {
      name: 'كابتن طارق يوسف',
      role: 'TRAINER',
      passwordHash: defaultPasswordHash,
      isActive: true,
    },
    create: {
      gymId: gym.id,
      name: 'كابتن طارق يوسف',
      email: 'coach.tarek@gymvip.eg',
      phone: '01045678901',
      role: 'TRAINER',
      passwordHash: defaultPasswordHash,
      isActive: true,
    },
  });

  await prisma.trainer.upsert({
    where: { userId: trainerUser.id },
    update: {
      specialization: 'كمال أجسام ولياقة بدنية وإعداد بدني شامل',
    },
    create: {
      gymId: gym.id,
      userId: trainerUser.id,
      specialization: 'كمال أجسام ولياقة بدنية وإعداد بدني شامل',
      bio: 'مدرب محترف معتمد دولياً بخبرة 8 سنوات في الإشراف الرياضي وتأهيل الرياضيين وتصميم الحميات الغذائية.',
    },
  });

  // 6. Set System Installation Singleton to INITIAL_LOGIN
  await prisma.systemInstallation.upsert({
    where: { id: 'singleton' },
    update: {
      state: 'INITIAL_LOGIN',
      isAccountSetupDone: false,
      isActivated: false,
      initialAdminEmail,
      installedAt: new Date(),
      accountSetupAt: null,
      activatedAt: null,
    },
    create: {
      id: 'singleton',
      state: 'INITIAL_LOGIN',
      isAccountSetupDone: false,
      isActivated: false,
      initialAdminEmail,
      installedAt: new Date(),
    },
  });

  console.log('✅ تم ضبط حالة النظام كـ "تثبيت جديد لأول مرة" (INITIAL_LOGIN).');
  console.log('\n-------------------------------------------------------------');
  console.log('📋 بيانات تسجيل الدخول الأولية (Default Admin Credentials):');
  console.log(`✉️  البريد الإلكتروني: ${initialAdminEmail}`);
  console.log('🔑 كلمة المرور الافتراضية: GymVIP2025#');
  console.log('-------------------------------------------------------------');
  console.log('🔒 مسار المستخدم بعد تسجيل الدخول:');
  console.log('1. تسجيل الدخول بالبيانات الافتراضية أعلاه');
  console.log('2. الانتقال الإلزامي لصفحة إعداد وتحديث البريد وكلمة المرور الجديدة');
  console.log('3. الانتقال الإلزامي لصفحة تفعيل النظام عبر كود الترخيص الرقمي');
  console.log('4. فتح النظام بالكامل (Active)\n');
}

runFreshInstall()
  .catch((e) => {
    console.error('❌ حدث خطأ أثناء التثبيت الأولي:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
