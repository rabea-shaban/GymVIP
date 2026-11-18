import { Role, Prisma } from '@prisma/client'
import { prisma } from '../config/database.js'
import { AppError } from '../utils/appError.util.js'
import { hashPassword } from '../utils/password.util.js'
import type {
  TrainerDto,
  TrainerListResult,
  TrainerFilterQuery,
} from '../types/trainer.types.js'
import type {
  CreateTrainerInput,
  UpdateTrainerInput,
} from '../validators/trainer.validator.js'
import { createAuditLog } from './audit.service.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../types/audit.types.js'
import { emitGymEvent, REALTIME_EVENTS } from './socket.service.js'

export const formatTrainerDto = (trainer: {
  id: string
  gymId: string
  userId: string
  specialization: string | null
  bio: string | null
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    avatarUrl?: string | null
    isActive: boolean
  }
}): TrainerDto => ({
  id: trainer.id,
  gymId: trainer.gymId,
  userId: trainer.userId,
  specialization: trainer.specialization,
  bio: trainer.bio,
  createdAt: trainer.createdAt,
  updatedAt: trainer.updatedAt,
  user: {
    id: trainer.user.id,
    name: trainer.user.name,
    email: trainer.user.email,
    phone: trainer.user.phone,
    avatarUrl: (trainer.user as any).avatarUrl || null,
    isActive: trainer.user.isActive,
  },
})

/**
 * Create a new Trainer (User with Role.TRAINER + Trainer profile) transactionally
 */
export const createTrainer = async (
  gymId: string,
  input: CreateTrainerInput,
  actorUserId?: string
): Promise<TrainerDto> => {
  // 1. Check duplicate email within gym
  const existingUser = await prisma.user.findFirst({
    where: {
      gymId,
      email: input.email.toLowerCase(),
    },
  })

  if (existingUser) {
    throw AppError.conflict(
      'البريد الإلكتروني مستخدم بالفعل داخل هذا النادي / Email already exists in this gym'
    )
  }

  // 2. Hash password
  const passwordHash = await hashPassword(input.password)

  // 3. Create User + Trainer in single transaction
  const createdTrainer = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        gymId,
        name: input.name.trim(),
        email: input.email.toLowerCase().trim(),
        phone: input.phone?.trim() || null,
        passwordHash,
        role: Role.TRAINER,
        isActive: true,
      },
    })

    const trainer = await tx.trainer.create({
      data: {
        gymId,
        userId: user.id,
        specialization: input.specialization?.trim() || null,
        bio: input.bio?.trim() || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
    })

    return trainer
  })

  const dto = formatTrainerDto(createdTrainer)

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.TRAINER_CREATED,
    entityType: AUDIT_ENTITY_TYPES.TRAINER,
    entityId: dto.id,
    description: `تم إضافة مدرب جديد (${dto.user.name})`,
    afterData: dto,
  })

  emitGymEvent(gymId, REALTIME_EVENTS.TRAINER_UPDATED, {
    trainerId: dto.id,
    action: 'created',
  })

  return dto
}

/**
 * Get paginated list of trainers with search and status filters
 */
export const getTrainersList = async (
  gymId: string,
  query: TrainerFilterQuery
): Promise<TrainerListResult> => {
  const page = query.page || 1
  const limit = query.limit || 20
  const skip = (page - 1) * limit

  const where: Prisma.TrainerWhereInput = {
    gymId,
  }

  if (query.status && query.status !== 'all') {
    where.user = {
      isActive: query.status === 'active',
    }
  }

  if (query.search) {
    const search = query.search.trim()
    where.OR = [
      { user: { name: { contains: search } } },
      { user: { email: { contains: search } } },
      { user: { phone: { contains: search } } },
      { specialization: { contains: search } },
    ]
  }

  const [total, items] = await Promise.all([
    prisma.trainer.count({ where }),
    prisma.trainer.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ])

  return {
    trainers: items.map(formatTrainerDto),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

/**
 * Get single trainer by ID with RBAC check
 */
export const getTrainerById = async (
  gymId: string,
  id: string,
  currentUser?: { id: string; role: Role }
): Promise<TrainerDto> => {
  const trainer = await prisma.trainer.findFirst({
    where: { id, gymId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
        },
      },
    },
  })

  if (!trainer) {
    throw AppError.notFound('المدرب غير موجود / Trainer not found')
  }

  if (currentUser && currentUser.role === Role.TRAINER) {
    if (trainer.userId !== currentUser.id) {
      throw AppError.forbidden(
        'ليس لديك صلاحية لعرض ملف مدرب آخر / Cannot view other trainer profile'
      )
    }
  }

  return formatTrainerDto(trainer)
}

/**
 * Get trainer profile by User ID (used for /trainers/me)
 */
export const getTrainerByUserId = async (
  gymId: string,
  userId: string
): Promise<TrainerDto> => {
  const trainer = await prisma.trainer.findFirst({
    where: { userId, gymId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
        },
      },
    },
  })

  if (!trainer) {
    throw AppError.notFound(
      'لم يتم العثور على ملف المدرب الخاص بهذا الحساب / Trainer profile not found'
    )
  }

  return formatTrainerDto(trainer)
}

/**
 * Update trainer information
 */
export const updateTrainer = async (
  gymId: string,
  id: string,
  input: UpdateTrainerInput,
  currentUser?: { id: string; role: Role }
): Promise<TrainerDto> => {
  const existing = await prisma.trainer.findFirst({
    where: { id, gymId },
    include: { user: true },
  })

  if (!existing) {
    throw AppError.notFound('المدرب غير موجود / Trainer not found')
  }

  if (currentUser && currentUser.role === Role.TRAINER) {
    if (existing.userId !== currentUser.id) {
      throw AppError.forbidden(
        'ليس لديك صلاحية لتعديل بيانات مدرب آخر / Cannot edit other trainer'
      )
    }
  }

  const updatedTrainer = await prisma.$transaction(async (tx) => {
    // 1. Update user fields if provided
    const userUpdateData: Prisma.UserUpdateInput = {}
    if (input.name !== undefined) userUpdateData.name = input.name.trim()
    if (input.phone !== undefined) userUpdateData.phone = input.phone?.trim() || null

    if (Object.keys(userUpdateData).length > 0) {
      await tx.user.update({
        where: { id: existing.userId },
        data: userUpdateData,
      })
    }

    // 2. Update trainer fields if provided
    const trainerUpdateData: Prisma.TrainerUpdateInput = {}
    if (input.specialization !== undefined) {
      trainerUpdateData.specialization = input.specialization?.trim() || null
    }
    if (input.bio !== undefined) {
      trainerUpdateData.bio = input.bio?.trim() || null
    }

    const trainer = await tx.trainer.update({
      where: { id: existing.id },
      data: trainerUpdateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
    })

    return trainer
  })

  const dto = formatTrainerDto(updatedTrainer)

  await createAuditLog({
    gymId,
    actorUserId: currentUser?.id,
    action: AUDIT_ACTIONS.TRAINER_UPDATED,
    entityType: AUDIT_ENTITY_TYPES.TRAINER,
    entityId: dto.id,
    description: `تم تعديل بيانات المدرب (${dto.user.name})`,
    beforeData: formatTrainerDto(existing as any),
    afterData: dto,
  })

  emitGymEvent(gymId, REALTIME_EVENTS.TRAINER_UPDATED, {
    trainerId: dto.id,
    action: 'updated',
  })

  return dto
}

/**
 * Update trainer activation status (User.isActive)
 */
export const updateTrainerStatus = async (
  gymId: string,
  id: string,
  isActive: boolean,
  actorUserId?: string
): Promise<TrainerDto> => {
  const existing = await prisma.trainer.findFirst({
    where: { id, gymId },
    include: { user: true },
  })

  if (!existing) {
    throw AppError.notFound('المدرب غير موجود / Trainer not found')
  }

  await prisma.user.update({
    where: { id: existing.userId },
    data: { isActive },
  })

  const updated = await prisma.trainer.findUnique({
    where: { id: existing.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
        },
      },
    },
  })

  const dto = formatTrainerDto(updated!)

  await createAuditLog({
    gymId,
    actorUserId,
    action: isActive ? AUDIT_ACTIONS.TRAINER_ACTIVATED : AUDIT_ACTIONS.TRAINER_DEACTIVATED,
    entityType: AUDIT_ENTITY_TYPES.TRAINER,
    entityId: dto.id,
    description: isActive
      ? `تم تفعيل حساب المدرب (${dto.user.name})`
      : `تم تعطيل حساب المدرب (${dto.user.name})`,
    beforeData: { isActive: existing.user.isActive },
    afterData: { isActive: dto.user.isActive },
  })

  emitGymEvent(gymId, REALTIME_EVENTS.TRAINER_UPDATED, {
    trainerId: dto.id,
    action: isActive ? 'activated' : 'deactivated',
  })

  return dto
}

/**
 * Delete a trainer profile
 */
export const deleteTrainer = async (
  gymId: string,
  id: string,
  actorUserId?: string
): Promise<void> => {
  const existing = await prisma.trainer.findFirst({
    where: { id, gymId },
    include: { user: true },
  })

  if (!existing) {
    throw AppError.notFound('المدرب غير موجود / Trainer not found')
  }

  // Check if trainer's user account has linked financial / audit records
  const [paymentsCount, auditCount] = await Promise.all([
    prisma.payment.count({ where: { createdByUserId: existing.userId } }),
    prisma.auditLog.count({ where: { actorUserId: existing.userId } }),
  ])

  if (paymentsCount > 0 || auditCount > 0) {
    // Keep user intact or deactivated, delete trainer profile
    await prisma.$transaction([
      prisma.trainer.delete({ where: { id: existing.id } }),
      prisma.user.update({
        where: { id: existing.userId },
        data: { isActive: false },
      }),
    ])
  } else {
    // Delete both trainer and user record
    await prisma.$transaction([
      prisma.trainer.delete({ where: { id: existing.id } }),
      prisma.user.delete({ where: { id: existing.userId } }),
    ])
  }

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.TRAINER_DELETED,
    entityType: AUDIT_ENTITY_TYPES.TRAINER,
    entityId: existing.id,
    description: `تم حذف ملف المدرب (${existing.user.name})`,
    beforeData: { trainerId: existing.id, userName: existing.user.name },
  })

  emitGymEvent(gymId, REALTIME_EVENTS.TRAINER_UPDATED, {
    trainerId: existing.id,
    action: 'deleted',
  })
}
