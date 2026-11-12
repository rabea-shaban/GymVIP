import { prisma } from '../config/database.js'
import { AppError } from '../utils/appError.util.js'
import {
  getCairoBusinessDayRange,
  calculateDurationMinutes,
  getEffectiveSubscriptionStatus,
} from '../utils/date.util.js'
import { SubscriptionStatus, type Prisma } from '@prisma/client'
import type {
  AttendanceDto,
  AttendanceFilterQuery,
  AttendanceListResult,
  TodayAttendanceSummary,
} from '../types/attendance.types.js'
import { createAuditLog } from './audit.service.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../types/audit.types.js'

function mapAttendanceToDto(record: any): AttendanceDto {
  return {
    id: record.id,
    gymId: record.gymId,
    memberId: record.memberId,
    subscriptionId: record.subscriptionId,
    checkInAt: record.checkInAt,
    checkOutAt: record.checkOutAt ?? null,
    durationMinutes: record.durationMinutes ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    member: record.member
      ? {
          id: record.member.id,
          name: record.member.name,
          phone: record.member.phone,
          memberCode: record.member.memberCode,
          email: record.member.email ?? null,
        }
      : undefined,
    subscription: record.subscription
      ? {
          id: record.subscription.id,
          planName: record.subscription.planName,
          planPrice:
            typeof record.subscription.planPrice === 'object' &&
            record.subscription.planPrice !== null &&
            'toFixed' in record.subscription.planPrice
              ? record.subscription.planPrice.toFixed(2)
              : String(record.subscription.planPrice),
          durationDays: record.subscription.durationDays,
          startDate: record.subscription.startDate,
          endDate: record.subscription.endDate,
          status: record.subscription.status,
        }
      : undefined,
  }
}

/**
 * Check-in a member into the gym
 */
export async function checkInMember(
  gymId: string,
  memberId: string,
  actorUserId?: string
): Promise<AttendanceDto> {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Verify member existence and gym isolation
    const member = await tx.member.findFirst({
      where: { id: memberId, gymId },
    })

    if (!member) {
      throw AppError.notFound('العضو غير موجود / Member not found')
    }

    // 2. Verify member isActive
    if (!member.isActive) {
      throw AppError.conflict('العضو غير نشط')
    }

    // 3. Concurrency check: Ensure no open attendance exists
    const openAttendance = await tx.attendance.findFirst({
      where: {
        gymId,
        memberId,
        checkOutAt: null,
      },
    })

    if (openAttendance) {
      throw AppError.conflict('العضو مسجل حضور بالفعل ولم يتم تسجيل الانصراف')
    }

    // 4. Verify subscription
    const now = new Date()
    const subscriptions = await tx.subscription.findMany({
      where: {
        gymId,
        memberId,
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    })

    if (subscriptions.length === 0) {
      throw AppError.conflict('لا يوجد اشتراك نشط يسمح بتسجيل الحضور')
    }

    // Look for active subscription covering current time
    let validSubscription = subscriptions.find((sub) => {
      const effective = getEffectiveSubscriptionStatus(sub)
      if (effective !== SubscriptionStatus.ACTIVE) return false
      const start = new Date(sub.startDate)
      const end = new Date(sub.endDate)
      return now.getTime() >= start.getTime() && now.getTime() <= end.getTime()
    })

    if (!validSubscription) {
      // Determine specific error reason from most relevant subscription
      const latestSub = subscriptions[0]
      if (latestSub) {
        if (latestSub.status === SubscriptionStatus.FROZEN) {
          throw AppError.conflict('الاشتراك مجمد ولا يمكن تسجيل الحضور')
        }
        if (
          latestSub.status === SubscriptionStatus.EXPIRED ||
          now.getTime() > new Date(latestSub.endDate).getTime()
        ) {
          throw AppError.conflict('الاشتراك منتهي ولا يمكن تسجيل الحضور')
        }
        if (latestSub.status === SubscriptionStatus.CANCELLED) {
          throw AppError.conflict('لا يوجد اشتراك نشط يسمح بتسجيل الحضور')
        }
      }
      throw AppError.conflict('لا يوجد اشتراك نشط يسمح بتسجيل الحضور')
    }

    // 5. Create attendance record
    const checkInAt = new Date()
    const newAttendance = await tx.attendance.create({
      data: {
        gymId,
        memberId,
        subscriptionId: validSubscription.id,
        checkInAt,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            phone: true,
            memberCode: true,
            email: true,
          },
        },
        subscription: {
          select: {
            id: true,
            planName: true,
            planPrice: true,
            durationDays: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
    })

    return mapAttendanceToDto(newAttendance)
  })

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.ATTENDANCE_CHECK_IN,
    entityType: AUDIT_ENTITY_TYPES.ATTENDANCE,
    entityId: result.id,
    description: `تسجيل حضور للعضو (${result.member?.name || 'العضو'})`,
    afterData: result,
  })

  return result
}

/**
 * Check-out an attendance record by attendance ID
 */
export async function checkOutAttendance(
  gymId: string,
  attendanceId: string,
  actorUserId?: string
): Promise<AttendanceDto> {
  const attendance = await prisma.attendance.findFirst({
    where: { id: attendanceId, gymId },
    include: {
      member: true,
      subscription: true,
      gym: true,
    },
  })

  if (!attendance) {
    throw AppError.notFound('سجل الحضور غير موجود / Attendance record not found')
  }

  const gym = (attendance as any).gym
  if (gym && gym.allowManualCheckout === false) {
    throw AppError.forbidden('تسجيل الانصراف اليدوي معطل وفق إعدادات النادي / Manual checkout is disabled in gym settings')
  }

  if (attendance.checkOutAt !== null) {
    throw AppError.conflict('تم تسجيل الانصراف بالفعل')
  }

  const checkOutAt = new Date()
  const durationMinutes = calculateDurationMinutes(attendance.checkInAt, checkOutAt)

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      checkOutAt,
      durationMinutes,
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          phone: true,
          memberCode: true,
          email: true,
        },
      },
      subscription: {
        select: {
          id: true,
          planName: true,
          planPrice: true,
          durationDays: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
    },
  })

  const dto = mapAttendanceToDto(updated)

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.ATTENDANCE_CHECK_OUT,
    entityType: AUDIT_ENTITY_TYPES.ATTENDANCE,
    entityId: dto.id,
    description: `تسجيل انصراف للعضو (${dto.member?.name || 'العضو'}) بعد مدة (${dto.durationMinutes}) دقيقة`,
    afterData: dto,
  })

  return dto
}

/**
 * Check-out a member by member ID (finding their open session)
 */
export async function checkOutMember(
  gymId: string,
  memberId: string,
  actorUserId?: string
): Promise<AttendanceDto> {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
  })

  if (!member) {
    throw AppError.notFound('العضو غير موجود / Member not found')
  }

  const openAttendance = await prisma.attendance.findFirst({
    where: {
      gymId,
      memberId,
      checkOutAt: null,
    },
  })

  if (!openAttendance) {
    throw AppError.notFound('لا يوجد تسجيل حضور مفتوح لهذا العضو')
  }

  return checkOutAttendance(gymId, openAttendance.id, actorUserId)
}

/**
 * Get the current open attendance record for a member
 */
export async function getMemberCurrentAttendance(
  gymId: string,
  memberId: string
): Promise<AttendanceDto | null> {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
  })

  if (!member) {
    throw AppError.notFound('العضو غير موجود / Member not found')
  }

  const openAttendance = await prisma.attendance.findFirst({
    where: {
      gymId,
      memberId,
      checkOutAt: null,
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          phone: true,
          memberCode: true,
          email: true,
        },
      },
      subscription: {
        select: {
          id: true,
          planName: true,
          planPrice: true,
          durationDays: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
    },
  })

  return openAttendance ? mapAttendanceToDto(openAttendance) : null
}

/**
 * List attendance records with filtering, search, and pagination
 */
export async function getAttendanceList(
  gymId: string,
  query: AttendanceFilterQuery
): Promise<AttendanceListResult> {
  const page = query.page && query.page >= 1 ? query.page : 1
  const limit = query.limit && query.limit >= 1 && query.limit <= 100 ? query.limit : 20
  const skip = (page - 1) * limit

  const where: Prisma.AttendanceWhereInput = {
    gymId,
  }

  if (query.status === 'OPEN') {
    where.checkOutAt = null
  } else if (query.status === 'COMPLETED') {
    where.checkOutAt = { not: null }
  }

  if (query.memberId) {
    where.memberId = query.memberId
  }

  if (query.search && query.search.trim()) {
    const searchTerm = query.search.trim()
    where.member = {
      gymId,
      OR: [
        { name: { contains: searchTerm } },
        { phone: { contains: searchTerm } },
        { memberCode: { contains: searchTerm } },
      ],
    }
  }

  if (query.dateFrom || query.dateTo) {
    where.checkInAt = {}
    if (query.dateFrom) {
      where.checkInAt.gte = new Date(query.dateFrom)
    }
    if (query.dateTo) {
      where.checkInAt.lte = new Date(query.dateTo)
    }
  }

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ checkInAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        member: {
          select: {
            id: true,
            name: true,
            phone: true,
            memberCode: true,
            email: true,
          },
        },
        subscription: {
          select: {
            id: true,
            planName: true,
            planPrice: true,
            durationDays: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
    }),
    prisma.attendance.count({ where }),
  ])

  return {
    attendance: records.map(mapAttendanceToDto),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get summary of today's attendance in Cairo timezone
 */
export async function getTodayAttendanceSummary(
  gymId: string
): Promise<TodayAttendanceSummary> {
  const { startOfDay, endOfDay } = getCairoBusinessDayRange()

  const [currentlyInside, totalCheckInsToday, checkedOutToday] = await Promise.all([
    prisma.attendance.count({
      where: {
        gymId,
        checkOutAt: null,
      },
    }),
    prisma.attendance.count({
      where: {
        gymId,
        checkInAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    }),
    prisma.attendance.count({
      where: {
        gymId,
        checkInAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        checkOutAt: {
          not: null,
        },
      },
    }),
  ])

  return {
    currentlyInside,
    checkedOutToday,
    totalCheckInsToday,
    totalCompletedVisitsToday: checkedOutToday,
  }
}

/**
 * Get all members currently inside (checkOutAt is null)
 */
export async function getCurrentlyInside(gymId: string): Promise<AttendanceDto[]> {
  const records = await prisma.attendance.findMany({
    where: {
      gymId,
      checkOutAt: null,
    },
    orderBy: { checkInAt: 'desc' },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          phone: true,
          memberCode: true,
          email: true,
        },
      },
      subscription: {
        select: {
          id: true,
          planName: true,
          planPrice: true,
          durationDays: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
    },
  })

  return records.map(mapAttendanceToDto)
}

/**
 * Get single attendance record by ID
 */
export async function getAttendanceById(
  gymId: string,
  id: string
): Promise<AttendanceDto> {
  const record = await prisma.attendance.findFirst({
    where: { id, gymId },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          phone: true,
          memberCode: true,
          email: true,
        },
      },
      subscription: {
        select: {
          id: true,
          planName: true,
          planPrice: true,
          durationDays: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
    },
  })

  if (!record) {
    throw AppError.notFound('سجل الحضور غير موجود / Attendance record not found')
  }

  return mapAttendanceToDto(record)
}

/**
 * Get all attendance history for a specific member
 */
export async function getMemberAttendanceHistory(
  gymId: string,
  memberId: string
): Promise<AttendanceDto[]> {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
  })

  if (!member) {
    throw AppError.notFound('العضو غير موجود / Member not found')
  }

  const records = await prisma.attendance.findMany({
    where: {
      gymId,
      memberId,
    },
    orderBy: [{ checkInAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      member: {
        select: {
          id: true,
          name: true,
          phone: true,
          memberCode: true,
          email: true,
        },
      },
      subscription: {
        select: {
          id: true,
          planName: true,
          planPrice: true,
          durationDays: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
    },
  })

  return records.map(mapAttendanceToDto)
}
