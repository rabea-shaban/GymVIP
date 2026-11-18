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
  await prisma.trainer.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.systemLicense.deleteMany();
  await prisma.backupRecord.deleteMany();

  console.log('✅ تم مسح وتصفير كافة الخطط والمدربين والأعضاء والاشتراكات والمدفوعات والتراخيص.');

  // 2. Setup Clean Neutral Gym Tenant
  const gym = await prisma.gym.upsert({
    where: { slug: 'gymvip-maadi' },
    update: {
      name: 'نادي رياضي',
      phone: '',
      email: 'admin@gymvip.eg',
      address: '',
      city: '',
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
      name: 'نادي رياضي',
      slug: 'gymvip-maadi',
      phone: '',
      email: 'admin@gymvip.eg',
      address: '',
      city: '',
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

  // 3. Reset or Create Default Initial Admin Account Only (No trainers, no other users)
  const defaultPasswordHash = await bcrypt.hash('GymVIP2025#', 10);
  const initialAdminEmail = 'capt.ahmed@gymvip.eg';

  // Delete all users except the single initial admin
  await prisma.user.deleteMany({
    where: {
      email: { not: initialAdminEmail },
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
      name: 'المدير الرئيسي',
      passwordHash: defaultPasswordHash,
      role: 'OWNER',
      isActive: true,
      lastLoginAt: null,
    },
    create: {
      gymId: gym.id,
      name: 'المدير الرئيسي',
      email: initialAdminEmail,
      phone: '',
      passwordHash: defaultPasswordHash,
      role: 'OWNER',
      isActive: true,
    },
  });

  console.log('✅ تم الاحتفاظ فقط بحساب المالك الرئيسي الافتراضي (بدون مدربين وبدون مستخدمين آخرين).');

  // 4. Set System Installation Singleton to INITIAL_LOGIN
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
