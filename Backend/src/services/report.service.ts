import { Role, Prisma, SubscriptionStatus, PaymentMethod } from '@prisma/client'
import { prisma } from '../config/database.js'
import { AppError } from '../utils/appError.util.js'
import {
  getCurrentCairoDate,
  getCairoBusinessDayRange,
  getCairoMonthRange,
  parseDate,
} from '../utils/date.util.js'
import type {
  ReportDateFilter,
  ReportSummaryDto,
  MembersReportDto,
  SubscriptionsReportDto,
  AttendanceReportDto,
  PaymentsReportDto,
} from '../types/report.types.js'

/**
 * Resolves standard date boundaries for reports normalized to Africa/Cairo business timezone.
 */
function resolveReportDateRange(filter: ReportDateFilter): {
  fromDate: Date
  toDate: Date
  fromStr: string
  toStr: string
} {
  const today = getCurrentCairoDate()
  let fromDate: Date
  let toDate: Date

  if (filter.from) {
    const parsed = parseDate(filter.from)
    fromDate = getCairoBusinessDayRange(parsed).startOfDay
  } else {
    // Default to start of current month
    fromDate = getCairoMonthRange(today).startOfMonth
  }

  if (filter.to) {
    const parsed = parseDate(filter.to)
    toDate = getCairoBusinessDayRange(parsed).endOfDay
  } else {
    toDate = getCairoBusinessDayRange(today).endOfDay
  }

  return {
    fromDate,
    toDate,
    fromStr: filter.from || fromDate.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }),
    toStr: filter.to || toDate.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }),
  }
}

/**
 * Generates overall reporting summary across all modules
 */
export async function getReportsSummary(
  gymId: string,
  userRole: Role,
  filter: ReportDateFilter
): Promise<ReportSummaryDto> {
  const { fromDate, toDate, fromStr, toStr } = resolveReportDateRange(filter)
  const canViewFinancials = userRole === Role.OWNER || userRole === Role.MANAGER

  // 1. Members
  const [totalCreatedMembers, activeMembers, inactiveMembers] = await Promise.all([
    prisma.member.count({
      where: {
        gymId,
        createdAt: { gte: fromDate, lte: toDate },
      },
    }),
    prisma.member.count({ where: { gymId, isActive: true } }),
    prisma.member.count({ where: { gymId, isActive: false } }),
  ])

  // 2. Subscriptions
  const now = new Date()
  const [createdSubs, activeSubs, frozenSubs, expiredSubs] = await Promise.all([
    prisma.subscription.count({
      where: {
        gymId,
        createdAt: { gte: fromDate, lte: toDate },
      },
    }),
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
  ])

  // 3. Attendance
  const [totalCheckIns, distinctAttendance] = await Promise.all([
    prisma.attendance.count({
      where: {
        gymId,
        checkInAt: { gte: fromDate, lte: toDate },
      },
    }),
    prisma.attendance.findMany({
      where: {
        gymId,
        checkInAt: { gte: fromDate, lte: toDate },
      },
      select: { memberId: true },
      distinct: ['memberId'],
    }),
  ])

  const diffDays = Math.max(
    1,
    Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
  )
  const averageDailyAttendance = Math.round((totalCheckIns / diffDays) * 10) / 10

  // 4. Payments (if authorized)
  let paymentsSummary: ReportSummaryDto['payments'] = undefined

  if (canViewFinancials) {
    const [periodPayments, allActiveSubscriptions] = await Promise.all([
      prisma.payment.findMany({
        where: {
          gymId,
          createdAt: { gte: fromDate, lte: toDate },
        },
        select: { amount: true, method: true },
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

    const totalCollectedDecimal = periodPayments.reduce(
      (acc, p) => acc.plus(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0)
    )

    const cashDecimal = periodPayments
      .filter((p) => p.method === PaymentMethod.CASH)
      .reduce((acc, p) => acc.plus(new Prisma.Decimal(p.amount)), new Prisma.Decimal(0))

    const walletDecimal = periodPayments
      .filter((p) => p.method === PaymentMethod.WALLET)
      .reduce((acc, p) => acc.plus(new Prisma.Decimal(p.amount)), new Prisma.Decimal(0))

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
      totalCollected: totalCollectedDecimal.toFixed(2),
      transactionCount: periodPayments.length,
      cashCollected: cashDecimal.toFixed(2),
      walletCollected: walletDecimal.toFixed(2),
      outstandingAmount: outstandingDecimal.toFixed(2),
    }
  }

  return {
    dateRange: { from: fromStr, to: toStr },
    members: {
      totalCreated: totalCreatedMembers,
      active: activeMembers,
      inactive: inactiveMembers,
    },
    subscriptions: {
      totalCreated: createdSubs,
      active: activeSubs,
      frozen: frozenSubs,
      expired: expiredSubs,
    },
    attendance: {
      totalCheckIns,
      distinctMembers: distinctAttendance.length,
      averageDaily: averageDailyAttendance,
    },
    payments: paymentsSummary,
  }
}

/**
 * Generates detailed Members report
 */
export async function getMembersReport(
  gymId: string,
  filter: ReportDateFilter
): Promise<MembersReportDto> {
  const { fromDate, toDate, fromStr, toStr } = resolveReportDateRange(filter)

  const [totalCreated, active, inactive, membersList] = await Promise.all([
    prisma.member.count({
      where: { gymId, createdAt: { gte: fromDate, lte: toDate } },
    }),
    prisma.member.count({ where: { gymId, isActive: true } }),
    prisma.member.count({ where: { gymId, isActive: false } }),
    prisma.member.findMany({
      where: { gymId, createdAt: { gte: fromDate, lte: toDate } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Group by date
  const dateMap: Record<string, number> = {}
  membersList.forEach((m) => {
    const d = m.createdAt.toISOString().split('T')[0] ?? ''
    dateMap[d] = (dateMap[d] || 0) + 1
  })

  const breakdown = Object.entries(dateMap).map(([date, count]) => ({ date, count }))

  return {
    dateRange: { from: fromStr, to: toStr },
    totalCreated,
    active,
    inactive,
    breakdown,
  }
}

/**
 * Generates detailed Subscriptions report
 */
export async function getSubscriptionsReport(
  gymId: string,
  filter: ReportDateFilter
): Promise<SubscriptionsReportDto> {
  const { fromDate, toDate, fromStr, toStr } = resolveReportDateRange(filter)
  const now = new Date()

  const [totalCreated, active, frozen, expired, allMembersWithSubs] = await Promise.all([
    prisma.subscription.count({
      where: { gymId, createdAt: { gte: fromDate, lte: toDate } },
    }),
    prisma.subscription.count({
      where: { gymId, status: SubscriptionStatus.ACTIVE, endDate: { gte: now } },
    }),
    prisma.subscription.count({
      where: { gymId, status: SubscriptionStatus.FROZEN },
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
      where: { gymId, createdAt: { gte: fromDate, lte: toDate } },
      select: { id: true, memberId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Identify renewals (members who had an older subscription)
  let renewalsCount = 0
  const dateMap: Record<string, number> = {}

  for (const s of allMembersWithSubs) {
    const d = s.createdAt.toISOString().split('T')[0] ?? ''
    dateMap[d] = (dateMap[d] || 0) + 1

    const prior = await prisma.subscription.findFirst({
      where: {
        gymId,
        memberId: s.memberId,
        createdAt: { lt: s.createdAt },
      },
      select: { id: true },
    })
    if (prior) {
      renewalsCount++
    }
  }

  const breakdown = Object.entries(dateMap).map(([date, count]) => ({ date, count }))

  return {
    dateRange: { from: fromStr, to: toStr },
    totalCreated,
    active,
    frozen,
    expired,
    renewalsCount,
    breakdown,
  }
}

/**
 * Generates detailed Attendance report
 */
export async function getAttendanceReport(
  gymId: string,
  filter: ReportDateFilter
): Promise<AttendanceReportDto> {
  const { fromDate, toDate, fromStr, toStr } = resolveReportDateRange(filter)

  const [totalCheckIns, distinctRecords, allAttendances] = await Promise.all([
    prisma.attendance.count({
      where: { gymId, checkInAt: { gte: fromDate, lte: toDate } },
    }),
    prisma.attendance.findMany({
      where: { gymId, checkInAt: { gte: fromDate, lte: toDate } },
      select: { memberId: true },
      distinct: ['memberId'],
    }),
    prisma.attendance.findMany({
      where: { gymId, checkInAt: { gte: fromDate, lte: toDate } },
      select: { checkInAt: true, memberId: true },
      orderBy: { checkInAt: 'asc' },
    }),
  ])

  const diffDays = Math.max(
    1,
    Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
  )
  const averageDaily = Math.round((totalCheckIns / diffDays) * 10) / 10

  const dailyMap: Record<string, { checkIns: number; members: Set<string> }> = {}
  allAttendances.forEach((a) => {
    const d = a.checkInAt.toISOString().split('T')[0] ?? ''
    if (!dailyMap[d]) {
      dailyMap[d] = { checkIns: 0, members: new Set() }
    }
    dailyMap[d].checkIns++
    dailyMap[d].members.add(a.memberId)
  })

  const dailyBreakdown = Object.entries(dailyMap).map(([date, val]) => ({
    date,
    checkIns: val.checkIns,
    distinctMembers: val.members.size,
  }))

  return {
    dateRange: { from: fromStr, to: toStr },
    totalCheckIns,
    distinctMembers: distinctRecords.length,
    averageDaily,
    dailyBreakdown,
  }
}

/**
 * Generates detailed Payments report (Restricted to OWNER & MANAGER)
 */
export async function getPaymentsReport(
  gymId: string,
  userRole: Role,
  filter: ReportDateFilter
): Promise<PaymentsReportDto> {
  if (userRole !== Role.OWNER && userRole !== Role.MANAGER) {
    throw AppError.forbidden('ليس لديك صلاحية للاطلاع على التقارير المالية / Forbidden')
  }

  const { fromDate, toDate, fromStr, toStr } = resolveReportDateRange(filter)

  const [periodPayments, allActiveSubscriptions] = await Promise.all([
    prisma.payment.findMany({
      where: { gymId, createdAt: { gte: fromDate, lte: toDate } },
      select: { amount: true, method: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
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

  const totalCollectedDecimal = periodPayments.reduce(
    (acc, p) => acc.plus(new Prisma.Decimal(p.amount)),
    new Prisma.Decimal(0)
  )

  const cashDecimal = periodPayments
    .filter((p) => p.method === PaymentMethod.CASH)
    .reduce((acc, p) => acc.plus(new Prisma.Decimal(p.amount)), new Prisma.Decimal(0))

  const walletDecimal = periodPayments
    .filter((p) => p.method === PaymentMethod.WALLET)
    .reduce((acc, p) => acc.plus(new Prisma.Decimal(p.amount)), new Prisma.Decimal(0))

  const dailyMap: Record<string, { amount: Prisma.Decimal; count: number }> = {}
  periodPayments.forEach((p) => {
    const d = p.createdAt.toISOString().split('T')[0] ?? ''
    if (!dailyMap[d]) {
      dailyMap[d] = { amount: new Prisma.Decimal(0), count: 0 }
    }
    dailyMap[d].amount = dailyMap[d].amount.plus(new Prisma.Decimal(p.amount))
    dailyMap[d].count++
  })

  const dailyBreakdown = Object.entries(dailyMap).map(([date, val]) => ({
    date,
    amount: Number(val.amount.toFixed(2)),
    count: val.count,
  }))

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

  return {
    dateRange: { from: fromStr, to: toStr },
    totalCollected: totalCollectedDecimal.toFixed(2),
    transactionCount: periodPayments.length,
    byMethod: {
      cash: cashDecimal.toFixed(2),
      wallet: walletDecimal.toFixed(2),
    },
    dailyBreakdown,
    outstandingAmount: outstandingDecimal.toFixed(2),
  }
}
