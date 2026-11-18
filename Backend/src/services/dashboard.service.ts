import { Role, Prisma, SubscriptionStatus } from '@prisma/client'
import { prisma } from '../config/database.js'
import {
  getCurrentCairoDate,
  getCairoBusinessDayRange,
  getCairoMonthRange,
} from '../utils/date.util.js'
import type { DashboardOverviewDto } from '../types/dashboard.types.js'

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

/**
 * Generates the complete dashboard overview with real database metrics
 * strictly scoped to the authenticated gym and respecting user role authorizations.
 */
export async function getDashboardOverview(
  gymId: string,
  userRole: Role
): Promise<DashboardOverviewDto> {
  const canViewFinancials = userRole === Role.OWNER || userRole === Role.MANAGER

  const todayCairo = getCurrentCairoDate()
  const { startOfDay: startOfToday, endOfDay: endOfToday } = getCairoBusinessDayRange(todayCairo)
  const { startOfMonth, endOfMonth } = getCairoMonthRange(todayCairo)

  // 1. Member Metrics
  const [totalMembers, activeMembers, inactiveMembers, newThisMonthMembers] = await Promise.all([
    prisma.member.count({ where: { gymId } }),
    prisma.member.count({ where: { gymId, isActive: true } }),
    prisma.member.count({ where: { gymId, isActive: false } }),
    prisma.member.count({
      where: {
        gymId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
  ])

  // 2. Subscription Metrics
  const now = new Date()
  const in3DaysDate = new Date(todayCairo)
  in3DaysDate.setUTCDate(in3DaysDate.getUTCDate() + 3)
  const { endOfDay: in3DaysEnd } = getCairoBusinessDayRange(in3DaysDate)

  const [activeSubsCount, frozenSubsCount, expiredSubsCount, expiringSoonSubs] = await Promise.all([
    prisma.subscription.count({
      where: {
        gymId,
        status: SubscriptionStatus.ACTIVE,
        endDate: { gte: now },
      },
    }),
    prisma.subscription.count({
      where: {
        gymId,
        status: SubscriptionStatus.FROZEN,
      },
    }),
    prisma.subscription.count({
      where: {
        gymId,
        OR: [
          { status: SubscriptionStatus.EXPIRED },
          { status: SubscriptionStatus.ACTIVE, endDate: { lt: now } },
        ],
      },
    }),
    prisma.subscription.findMany({
      where: {
        gymId,
        status: SubscriptionStatus.ACTIVE,
        endDate: { gte: now, lte: in3DaysEnd },
        member: { isActive: true },
      },
      select: { id: true },
    }),
  ])

  // 3. Attendance Metrics
  const [openAttendances, checkInsTodayCount] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        gymId,
        checkInAt: { gte: startOfToday, lte: endOfToday },
        checkOutAt: null,
      },
      select: { memberId: true },
      distinct: ['memberId'],
    }),
    prisma.attendance.count({
      where: {
        gymId,
        checkInAt: { gte: startOfToday, lte: endOfToday },
      },
    }),
  ])
  const presentToday = openAttendances.length

  // Calculate average daily attendance over previous 7 complete days (yesterday - 6 days ago)
  let total7DaysDistinct = 0
  for (let i = 1; i <= 7; i++) {
    const dayDate = new Date(todayCairo)
    dayDate.setUTCDate(dayDate.getUTCDate() - i)
    const { startOfDay, endOfDay } = getCairoBusinessDayRange(dayDate)
    const distinctDay = await prisma.attendance.findMany({
      where: {
        gymId,
        checkInAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { memberId: true },
      distinct: ['memberId'],
    })
    total7DaysDistinct += distinctDay.length
  }
  const averageDailyAttendance = Math.round((total7DaysDistinct / 7) * 10) / 10

  // 4. Financial Metrics (if authorized)
  let paymentsSummary:
    | { collectedToday: string; collectedThisMonth: string; outstandingAmount: string }
    | undefined = undefined

  if (canViewFinancials) {
    const [todayPayments, monthPayments, allActiveSubscriptions] = await Promise.all([
      prisma.payment.findMany({
        where: {
          gymId,
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
        select: { amount: true },
      }),
      prisma.payment.findMany({
        where: {
          gymId,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { amount: true },
      }),
      prisma.subscription.findMany({
        where: {
          gymId,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.FROZEN] },
        },
        select: {
          id: true,
          planPrice: true,
          payments: { select: { amount: true } },
        },
      }),
    ])

    const collectedTodayDecimal = todayPayments.reduce(
      (acc, p) => acc.plus(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0)
    )
    const collectedThisMonthDecimal = monthPayments.reduce(
      (acc, p) => acc.plus(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0)
    )

    let outstandingDecimal = new Prisma.Decimal(0)
    for (const sub of allActiveSubscriptions) {
      const planCost = new Prisma.Decimal(sub.planPrice)
      const paid = sub.payments.reduce(
        (acc, p) => acc.plus(new Prisma.Decimal(p.amount)),
        new Prisma.Decimal(0)
      )
      if (planCost.greaterThan(paid)) {
        outstandingDecimal = outstandingDecimal.plus(planCost.minus(paid))
      }
    }

    paymentsSummary = {
      collectedToday: collectedTodayDecimal.toFixed(2),
      collectedThisMonth: collectedThisMonthDecimal.toFixed(2),
      outstandingAmount: outstandingDecimal.toFixed(2),
    }
  }

  // 5. Trainer Metrics
  const [totalTrainers, activeTrainers] = await Promise.all([
    prisma.trainer.count({ where: { gymId } }),
    prisma.trainer.count({ where: { gymId, user: { isActive: true } } }),
  ])

  // 6. Charts Data
  // A. Daily attendance for the past 7 days (including today)
  const dailyAttendanceChart: Array<{ date: string; dayLabel: string; count: number }> = []
  for (let i = 6; i >= 0; i--) {
    const dayDate = new Date(todayCairo)
    dayDate.setUTCDate(dayDate.getUTCDate() - i)
    const { startOfDay, endOfDay } = getCairoBusinessDayRange(dayDate)
    const distinctAtt = await prisma.attendance.findMany({
      where: {
        gymId,
        checkInAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { memberId: true },
      distinct: ['memberId'],
    })
    const dateStr = dayDate.toISOString().split('T')[0] ?? ''
    const dayOfWeek = dayDate.getUTCDay()
    dailyAttendanceChart.push({
      date: dateStr,
      dayLabel: ARABIC_DAYS[dayOfWeek] ?? '',
      count: distinctAtt.length,
    })
  }

  // B. Monthly New Members for the past 6 months
  const monthlyNewMembersChart: Array<{ month: string; monthLabel: string; count: number }> = []
  const monthlyPaymentsChart: Array<{ month: string; monthLabel: string; amount: number }> = []

  for (let i = 5; i >= 0; i--) {
    const targetMonthDate = new Date(todayCairo)
    targetMonthDate.setUTCMonth(targetMonthDate.getUTCMonth() - i)
    const { startOfMonth: mStart, endOfMonth: mEnd } = getCairoMonthRange(targetMonthDate)

    const year = targetMonthDate.getUTCFullYear()
    const monthIdx = targetMonthDate.getUTCMonth()
    const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`
    const monthLabel = `${ARABIC_MONTHS[monthIdx]} ${year}`

    const count = await prisma.member.count({
      where: {
        gymId,
        createdAt: { gte: mStart, lte: mEnd },
      },
    })
    monthlyNewMembersChart.push({
      month: monthKey,
      monthLabel,
      count,
    })

    if (canViewFinancials) {
      const monthPaymentsList = await prisma.payment.findMany({
        where: {
          gymId,
          createdAt: { gte: mStart, lte: mEnd },
        },
        select: { amount: true },
      })
      const totalAmount = monthPaymentsList.reduce(
        (acc, p) => acc.plus(new Prisma.Decimal(p.amount)),
        new Prisma.Decimal(0)
      )
      monthlyPaymentsChart.push({
        month: monthKey,
        monthLabel,
        amount: Number(totalAmount.toFixed(2)),
      })
    }
  }

  // 7. Recent Activity (unified real events)
  const [recentMembers, recentSubscriptions, recentPayments, recentCheckIns] = await Promise.all([
    prisma.member.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, memberCode: true, createdAt: true },
    }),
    prisma.subscription.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { member: { select: { id: true, name: true } } },
    }),
    canViewFinancials
      ? prisma.payment.findMany({
          where: { gymId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            member: { select: { id: true, name: true } },
            subscription: { select: { id: true, planName: true } },
          },
        })
      : Promise.resolve([]),
    prisma.attendance.findMany({
      where: { gymId },
      orderBy: { checkInAt: 'desc' },
      take: 10,
      include: { member: { select: { id: true, name: true } } },
    }),
  ])

  const activityList: Array<{
    id: string
    type: 'MEMBER' | 'SUBSCRIPTION' | 'PAYMENT' | 'ATTENDANCE'
    title: string
    description: string
    timestamp: string
    entityId?: string
  }> = []

  recentMembers.forEach((m) => {
    activityList.push({
      id: `member-${m.id}`,
      type: 'MEMBER',
      title: 'تسجيل عضو جديد',
      description: `تم إضافة العضو "${m.name}" (${m.memberCode})`,
      timestamp: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
      entityId: m.id,
    })
  })

  recentSubscriptions.forEach((s) => {
    activityList.push({
      id: `sub-${s.id}`,
      type: 'SUBSCRIPTION',
      title: 'اشتراك جديد',
      description: `تم تفعيل باقة "${s.planName}" للعضو "${s.member?.name || 'العضو'}"`,
      timestamp: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
      entityId: s.id,
    })
  })

  recentPayments.forEach((p: any) => {
    activityList.push({
      id: `pay-${p.id}`,
      type: 'PAYMENT',
      title: 'دفعة مالية مستلمة',
      description: `تم تحصيل ${Number(p.amount).toFixed(0)} ج.م من العضو "${p.member?.name || 'العضو'}"`,
      timestamp: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
      entityId: p.subscriptionId || p.id,
    })
  })

  recentCheckIns.forEach((a) => {
    activityList.push({
      id: `att-${a.id}`,
      type: 'ATTENDANCE',
      title: 'تسجيل دخول',
      description: `حضور العضو "${a.member?.name || 'العضو'}" إلى الصالة الرياضية`,
      timestamp: a.checkInAt instanceof Date ? a.checkInAt.toISOString() : String(a.checkInAt),
      entityId: a.member?.id || a.id,
    })
  })

  activityList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const recentActivity = activityList.slice(0, 10)

  // 8. Upcoming Expirations (within next 7 days)
  const in7DaysDate = new Date(todayCairo)
  in7DaysDate.setUTCDate(in7DaysDate.getUTCDate() + 7)
  const { endOfDay: in7DaysEnd } = getCairoBusinessDayRange(in7DaysDate)

  const upcomingSubs = await prisma.subscription.findMany({
    where: {
      gymId,
      status: SubscriptionStatus.ACTIVE,
      endDate: { gte: now, lte: in7DaysEnd },
      member: { isActive: true },
    },
    include: {
      member: { select: { id: true, name: true, memberCode: true, phone: true, avatarUrl: true } },
    },
    orderBy: { endDate: 'asc' },
    take: 10,
  })

  const upcomingExpirations = upcomingSubs.map((sub) => {
    const endMs = new Date(sub.endDate).getTime()
    const diffMs = endMs - now.getTime()
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

    return {
      subscriptionId: sub.id,
      memberId: sub.member.id,
      memberName: sub.member.name,
      memberCode: sub.member.memberCode,
      memberPhone: sub.member.phone,
      memberAvatarUrl: sub.member.avatarUrl ?? null,
      planName: sub.planName,
      endDate:
        (sub.endDate instanceof Date
          ? sub.endDate.toISOString().split('T')[0]
          : String(sub.endDate).split('T')[0]) ?? '',
      daysRemaining,
    }
  })

  return {
    members: {
      total: totalMembers,
      active: activeMembers,
      inactive: inactiveMembers,
      newThisMonth: newThisMonthMembers,
    },
    subscriptions: {
      active: activeSubsCount,
      frozen: frozenSubsCount,
      expired: expiredSubsCount,
      expiringSoon: expiringSoonSubs.length,
    },
    attendance: {
      presentToday,
      checkInsToday: checkInsTodayCount,
      averageDailyAttendance,
    },
    payments: paymentsSummary,
    trainers: {
      total: totalTrainers,
      active: activeTrainers,
    },
    charts: {
      dailyAttendance: dailyAttendanceChart,
      monthlyPayments: canViewFinancials ? monthlyPaymentsChart : undefined,
      monthlyNewMembers: monthlyNewMembersChart,
    },
    recentActivity,
    upcomingExpirations,
  }
}
