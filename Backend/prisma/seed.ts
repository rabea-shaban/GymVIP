import {
  PrismaClient,
  Role,
  Gender,
  SubscriptionStatus,
  PaymentMethod,
  WalletProvider,
  NotificationType,
} from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting GymVIP Database Seed...')

  const passwordHash = await bcrypt.hash('GymVIP2025#', 10)

  // 1. Create or Update Main Gym Tenant
  const gym = await prisma.gym.upsert({
    where: { slug: 'gymvip-maadi' },
    update: {
      name: 'جيم في أي بي - فرع المعادي الرئيسي',
      phone: '01012345678',
      email: 'maadi@gymvip.eg',
      address: 'شارع النصر، دجلة المعادي، القاهرة',
      city: 'القاهرة',
      currency: 'EGP',
      timezone: 'Africa/Cairo',
      isActive: true,
      setupCompleted: true,
      subscriptionReminderEnabled: true,
      subscriptionReminderDays: [7, 3, 1],
      subscriptionFreezeEnabled: true,
      allowedFreezeDurations: [7, 14, 30],
      maxFreezeDays: 90,
      allowManualCheckout: true,
    },
    create: {
      name: 'جيم في أي بي - فرع المعادي الرئيسي',
      slug: 'gymvip-maadi',
      phone: '01012345678',
      email: 'maadi@gymvip.eg',
      address: 'شارع النصر، دجلة المعادي، القاهرة',
      city: 'القاهرة',
      currency: 'EGP',
      timezone: 'Africa/Cairo',
      isActive: true,
      setupCompleted: true,
      subscriptionReminderEnabled: true,
      subscriptionReminderDays: [7, 3, 1],
      subscriptionFreezeEnabled: true,
      allowedFreezeDurations: [7, 14, 30],
      maxFreezeDays: 90,
      allowManualCheckout: true,
    },
  })

  console.log(`✅ Gym verified: ${gym.name} (ID: ${gym.id})`)

  // 2. Create the 4 Primary Role Users (Matching LoginPage presets)
  const staffUsers = [
    {
      name: 'كابتن أحمد علي',
      email: 'capt.ahmed@gymvip.eg',
      phone: '01012345678',
      role: Role.OWNER,
    },
    {
      name: 'محمد إبراهيم',
      email: 'manager@gymvip.eg',
      phone: '01023456789',
      role: Role.MANAGER,
    },
    {
      name: 'سارة محمود',
      email: 'reception@gymvip.eg',
      phone: '01034567890',
      role: Role.RECEPTIONIST,
    },
    {
      name: 'كابتن طارق يوسف',
      email: 'coach.tarek@gymvip.eg',
      phone: '01045678901',
      role: Role.TRAINER,
    },
  ]

  const createdUsers: Record<string, any> = {}

  for (const staff of staffUsers) {
    const user = await prisma.user.upsert({
      where: {
        gymId_email: {
          gymId: gym.id,
          email: staff.email,
        },
      },
      update: {
        name: staff.name,
        phone: staff.phone,
        passwordHash,
        role: staff.role,
        isActive: true,
      },
      create: {
        gymId: gym.id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        passwordHash,
        role: staff.role,
        isActive: true,
      },
    })
    createdUsers[staff.role] = user
    console.log(`👤 User ready: ${staff.name} (${staff.role}) -> ${staff.email}`)
  }

  // Create Trainer Profile for Coach Tarek
  await prisma.trainer.upsert({
    where: { userId: createdUsers[Role.TRAINER].id },
    update: {
      specialization: 'كمال أجسام ولياقة بدنية وإعداد بدني شامل',
      bio: 'مدرب محترف معتمد دولياً بخبرة 8 سنوات في الإشراف الرياضي وتأهيل الرياضيين وتصميم الحميات الغذائية.',
    },
    create: {
      gymId: gym.id,
      userId: createdUsers[Role.TRAINER].id,
      specialization: 'كمال أجسام ولياقة بدنية وإعداد بدني شامل',
      bio: 'مدرب محترف معتمد دولياً بخبرة 8 سنوات في الإشراف الرياضي وتأهيل الرياضيين وتصميم الحميات الغذائية.',
    },
  })

  // 3. Create Membership Plans
  const plansData = [
    {
      name: 'باقة شهرية - حديد ولياقة',
      durationDays: 30,
      price: 650.0,
      description: 'دخول غير محدود لصالة الحديد وأجهزة الكارديو مع جلسة فحص InBody شهرية مجاناً.',
    },
    {
      name: 'باقة ربع سنوية - VIP',
      durationDays: 90,
      price: 1750.0,
      description: 'اشتراك 3 أشهر شامل صالة الحديد، الكارديو، غرف البخار والساونا، ومتابعة تدريبية مخصصة.',
    },
    {
      name: 'باقة نصف سنوية - ذهبية',
      durationDays: 180,
      price: 3200.0,
      description: 'اشتراك 6 أشهر مع إمكانية تجميد الاشتراك حتى 30 يوماً وخصم 15% على متجر المكملات.',
    },
    {
      name: 'باقة سنوية شاملة - ماسية',
      durationDays: 365,
      price: 5500.0,
      description: 'اشتراك سنوي مفتوح VIP يشمل كل المرافق وتجميد 60 يوماً ودعوات ضيوف شهرية مجانية.',
    },
  ]

  const createdPlans: Record<string, any> = {}

  for (const planItem of plansData) {
    const plan = await prisma.membershipPlan.upsert({
      where: {
        gymId_name: {
          gymId: gym.id,
          name: planItem.name,
        },
      },
      update: {
        durationDays: planItem.durationDays,
        price: planItem.price,
        description: planItem.description,
        isActive: true,
      },
      create: {
        gymId: gym.id,
        name: planItem.name,
        durationDays: planItem.durationDays,
        price: planItem.price,
        description: planItem.description,
        currency: 'EGP',
        isActive: true,
      },
    })
    createdPlans[planItem.name] = plan
    console.log(`📋 Plan ready: ${plan.name} (${plan.price} EGP)`)
  }

  // 4. Create Members
  const membersData = [
    {
      code: 'VIP-1001',
      name: 'محمود السعيد حسن',
      phone: '01011112222',
      email: 'mahmoud.saeed@gmail.com',
      gender: Gender.MALE,
      dateOfBirth: new Date('1994-05-12'),
      emergencyContactName: 'سعيد حسن (الوالد)',
      emergencyContactPhone: '01099991111',
      notes: 'عضو منتظم يفضل التدريب الصباحي',
    },
    {
      code: 'VIP-1002',
      name: 'كريم عبد العزيز سالم',
      phone: '01022223333',
      email: 'karim.abdelaziz@yahoo.com',
      gender: Gender.MALE,
      dateOfBirth: new Date('1990-11-20'),
      emergencyContactName: 'أحمد عبد العزيز',
      emergencyContactPhone: '01088882222',
      notes: 'مشترك في باقة VIP ربع سنوية',
    },
    {
      code: 'VIP-1003',
      name: 'عمر الشريف مروان',
      phone: '01033334444',
      email: 'omar.sherif@outlook.com',
      gender: Gender.MALE,
      dateOfBirth: new Date('1998-03-15'),
      emergencyContactName: 'شريف مروان',
      emergencyContactPhone: '01077773333',
      notes: 'مهتم بتمارين القوة وبناء العضلات',
    },
    {
      code: 'VIP-1004',
      name: 'حسام حسن إبراهيم',
      phone: '01044445555',
      email: 'hossam.hassan@gmail.com',
      gender: Gender.MALE,
      dateOfBirth: new Date('1992-08-01'),
      emergencyContactName: 'محمد حسن',
      emergencyContactPhone: '01066664444',
      notes: 'طلب تجميد الاشتراك مؤقتاً لظروف العمل',
    },
    {
      code: 'VIP-1005',
      name: 'يوسف إبراهيم فتحي',
      phone: '01055556666',
      email: 'youssef.ibrahim@hotmail.com',
      gender: Gender.MALE,
      dateOfBirth: new Date('1996-01-28'),
      emergencyContactName: 'إبراهيم فتحي',
      emergencyContactPhone: '01055554444',
      notes: 'انتهى اشتراكه وجاري المتابعة للتجديد',
    },
    {
      code: 'VIP-1006',
      name: 'مينا مجدي نجيب',
      phone: '01066667777',
      email: 'mina.magdy@gmail.com',
      gender: Gender.MALE,
      dateOfBirth: new Date('1993-07-14'),
      emergencyContactName: 'مجدي نجيب',
      emergencyContactPhone: '01044443333',
      notes: 'مشترك في الباقة السنوية الماسية',
    },
    {
      code: 'VIP-1007',
      name: 'نورهان علي السيد',
      phone: '01077778888',
      email: 'nourhan.ali@gmail.com',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('1997-09-09'),
      emergencyContactName: 'علي السيد',
      emergencyContactPhone: '01033332222',
      notes: 'مشتركة في حصص اللياقة البدنية النسائية',
    },
    {
      code: 'VIP-1008',
      name: 'ياسمين عبد الله فؤاد',
      phone: '01088889999',
      email: 'yasmine.abdallah@gmail.com',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('1995-12-04'),
      emergencyContactName: 'عبد الله فؤاد',
      emergencyContactPhone: '01022221111',
      notes: 'مشتركة باقة نصف سنوية ذهبية',
    },
    {
      code: 'VIP-1009',
      name: 'زياد طارق كمال',
      phone: '01111112222',
      email: 'ziad.tarek@gmail.com',
      gender: Gender.MALE,
      dateOfBirth: new Date('2000-04-18'),
      emergencyContactName: 'طارق كمال',
      emergencyContactPhone: '01199998888',
      notes: 'طالب جامعي مشترك بالباقة الشهرية',
    },
    {
      code: 'VIP-1010',
      name: 'مروان محسن توفيق',
      phone: '01122223333',
      email: 'marwan.mohsen@gmail.com',
      gender: Gender.MALE,
      dateOfBirth: new Date('1991-06-30'),
      emergencyContactName: 'محسن توفيق',
      emergencyContactPhone: '01188887777',
      notes: 'قام بإلغاء الاشتراك لظروف سفر مفاجئة',
    },
  ]

  const createdMembers: any[] = []

  for (const m of membersData) {
    const member = await prisma.member.upsert({
      where: {
        gymId_memberCode: {
          gymId: gym.id,
          memberCode: m.code,
        },
      },
      update: {
        name: m.name,
        phone: m.phone,
        email: m.email,
        gender: m.gender,
        dateOfBirth: m.dateOfBirth,
        emergencyContactName: m.emergencyContactName,
        emergencyContactPhone: m.emergencyContactPhone,
        notes: m.notes,
        isActive: true,
      },
      create: {
        gymId: gym.id,
        memberCode: m.code,
        name: m.name,
        phone: m.phone,
        email: m.email,
        gender: m.gender,
        dateOfBirth: m.dateOfBirth,
        emergencyContactName: m.emergencyContactName,
        emergencyContactPhone: m.emergencyContactPhone,
        notes: m.notes,
        isActive: true,
      },
    })
    createdMembers.push(member)
  }
  console.log(`🏋️ ${createdMembers.length} Members ready.`)

  // 5. Clean up existing operational records for fresh clean seeding
  await prisma.attendance.deleteMany({ where: { gymId: gym.id } })
  await prisma.subscriptionFreeze.deleteMany({ where: { gymId: gym.id } })
  await prisma.payment.deleteMany({ where: { gymId: gym.id } })
  await prisma.subscription.deleteMany({ where: { gymId: gym.id } })
  await prisma.notification.deleteMany({ where: { gymId: gym.id } })
  await prisma.auditLog.deleteMany({ where: { gymId: gym.id } })

  const now = new Date()
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
  const daysAhead = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000)

  // Subscriptions & Payments Creation
  // 1) Active Sub: Mahmoud (Monthly)
  const sub1 = await prisma.subscription.create({
    data: {
      gymId: gym.id,
      memberId: createdMembers[0].id,
      planId: createdPlans['باقة شهرية - حديد ولياقة'].id,
      planName: 'باقة شهرية - حديد ولياقة',
      planPrice: 650.0,
      durationDays: 30,
      currency: 'EGP',
      startDate: daysAgo(10),
      endDate: daysAhead(20),
      status: SubscriptionStatus.ACTIVE,
      notes: 'تجديد شهري منتظم',
    },
  })
  await prisma.payment.create({
    data: {
      gymId: gym.id,
      subscriptionId: sub1.id,
      memberId: createdMembers[0].id,
      amount: 650.0,
      currency: 'EGP',
      method: PaymentMethod.CASH,
      notes: 'دفعة نقدية كاملة بالاستقبال',
      createdByUserId: createdUsers[Role.RECEPTIONIST].id,
      createdAt: daysAgo(10),
    },
  })

  // 2) Active Sub: Karim (Quarterly VIP)
  const sub2 = await prisma.subscription.create({
    data: {
      gymId: gym.id,
      memberId: createdMembers[1].id,
      planId: createdPlans['باقة ربع سنوية - VIP'].id,
      planName: 'باقة ربع سنوية - VIP',
      planPrice: 1750.0,
      durationDays: 90,
      currency: 'EGP',
      startDate: daysAgo(25),
      endDate: daysAhead(65),
      status: SubscriptionStatus.ACTIVE,
      notes: 'دفع عبر إنستاباي مع متابعة مدرب',
    },
  })
  await prisma.payment.create({
    data: {
      gymId: gym.id,
      subscriptionId: sub2.id,
      memberId: createdMembers[1].id,
      amount: 1750.0,
      currency: 'EGP',
      method: PaymentMethod.WALLET,
      walletProvider: WalletProvider.INSTAPAY,
      transactionReference: 'INSTA-2026-98124',
      notes: 'تحويل إنستاباي معتمد',
      createdByUserId: createdUsers[Role.MANAGER].id,
      createdAt: daysAgo(25),
    },
  })

  // 3) Active Sub: Omar (Semi-Annual Gold)
  const sub3 = await prisma.subscription.create({
    data: {
      gymId: gym.id,
      memberId: createdMembers[2].id,
      planId: createdPlans['باقة نصف سنوية - ذهبية'].id,
      planName: 'باقة نصف سنوية - ذهبية',
      planPrice: 3200.0,
      durationDays: 180,
      currency: 'EGP',
      startDate: daysAgo(40),
      endDate: daysAhead(140),
      status: SubscriptionStatus.ACTIVE,
    },
  })
  await prisma.payment.create({
    data: {
      gymId: gym.id,
      subscriptionId: sub3.id,
      memberId: createdMembers[2].id,
      amount: 3200.0,
      currency: 'EGP',
      method: PaymentMethod.WALLET,
      walletProvider: WalletProvider.VODAFONE_CASH,
      transactionReference: 'VF-CASH-882194',
      notes: 'فودافون كاش - تأكيد استلام الرسالة',
      createdByUserId: createdUsers[Role.OWNER].id,
      createdAt: daysAgo(40),
    },
  })

  // 4) Frozen Sub: Hossam (Quarterly VIP - Currently Frozen)
  const sub4 = await prisma.subscription.create({
    data: {
      gymId: gym.id,
      memberId: createdMembers[3].id,
      planId: createdPlans['باقة ربع سنوية - VIP'].id,
      planName: 'باقة ربع سنوية - VIP',
      planPrice: 1750.0,
      durationDays: 90,
      currency: 'EGP',
      startDate: daysAgo(30),
      endDate: daysAhead(74), // extended by freeze 14 days
      status: SubscriptionStatus.FROZEN,
      notes: 'تم تجميد الاشتراك لمدة أسبوعين لظروف علاجية',
    },
  })
  await prisma.payment.create({
    data: {
      gymId: gym.id,
      subscriptionId: sub4.id,
      memberId: createdMembers[3].id,
      amount: 1750.0,
      currency: 'EGP',
      method: PaymentMethod.CASH,
      createdByUserId: createdUsers[Role.RECEPTIONIST].id,
      createdAt: daysAgo(30),
    },
  })
  await prisma.subscriptionFreeze.create({
    data: {
      gymId: gym.id,
      subscriptionId: sub4.id,
      startDate: daysAgo(4),
      endDate: daysAhead(10),
      days: 14,
      reason: 'إصابة عضلية طفيفة وتوصية طبية بالراحة أسبوعين',
      createdByUserId: createdUsers[Role.MANAGER].id,
      createdAt: daysAgo(4),
    },
  })

  // 5) Expired Sub: Youssef (Monthly Plan)
  const sub5 = await prisma.subscription.create({
    data: {
      gymId: gym.id,
      memberId: createdMembers[4].id,
      planId: createdPlans['باقة شهرية - حديد ولياقة'].id,
      planName: 'باقة شهرية - حديد ولياقة',
      planPrice: 650.0,
      durationDays: 30,
      currency: 'EGP',
      startDate: daysAgo(35),
      endDate: daysAgo(5),
      status: SubscriptionStatus.EXPIRED,
      notes: 'انتهى وبانتظار التجديد',
    },
  })
  await prisma.payment.create({
    data: {
      gymId: gym.id,
      subscriptionId: sub5.id,
      memberId: createdMembers[4].id,
      amount: 650.0,
      currency: 'EGP',
      method: PaymentMethod.CASH,
      createdByUserId: createdUsers[Role.RECEPTIONIST].id,
      createdAt: daysAgo(35),
    },
  })

  // 6) Active Sub: Mina (Annual Diamond)
  const sub6 = await prisma.subscription.create({
    data: {
      gymId: gym.id,
      memberId: createdMembers[5].id,
      planId: createdPlans['باقة سنوية شاملة - ماسية'].id,
      planName: 'باقة سنوية شاملة - ماسية',
      planPrice: 5500.0,
      durationDays: 365,
      currency: 'EGP',
      startDate: daysAgo(60),
      endDate: daysAhead(305),
      status: SubscriptionStatus.ACTIVE,
      notes: 'عضو سنوي VIP',
    },
  })
  await prisma.payment.create({
    data: {
      gymId: gym.id,
      subscriptionId: sub6.id,
      memberId: createdMembers[5].id,
      amount: 5500.0,
      currency: 'EGP',
      method: PaymentMethod.WALLET,
      walletProvider: WalletProvider.INSTAPAY,
      transactionReference: 'INSTA-ANNUAL-44102',
      notes: 'سداد كامل عبر إنستاباي',
      createdByUserId: createdUsers[Role.OWNER].id,
      createdAt: daysAgo(60),
    },
  })

  // 7) Active Sub: Nourhan (Quarterly VIP)
  const sub7 = await prisma.subscription.create({
    data: {
      gymId: gym.id,
      memberId: createdMembers[6].id,
      planId: createdPlans['باقة ربع سنوية - VIP'].id,
      planName: 'باقة ربع سنوية - VIP',
      planPrice: 1750.0,
      durationDays: 90,
      currency: 'EGP',
      startDate: daysAgo(15),
      endDate: daysAhead(75),
      status: SubscriptionStatus.ACTIVE,
    },
  })
  await prisma.payment.create({
    data: {
      gymId: gym.id,
      subscriptionId: sub7.id,
      memberId: createdMembers[6].id,
      amount: 1750.0,
      currency: 'EGP',
      method: PaymentMethod.CASH,
      createdByUserId: createdUsers[Role.RECEPTIONIST].id,
      createdAt: daysAgo(15),
    },
  })

  // 8) Cancelled Sub: Marwan (Monthly - Cancelled)
  await prisma.subscription.create({
    data: {
      gymId: gym.id,
      memberId: createdMembers[9].id,
      planId: createdPlans['باقة شهرية - حديد ولياقة'].id,
      planName: 'باقة شهرية - حديد ولياقة',
      planPrice: 650.0,
      durationDays: 30,
      currency: 'EGP',
      startDate: daysAgo(12),
      endDate: daysAhead(18),
      status: SubscriptionStatus.CANCELLED,
      cancelledAt: daysAgo(2),
      cancellationReason: 'سفر مفاجئ خارج البلاد لظروف العمل',
      cancellationNotes: 'طلب العضو إلغاء العضوية وتمت الموافقة من المدير التنفيذي',
      cancelledByUserId: createdUsers[Role.MANAGER].id,
    },
  })

  console.log('💳 Subscriptions & Payments seeded.')

  // 6. Create Attendances (Real Check-ins)
  const attendanceRecords = [
    // Today's attendance - Active inside gym right now (no checkout yet)
    {
      memberId: createdMembers[0].id,
      subscriptionId: sub1.id,
      checkInAt: new Date(now.getTime() - 45 * 60 * 1000), // 45 mins ago
      checkOutAt: null,
      durationMinutes: null,
    },
    // Today - Checked in and out
    {
      memberId: createdMembers[1].id,
      subscriptionId: sub2.id,
      checkInAt: new Date(now.getTime() - 180 * 60 * 1000), // 3 hours ago
      checkOutAt: new Date(now.getTime() - 95 * 60 * 1000),
      durationMinutes: 85,
    },
    {
      memberId: createdMembers[2].id,
      subscriptionId: sub3.id,
      checkInAt: new Date(now.getTime() - 240 * 60 * 1000),
      checkOutAt: new Date(now.getTime() - 150 * 60 * 1000),
      durationMinutes: 90,
    },
    // Yesterday
    {
      memberId: createdMembers[0].id,
      subscriptionId: sub1.id,
      checkInAt: daysAgo(1),
      checkOutAt: new Date(daysAgo(1).getTime() + 75 * 60 * 1000),
      durationMinutes: 75,
    },
    {
      memberId: createdMembers[5].id,
      subscriptionId: sub6.id,
      checkInAt: daysAgo(1),
      checkOutAt: new Date(daysAgo(1).getTime() + 110 * 60 * 1000),
      durationMinutes: 110,
    },
    {
      memberId: createdMembers[6].id,
      subscriptionId: sub7.id,
      checkInAt: daysAgo(1),
      checkOutAt: new Date(daysAgo(1).getTime() + 60 * 60 * 1000),
      durationMinutes: 60,
    },
    // 2 Days ago
    {
      memberId: createdMembers[1].id,
      subscriptionId: sub2.id,
      checkInAt: daysAgo(2),
      checkOutAt: new Date(daysAgo(2).getTime() + 80 * 60 * 1000),
      durationMinutes: 80,
    },
    {
      memberId: createdMembers[2].id,
      subscriptionId: sub3.id,
      checkInAt: daysAgo(2),
      checkOutAt: new Date(daysAgo(2).getTime() + 95 * 60 * 1000),
      durationMinutes: 95,
    },
  ]

  for (const att of attendanceRecords) {
    await prisma.attendance.create({
      data: {
        gymId: gym.id,
        memberId: att.memberId,
        subscriptionId: att.subscriptionId,
        checkInAt: att.checkInAt,
        checkOutAt: att.checkOutAt,
        durationMinutes: att.durationMinutes,
      },
    })
  }
  console.log(`⏱️ ${attendanceRecords.length} Attendances seeded.`)

  // 7. Create Operational Notifications
  const notificationsData = [
    {
      type: NotificationType.SUBSCRIPTION_EXPIRING,
      title: 'تنبيه باقتراب موعد انتهاء الاشتراك',
      message: 'اشتراك العضو محمود السعيد حسن ينتهي خلال 20 يوماً.',
      recipientUserId: createdUsers[Role.OWNER].id,
      isRead: false,
    },
    {
      type: NotificationType.PAYMENT_RECEIVED,
      title: 'استلام دفعة مالية جديدة عبر إنستاباي',
      message: 'تم تسجيل دفعة بقيمة 1,750 ج.م لحساب العضو كريم عبد العزيز سالم.',
      recipientUserId: createdUsers[Role.OWNER].id,
      isRead: true,
      readAt: daysAgo(1),
    },
    {
      type: NotificationType.SUBSCRIPTION_FROZEN,
      title: 'تم تجميد اشتراك عضو مؤقتاً',
      message: 'قام المدير التنفيذي بتجميد اشتراك العضو حسام حسن لمدة 14 يوماً.',
      recipientUserId: createdUsers[Role.MANAGER].id,
      isRead: false,
    },
    {
      type: NotificationType.SUBSCRIPTION_EXPIRED,
      title: 'انتهاء اشتراك عضو',
      message: 'انتهت مدة اشتراك العضو يوسف إبراهيم فتحي برجاء المتابعة لتجديد الباقة.',
      recipientUserId: createdUsers[Role.RECEPTIONIST].id,
      isRead: false,
    },
  ]

  for (const n of notificationsData) {
    await prisma.notification.create({
      data: {
        gymId: gym.id,
        recipientUserId: n.recipientUserId,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        readAt: n.readAt ?? null,
      },
    })
  }
  console.log(`🔔 Notifications seeded.`)

  // 8. Create Audit Trail Logs (Feature 14 AuditLog)
  const auditLogsData = [
    {
      actorUserId: createdUsers[Role.OWNER].id,
      action: 'AUTH.LOGIN',
      entityType: 'AUTH',
      entityId: createdUsers[Role.OWNER].id,
      description: 'تسجيل دخول ناجح لمالك المنظومة (كابتن أحمد علي)',
      createdAt: daysAgo(3),
    },
    {
      actorUserId: createdUsers[Role.MANAGER].id,
      action: 'MEMBER.CREATE',
      entityType: 'MEMBER',
      entityId: createdMembers[0].id,
      description: 'تسجيل عضو جديد بالنادي: محمود السعيد حسن (كود VIP-1001)',
      createdAt: daysAgo(10),
    },
    {
      actorUserId: createdUsers[Role.RECEPTIONIST].id,
      action: 'PAYMENT.CREATE',
      entityType: 'PAYMENT',
      description: 'تسجيل دفعة نقدية بقيمة 650 ج.م للاشتراك الشهري',
      createdAt: daysAgo(10),
    },
    {
      actorUserId: createdUsers[Role.MANAGER].id,
      action: 'SUBSCRIPTION.FREEZE',
      entityType: 'SUBSCRIPTION',
      entityId: sub4.id,
      description: 'تجميد اشتراك العضو حسام حسن لمدة 14 يوماً بناءً على طلبه',
      createdAt: daysAgo(4),
    },
    {
      actorUserId: createdUsers[Role.MANAGER].id,
      action: 'SUBSCRIPTION.CANCEL',
      entityType: 'SUBSCRIPTION',
      description: 'إلغاء اشتراك العضو مروان محسن توفيق لظروف السفر',
      createdAt: daysAgo(2),
    },
  ]

  for (const log of auditLogsData) {
    await prisma.auditLog.create({
      data: {
        gymId: gym.id,
        actorUserId: log.actorUserId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId ?? null,
        description: log.description,
        createdAt: log.createdAt,
      },
    })
  }
  console.log(`📜 Audit Logs seeded.`)

  console.log('\n=============================================')
  console.log('🎉 GymVIP Database Seed Completed Successfully!')
  console.log('=============================================')
  console.log('بيانات الدخول المعتمدة لكافة الرتب (كلمة المرور موحدة: GymVIP2025#):')
  console.log('1. صاحب النادي:      capt.ahmed@gymvip.eg')
  console.log('2. المدير التنفيذي:  manager@gymvip.eg')
  console.log('3. موظف الاستقبال:  reception@gymvip.eg')
  console.log('4. المدرب الرياضي:  coach.tarek@gymvip.eg')
  console.log('=============================================\n')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
