import { Role, Prisma } from '@prisma/client'
import { prisma } from '../config/database.js'
import { AppError } from '../utils/appError.util.js'
import { hashPassword } from '../utils/password.util.js'
import type { AuthUser } from '../types/auth.types.js'
import type {
  UserDto,
  UserListResult,
  UserQueryParams,
} from '../types/user.types.js'
import type {
  CreateUserInput,
  UpdateUserInput,
} from '../validators/user.validator.js'
import { createAuditLog } from './audit.service.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../types/audit.types.js'
import { emitGymEvent, REALTIME_EVENTS } from './socket.service.js'
import { saveBase64Image, deleteStoredImage } from '../utils/fileStorage.util.js'

export const formatUserDto = (user: {
  id: string
  gymId: string
  name: string
  email: string
  phone: string | null
  avatarUrl?: string | null
  role: Role
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}): UserDto => ({
  id: user.id,
  gymId: user.gymId,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatarUrl: user.avatarUrl ?? null,
  role: user.role,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

/**
 * Creates a new staff user inside the authenticated gym
 */
export const createUser = async (
  actor: AuthUser,
  input: CreateUserInput
): Promise<UserDto> => {
  // 1. Role Authorization Check
  if (actor.role === Role.MANAGER) {
    if (input.role === Role.OWNER || input.role === Role.MANAGER) {
      throw AppError.forbidden(
        'ليس لديك صلاحية لإنشاء مستخدم برتبة مالك أو مدير / Managers cannot create Owner or Manager roles'
      )
    }
  } else if (actor.role === Role.OWNER) {
    if (input.role === Role.OWNER) {
      throw AppError.forbidden(
        'لا يمكن إنشاء أكثر من حساب مالك أساسي / Additional Owner accounts are not allowed in V1'
      )
    }
  } else {
    throw AppError.forbidden('ليس لديك صلاحية لتنفيذ هذا الإجراء')
  }

  // 2. Check for duplicate email inside the SAME gym
  const existingUserInGym = await prisma.user.findFirst({
    where: {
      gymId: actor.gymId,
      email: input.email,
    },
  })

  if (existingUserInGym) {
    throw AppError.conflict(
      'البريد الإلكتروني مستخدم بالفعل داخل هذا الجيم / Email is already used in this gym'
    )
  }

  // 3. Hash password
  const passwordHash = await hashPassword(input.password)

  // Save avatar image to disk if provided
  const savedAvatarUrl = input.avatarUrl
    ? await saveBase64Image(input.avatarUrl, 'users', `user-${input.email.split('@')[0]}`)
    : null

  // 4. Create user
  const newUser = await prisma.user.create({
    data: {
      gymId: actor.gymId,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      avatarUrl: savedAvatarUrl,
      role: input.role,
      passwordHash,
      isActive: true,
    },
  })

  await createAuditLog({
    gymId: actor.gymId,
    actorUserId: actor.id,
    action: AUDIT_ACTIONS.USER_CREATED,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: newUser.id,
    description: `تم إنشاء حساب مستخدم جديد (${newUser.name}) برتبة (${newUser.role})`,
    afterData: formatUserDto(newUser),
  })

  emitGymEvent(actor.gymId, REALTIME_EVENTS.SYSTEM_SYNC, { entity: 'users', action: 'created', userId: newUser.id })

  return formatUserDto(newUser)
}

/**
 * Lists staff users for the authenticated gym with filtering, search, and pagination
 */
export const listUsers = async (
  actor: AuthUser,
  query: UserQueryParams
): Promise<UserListResult> => {
  const page = query.page ?? 1
  const limit = query.limit ?? 20
  const skip = (page - 1) * limit

  const where: Prisma.UserWhereInput = {
    gymId: actor.gymId,
    ...(query.role && { role: query.role }),
    ...(query.status && { isActive: query.status === 'active' }),
    ...(query.search && {
      OR: [
        { name: { contains: query.search } },
        { email: { contains: query.search } },
        { phone: { contains: query.search } },
      ],
    }),
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        gymId: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ])

  const totalPages = Math.ceil(total / limit) || 1

  return {
    users: users.map(formatUserDto),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  }
}

/**
 * Retrieves details for a specific user scoped to the authenticated gym
 */
export const getUserById = async (
  actor: AuthUser,
  userId: string
): Promise<UserDto> => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      gymId: actor.gymId,
    },
  })

  if (!user) {
    throw AppError.notFound('المستخدم غير موجود / User not found')
  }

  return formatUserDto(user)
}

/**
 * Updates basic user information and role within authorization limits
 */
export const updateUser = async (
  actor: AuthUser,
  userId: string,
  input: UpdateUserInput
): Promise<UserDto> => {
  // 1. Fetch target user scoped to gym
  const targetUser = await prisma.user.findFirst({
    where: {
      id: userId,
      gymId: actor.gymId,
    },
  })

  if (!targetUser) {
    throw AppError.notFound('المستخدم غير موجود / User not found')
  }

  // 2. Role Change Restrictions
  if (input.role === Role.OWNER) {
    throw AppError.forbidden(
      'لا يمكن تغيير رتبة أي مستخدم إلى مالك النادي / Cannot promote user to OWNER'
    )
  }

  if (actor.role === Role.MANAGER) {
    // Manager cannot edit OWNER or MANAGER
    if (targetUser.role === Role.OWNER || targetUser.role === Role.MANAGER) {
      throw AppError.forbidden(
        'ليس لديك صلاحية لتعديل بيانات المالك أو المديرين الآخرين'
      )
    }

    // Manager can only assign RECEPTIONIST or TRAINER
    if (input.role && input.role !== Role.RECEPTIONIST && input.role !== Role.TRAINER) {
      throw AppError.forbidden(
        'يمكن للمدير فقط التعيين بين موظف استقبال ومدرب / Managers can only assign RECEPTIONIST or TRAINER'
      )
    }
  }

  // Handle avatar update
  let finalAvatarUrl = targetUser.avatarUrl
  if (input.avatarUrl !== undefined) {
    if (input.avatarUrl) {
      finalAvatarUrl = await saveBase64Image(input.avatarUrl, 'users', `user-${targetUser.id}`)
      if (
        targetUser.avatarUrl &&
        targetUser.avatarUrl !== finalAvatarUrl &&
        targetUser.avatarUrl.startsWith('/uploads/')
      ) {
        await deleteStoredImage(targetUser.avatarUrl)
      }
    } else {
      finalAvatarUrl = null
      if (targetUser.avatarUrl?.startsWith('/uploads/')) {
        await deleteStoredImage(targetUser.avatarUrl)
      }
    }
  }

  // 3. Update in Database
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone || null }),
      ...(input.avatarUrl !== undefined && { avatarUrl: finalAvatarUrl }),
      ...(input.role !== undefined && { role: input.role }),
    },
  })

  await createAuditLog({
    gymId: actor.gymId,
    actorUserId: actor.id,
    action: AUDIT_ACTIONS.USER_UPDATED,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: updatedUser.id,
    description: `تم تعديل بيانات المستخدم (${updatedUser.name})`,
    beforeData: formatUserDto(targetUser),
    afterData: formatUserDto(updatedUser),
  })

  emitGymEvent(actor.gymId, REALTIME_EVENTS.SYSTEM_SYNC, { entity: 'users', action: 'updated', userId: updatedUser.id })

  return formatUserDto(updatedUser)
}

/**
 * Activates or deactivates a user's account
 */
export const updateUserStatus = async (
  actor: AuthUser,
  userId: string,
  isActive: boolean
): Promise<UserDto> => {
  // 1. Check self-deactivation
  if (actor.id === userId && !isActive) {
    throw AppError.badRequest('لا يمكنك تعطيل حسابك الشخصي / Cannot deactivate your own account')
  }

  // 2. Fetch target user
  const targetUser = await prisma.user.findFirst({
    where: {
      id: userId,
      gymId: actor.gymId,
    },
  })

  if (!targetUser) {
    throw AppError.notFound('المستخدم غير موجود / User not found')
  }

  // 3. Prevent OWNER deactivation
  if (targetUser.role === Role.OWNER && !isActive) {
    throw AppError.forbidden('لا يمكن تعطيل حساب مالك النادي / Cannot deactivate OWNER')
  }

  // 4. Check Manager permissions
  if (actor.role === Role.MANAGER) {
    if (targetUser.role === Role.OWNER || targetUser.role === Role.MANAGER) {
      throw AppError.forbidden(
        'ليس لديك صلاحية لتعطيل حساب المالك أو المديرين / Managers cannot deactivate Owner or Manager accounts'
      )
    }
  }

  // 5. Update Status
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  })

  await createAuditLog({
    gymId: actor.gymId,
    actorUserId: actor.id,
    action: isActive ? AUDIT_ACTIONS.USER_ACTIVATED : AUDIT_ACTIONS.USER_DEACTIVATED,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: updatedUser.id,
    description: isActive
      ? `تم تفعيل حساب المستخدم (${updatedUser.name})`
      : `تم تعطيل حساب المستخدم (${updatedUser.name})`,
    beforeData: { isActive: targetUser.isActive },
    afterData: { isActive: updatedUser.isActive },
  })

  emitGymEvent(actor.gymId, REALTIME_EVENTS.SYSTEM_SYNC, { entity: 'users', action: 'status_changed', userId: updatedUser.id })

  return formatUserDto(updatedUser)
}

/**
 * Resets a staff member's password by an authorized admin (OWNER / MANAGER)
 */
export const resetUserPassword = async (
  actor: AuthUser,
  userId: string,
  newPassword: string
): Promise<void> => {
  // 1. Fetch target user
  const targetUser = await prisma.user.findFirst({
    where: {
      id: userId,
      gymId: actor.gymId,
    },
  })

  if (!targetUser) {
    throw AppError.notFound('المستخدم غير موجود / User not found')
  }

  // 2. Check Manager permissions
  if (actor.role === Role.MANAGER) {
    if (targetUser.role === Role.OWNER || targetUser.role === Role.MANAGER) {
      throw AppError.forbidden(
        'ليس لديك صلاحية لإعادة تعيين كلمة مرور المالك أو المديرين / Managers cannot reset Owner or Manager passwords'
      )
    }
  }

  // 3. Hash new password
  const passwordHash = await hashPassword(newPassword)

  // 4. Update Password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  })

  await createAuditLog({
    gymId: actor.gymId,
    actorUserId: actor.id,
    action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: targetUser.id,
    description: `تمت إعادة تعيين كلمة المرور للمستخدم (${targetUser.name})`,
  })
}

/**
 * Deletes a staff user if there are no referential blocks, or returns conflict instructing deactivation
 */
export const deleteUser = async (actor: AuthUser, userId: string): Promise<void> => {
  if (actor.id === userId) {
    throw AppError.badRequest('لا يمكنك حذف حسابك الشخصي / Cannot delete your own account')
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: userId,
      gymId: actor.gymId,
    },
    include: {
      trainer: true,
    },
  })

  if (!targetUser) {
    throw AppError.notFound('المستخدم غير موجود / User not found')
  }

  if (targetUser.role === Role.OWNER) {
    throw AppError.forbidden('لا يمكن حذف حساب مالك الجيم / Cannot delete Gym Owner account')
  }

  if (actor.role === Role.MANAGER && targetUser.role === Role.MANAGER) {
    throw AppError.forbidden('لا يمكن للمدير حذف حساب مدير آخر / Managers cannot delete other Managers')
  }

  // Check linked operational records
  const [paymentsCount, auditCount, freezesCount, cancellationsCount] = await Promise.all([
    prisma.payment.count({ where: { createdByUserId: targetUser.id } }),
    prisma.auditLog.count({ where: { actorUserId: targetUser.id } }),
    prisma.subscriptionFreeze.count({ where: { createdByUserId: targetUser.id } }),
    prisma.subscription.count({ where: { cancelledByUserId: targetUser.id } }),
  ])

  if (paymentsCount > 0 || freezesCount > 0 || cancellationsCount > 0 || auditCount > 0) {
    throw AppError.conflict(
      'لا يمكن حذف المستخدم لوجود عمليات مالية أو إدارية مسجلة باسمه في النظام. يرجى تعطيل الحساب بدلاً من الحذف.'
    )
  }

  await prisma.$transaction(async (tx) => {
    if (targetUser.trainer) {
      await tx.trainer.delete({ where: { id: targetUser.trainer.id } })
    }
    await tx.user.delete({ where: { id: targetUser.id } })
  })

  // Delete stored avatar file if exists
  if (targetUser.avatarUrl?.startsWith('/uploads/')) {
    await deleteStoredImage(targetUser.avatarUrl)
  }

  await createAuditLog({
    gymId: actor.gymId,
    actorUserId: actor.id,
    action: AUDIT_ACTIONS.USER_DELETED,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: targetUser.id,
    description: `تم حذف حساب المستخدم (${targetUser.name})`,
    beforeData: { id: targetUser.id, name: targetUser.name, role: targetUser.role },
  })

  emitGymEvent(actor.gymId, REALTIME_EVENTS.SYSTEM_SYNC, { entity: 'users', action: 'deleted', userId })
}
