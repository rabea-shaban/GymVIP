import { Role } from '@prisma/client'
import { prisma } from '../config/database.js'
import { AppError } from '../utils/appError.util.js'
import { hashPassword, comparePassword } from '../utils/password.util.js'
import { generateAuthToken } from '../utils/jwt.util.js'
import { generateGymSlug } from '../utils/slug.util.js'
import type { RegisterInput, LoginInput } from '../validators/auth.validator.js'
import type {
  SafeUser,
  SafeGym,
  AuthSuccessData,
} from '../types/auth.types.js'
import { createAuditLog } from './audit.service.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../types/audit.types.js'

export const formatSafeUser = (user: {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
}): SafeUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
})

export const formatSafeGym = (gym: {
  id: string
  name: string
  slug: string
  city: string | null
  currency: string
}): SafeGym => ({
  id: gym.id,
  name: gym.name,
  slug: gym.slug,
  city: gym.city,
  currency: gym.currency,
})

/**
 * Registers a new Gym and creates its initial OWNER user atomically inside a transaction
 */
export const registerGymAndOwner = async (
  input: RegisterInput
): Promise<AuthSuccessData & { token: string }> => {
  // 1. Check if email is already taken
  const existingUser = await prisma.user.findFirst({
    where: { email: input.email },
  })

  if (existingUser) {
    throw AppError.conflict('البريد الإلكتروني مسجل بالفعل لنادٍ آخر / Email is already registered')
  }

  // 2. Generate a unique slug for the gym
  let slug = generateGymSlug(input.gymName)
  let isSlugTaken = await prisma.gym.findUnique({ where: { slug } })
  while (isSlugTaken) {
    slug = generateGymSlug(input.gymName)
    isSlugTaken = await prisma.gym.findUnique({ where: { slug } })
  }

  // 3. Hash the owner's password
  const passwordHash = await hashPassword(input.password)

  // 4. Execute atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the Gym
    const gym = await tx.gym.create({
      data: {
        name: input.gymName,
        slug,
        email: input.email,
        phone: input.phone,
        city: input.city ?? null,
        currency: 'EGP',
        timezone: 'Africa/Cairo',
        isActive: true,
      },
    })

    // Create the initial OWNER user
    const user = await tx.user.create({
      data: {
        gymId: gym.id,
        name: input.ownerName,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: Role.OWNER,
        isActive: true,
        lastLoginAt: new Date(),
      },
    })

    return { gym, user }
  })

  // 5. Generate authentication token
  const token = generateAuthToken({
    sub: result.user.id,
    gymId: result.gym.id,
    role: result.user.role,
  })

  return {
    user: formatSafeUser(result.user),
    gym: formatSafeGym(result.gym),
    token,
  }
}

/**
 * Authenticates a user by email and password, returning safe profile and JWT token
 */
export const loginUser = async (
  input: LoginInput
): Promise<AuthSuccessData & { token: string }> => {
  // 1. Find user by email including gym data
  const user = await prisma.user.findFirst({
    where: { email: input.email },
    include: { gym: true },
  })

  // 2. Check if user exists
  if (!user) {
    throw AppError.unauthorized('البريد الإلكتروني أو كلمة المرور غير صحيحة')
  }

  // 3. Verify password
  const isPasswordValid = await comparePassword(input.password, user.passwordHash)
  if (!isPasswordValid) {
    await createAuditLog({
      gymId: user.gymId,
      actorUserId: user.id,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityType: AUDIT_ENTITY_TYPES.AUTH,
      entityId: user.id,
      description: `محاولة تسجيل دخول فاشلة للمستخدم (${user.name})`,
      metadata: { email: input.email },
    })
    throw AppError.unauthorized('البريد الإلكتروني أو كلمة المرور غير صحيحة')
  }

  // 4. Verify user status
  if (!user.isActive) {
    throw AppError.forbidden('هذا الحساب معطل مؤقتاً، يرجى مراجعة إدارة النادي')
  }

  // 5. Verify gym status
  if (!user.gym.isActive) {
    throw AppError.forbidden('اشتراك النادي الرياضي معطل أو غير نشط')
  }

  // 6. Update last login timestamp asynchronously
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  // 7. Generate JWT token
  const token = generateAuthToken({
    sub: user.id,
    gymId: user.gymId,
    role: user.role,
  })

  await createAuditLog({
    gymId: user.gymId,
    actorUserId: user.id,
    action: AUDIT_ACTIONS.LOGIN_SUCCESS,
    entityType: AUDIT_ENTITY_TYPES.AUTH,
    entityId: user.id,
    description: `تسجيل دخول ناجح للمستخدم (${user.name})`,
    metadata: { email: user.email, role: user.role },
  })

  return {
    user: formatSafeUser(user),
    gym: formatSafeGym(user.gym),
    token,
  }
}

/**
 * Retrieves the safe profile of the currently authenticated user
 */
export const getCurrentUserProfile = async (
  userId: string
): Promise<AuthSuccessData> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { gym: true },
  })

  if (!user || !user.isActive) {
    throw AppError.unauthorized('المستخدم غير موجود أو تم تعطيل الحساب')
  }

  if (!user.gym.isActive) {
    throw AppError.forbidden('اشتراك النادي الرياضي معطل أو غير نشط')
  }

  return {
    user: formatSafeUser(user),
    gym: formatSafeGym(user.gym),
  }
}
