import { prisma } from '../config/database.js'
import { AppError } from '../utils/appError.util.js'
import type { Member, Prisma, Gender } from '@prisma/client'
import type {
  MemberDto,
  MemberListResult,
} from '../types/member.types.js'
import type {
  CreateMemberInput,
  UpdateMemberInput,
  UpdateMemberStatusInput,
  MemberQueryParams,
} from '../validators/member.validator.js'
import { createAuditLog } from './audit.service.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../types/audit.types.js'
import { assertMemberCreationAllowed } from './license.service.js'
import { emitGymEvent, REALTIME_EVENTS } from './socket.service.js'
import { saveBase64Image, deleteStoredImage } from '../utils/fileStorage.util.js'

/**
 * Formats a raw Prisma Member record into a clean, safe DTO
 */
export function formatMemberDto(member: Member): MemberDto {
  return {
    id: member.id,
    gymId: member.gymId,
    memberCode: member.memberCode,
    name: member.name,
    phone: member.phone,
    email: member.email ?? null,
    gender: (member.gender as Gender) ?? null,
    dateOfBirth: member.dateOfBirth ? member.dateOfBirth.toISOString().split('T')[0] ?? null : null,
    address: member.address ?? null,
    emergencyContactName: member.emergencyContactName ?? null,
    emergencyContactPhone: member.emergencyContactPhone ?? null,
    notes: member.notes ?? null,
    avatarUrl: member.avatarUrl ?? null,
    isActive: member.isActive,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  }
}

/**
 * Generates the next sequential unique member code for the gym
 * Example: GYM-000001, GYM-000002, etc.
 */
export async function generateMemberCode(gymId: string): Promise<string> {
  const lastMember = await prisma.member.findFirst({
    where: { gymId },
    orderBy: { createdAt: 'desc' },
    select: { memberCode: true },
  })

  let nextSequence = 1

  if (lastMember?.memberCode) {
    const match = lastMember.memberCode.match(/(\d+)$/)
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10)
      if (!isNaN(parsed) && parsed >= 1) {
        nextSequence = parsed + 1
      }
    }
  }

  return `GYM-${String(nextSequence).padStart(6, '0')}`
}

/**
 * Creates a new member in the authenticated gym
 */
export async function createMember(
  gymId: string,
  input: CreateMemberInput,
  actorUserId?: string
): Promise<MemberDto> {
  // 0. Enforce License Limits on Member Count
  await assertMemberCreationAllowed(gymId)

  // 1. Check for duplicate phone in same gym
  const existingPhone = await prisma.member.findUnique({
    where: {
      gymId_phone: {
        gymId,
        phone: input.phone,
      },
    },
  })

  if (existingPhone) {
    throw AppError.conflict(
      'رقم الهاتف مستخدم بالفعل داخل هذا الجيم / Phone number already registered in this gym'
    )
  }

  // 2. Safe Member Code Generation with retry for concurrency
  let attempts = 0
  const maxAttempts = 3

  while (attempts < maxAttempts) {
    attempts++
    const memberCode = await generateMemberCode(gymId)

    // Save avatar to disk if provided as base64
    const savedAvatarUrl = input.avatarUrl
      ? await saveBase64Image(input.avatarUrl, 'members', `member-${memberCode}`)
      : null

    try {
      const member = await prisma.member.create({
        data: {
          gymId,
          memberCode,
          name: input.name,
          phone: input.phone,
          email: input.email ? input.email.toLowerCase() : null,
          gender: input.gender ?? null,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          address: input.address ?? null,
          emergencyContactName: input.emergencyContactName ?? null,
          emergencyContactPhone: input.emergencyContactPhone ?? null,
          notes: input.notes ?? null,
          avatarUrl: savedAvatarUrl,
          isActive: true,
        },
      })

      const dto = formatMemberDto(member)

      await createAuditLog({
        gymId,
        actorUserId,
        action: AUDIT_ACTIONS.MEMBER_CREATED,
        entityType: AUDIT_ENTITY_TYPES.MEMBER,
        entityId: member.id,
        description: `تم تسجيل عضو جديد (${member.name}) بكود (${member.memberCode})`,
        afterData: dto,
      })

      // Emit real-time event across the gym
      emitGymEvent(gymId, REALTIME_EVENTS.MEMBER_CREATED, {
        member: dto,
        memberId: member.id,
      })

      return dto
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const target = Array.isArray(error?.meta?.target)
          ? error.meta.target.join(',')
          : String(error?.meta?.target || '')

        if (target.includes('phone')) {
          throw AppError.conflict(
            'رقم الهاتف مستخدم بالفعل داخل هذا الجيم / Phone number already registered in this gym'
          )
        }
        // If collision was on memberCode, loop and retry with next number
        continue
      }
      throw error
    }
  }

  throw AppError.internal('تعذر توليد كود فريد للعضو، يرجى إعادة المحاولة / Failed to generate unique member code')
}

/**
 * Retrieves a paginated list of members for the gym with filtering & search
 */
export async function getMembers(
  gymId: string,
  query: MemberQueryParams
): Promise<MemberListResult> {
  const page = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(1, query.limit || 20))
  const skip = (page - 1) * limit

  const where: Prisma.MemberWhereInput = {
    gymId,
  }

  // Filter by status: active (default), inactive, or all
  if (query.status === 'active') {
    where.isActive = true
  } else if (query.status === 'inactive') {
    where.isActive = false
  }

  // Filter by gender
  if (query.gender) {
    where.gender = query.gender
  }

  // Search across name, phone, memberCode, email
  if (query.search && query.search.trim().length > 0) {
    const term = query.search.trim()
    where.OR = [
      { name: { contains: term } },
      { phone: { contains: term } },
      { memberCode: { contains: term } },
      { email: { contains: term } },
    ]
  }

  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [members, total, activeMembersCount, expiredSubsCount, expiringSoonCount, newThisMonthCount] = await Promise.all([
    prisma.member.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        attendances: {
          orderBy: { checkInAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.member.count({ where }),
    prisma.member.count({ where: { gymId, isActive: true } }),
    typeof prisma.subscription?.count === 'function'
      ? prisma.subscription.count({ where: { gymId, status: 'EXPIRED' } })
      : Promise.resolve(0),
    typeof prisma.subscription?.count === 'function'
      ? prisma.subscription.count({
          where: {
            gymId,
            status: 'ACTIVE',
            endDate: { gte: now, lte: in7Days },
          },
        })
      : Promise.resolve(0),
    prisma.member.count({
      where: {
        gymId,
        createdAt: { gte: startOfMonth },
      },
    }),
  ])

  const totalPages = Math.ceil(total / limit) || 0

  return {
    members: members.map((m) => {
      const dto = formatMemberDto(m)
      const sub = m.subscriptions?.[0]
      const att = m.attendances?.[0]
      return {
        ...dto,
        currentSubscription: sub
          ? {
              id: sub.id,
              planName: sub.planName,
              status: sub.status,
              startDate: sub.startDate.toISOString(),
              endDate: sub.endDate.toISOString(),
            }
          : null,
        lastAttendance: att
          ? {
              checkInAt: att.checkInAt.toISOString(),
              checkOutAt: att.checkOutAt ? att.checkOutAt.toISOString() : null,
            }
          : null,
      }
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    stats: {
      total,
      active: activeMembersCount,
      expired: expiredSubsCount,
      expiringSoon: expiringSoonCount,
      newThisMonth: newThisMonthCount,
    },
  }
}

/**
 * Retrieves a single member by ID ensuring gym isolation
 */
export async function getMemberById(
  gymId: string,
  memberId: string
): Promise<MemberDto> {
  const member = await prisma.member.findFirst({
    where: {
      id: memberId,
      gymId,
    },
  })

  if (!member) {
    throw AppError.notFound('العضو غير موجود / Member not found')
  }

  return formatMemberDto(member)
}

/**
 * Updates basic member information (MemberCode and GymId are immutable)
 */
export async function updateMember(
  gymId: string,
  memberId: string,
  input: UpdateMemberInput,
  actorUserId?: string
): Promise<MemberDto> {
  const existingMember = await prisma.member.findFirst({
    where: {
      id: memberId,
      gymId,
    },
  })

  if (!existingMember) {
    throw AppError.notFound('العضو غير موجود / Member not found')
  }

  // If phone is being changed, ensure it's not taken by another member in the gym
  if (input.phone && input.phone !== existingMember.phone) {
    const duplicatePhone = await prisma.member.findUnique({
      where: {
        gymId_phone: {
          gymId,
          phone: input.phone,
        },
      },
    })

    if (duplicatePhone) {
      throw AppError.conflict(
        'رقم الهاتف مستخدم بالفعل داخل هذا الجيم / Phone number already registered in this gym'
      )
    }
  }

  const updateData: Prisma.MemberUpdateInput = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.phone !== undefined) updateData.phone = input.phone
  if (input.email !== undefined) updateData.email = input.email ? input.email.toLowerCase() : null
  if (input.gender !== undefined) updateData.gender = input.gender ?? null
  if (input.dateOfBirth !== undefined) {
    updateData.dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : null
  }
  if (input.address !== undefined) updateData.address = input.address ?? null
  if (input.emergencyContactName !== undefined) {
    updateData.emergencyContactName = input.emergencyContactName ?? null
  }
  if (input.emergencyContactPhone !== undefined) {
    updateData.emergencyContactPhone = input.emergencyContactPhone ?? null
  }
  if (input.notes !== undefined) updateData.notes = input.notes ?? null

  if (input.avatarUrl !== undefined) {
    if (input.avatarUrl) {
      const saved = await saveBase64Image(input.avatarUrl, 'members', `member-${existingMember.memberCode}`)
      updateData.avatarUrl = saved
      if (
        existingMember.avatarUrl &&
        existingMember.avatarUrl !== saved &&
        existingMember.avatarUrl.startsWith('/uploads/')
      ) {
        await deleteStoredImage(existingMember.avatarUrl)
      }
    } else {
      updateData.avatarUrl = null
      if (existingMember.avatarUrl?.startsWith('/uploads/')) {
        await deleteStoredImage(existingMember.avatarUrl)
      }
    }
  }

  const updatedMember = await prisma.member.update({
    where: { id: memberId },
    data: updateData,
  })

  const dto = formatMemberDto(updatedMember)

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.MEMBER_UPDATED,
    entityType: AUDIT_ENTITY_TYPES.MEMBER,
    entityId: updatedMember.id,
    description: `تم تعديل بيانات العضو (${updatedMember.name})`,
    beforeData: formatMemberDto(existingMember),
    afterData: dto,
  })

  // Emit real-time event across the gym
  emitGymEvent(gymId, REALTIME_EVENTS.MEMBER_UPDATED, {
    member: dto,
    memberId: updatedMember.id,
  })

  return dto
}

/**
 * Activates or deactivates a member
 */
export async function updateMemberStatus(
  gymId: string,
  memberId: string,
  input: UpdateMemberStatusInput,
  actorUserId?: string
): Promise<MemberDto> {
  const existingMember = await prisma.member.findFirst({
    where: {
      id: memberId,
      gymId,
    },
  })

  if (!existingMember) {
    throw AppError.notFound('العضو غير موجود / Member not found')
  }

  const updatedMember = await prisma.member.update({
    where: { id: memberId },
    data: {
      isActive: input.isActive,
    },
  })

  const dto = formatMemberDto(updatedMember)

  await createAuditLog({
    gymId,
    actorUserId,
    action: input.isActive ? AUDIT_ACTIONS.MEMBER_ACTIVATED : AUDIT_ACTIONS.MEMBER_DEACTIVATED,
    entityType: AUDIT_ENTITY_TYPES.MEMBER,
    entityId: updatedMember.id,
    description: input.isActive
      ? `تم تفعيل حساب العضو (${updatedMember.name})`
      : `تم تعطيل حساب العضو (${updatedMember.name})`,
    beforeData: { isActive: existingMember.isActive },
    afterData: { isActive: updatedMember.isActive },
  })

  // Emit real-time event across the gym
  emitGymEvent(gymId, REALTIME_EVENTS.MEMBER_UPDATED, {
    member: dto,
    memberId: updatedMember.id,
  })

  return dto
}
