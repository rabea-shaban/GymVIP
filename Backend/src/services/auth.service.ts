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
import { saveBase64Image, deleteStoredImage } from '../utils/fileStorage.util.js'

export const formatSafeUser = (user: {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl?: string | null
  role: Role | string
}): SafeUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatarUrl: user.avatarUrl ?? null,
  role: user.role as Role,
})

export const formatSafeGym = (gym: {
  id: string
  name: string
  slug: string
  city: string | null
  currency: string
  phone?: string | null
  email?: string | null
  address?: string | null
  logo?: string | null
  subscriptionReminderEnabled?: boolean | null
  subscriptionFreezeEnabled?: boolean | null
  allowedFreezeDurations?: unknown
  maxFreezeDays?: number | null
  allowManualCheckout?: boolean | null
}): SafeGym => ({
  id: gym.id,
  name: gym.name,
  slug: gym.slug,
  city: gym.city,
  currency: gym.currency,
  phone: gym.phone ?? null,
  email: gym.email ?? null,
  address: gym.address ?? null,
  logo: gym.logo ?? null,
  subscriptionReminderEnabled: gym.subscriptionReminderEnabled ?? true,
  subscriptionFreezeEnabled: gym.subscriptionFreezeEnabled ?? true,
  allowedFreezeDurations: Array.isArray(gym.allowedFreezeDurations)
    ? (gym.allowedFreezeDurations as number[])
    : [3, 7, 15, 30],
  maxFreezeDays: gym.maxFreezeDays ?? 90,
  allowManualCheckout: gym.allowManualCheckout ?? true,
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
    role: result.user.role as Role,
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
    role: user.role as Role,
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

  // Check system installation and setup stage
  const { getSystemInstallationStatus, markInitialLoginDone } = await import('./installation.service.js')
  const installation = await getSystemInstallationStatus()
  if (!installation.isAccountSetupDone) {
    await markInitialLoginDone()
  }

  return {
    user: formatSafeUser(user),
    gym: formatSafeGym(user.gym),
    token,
    installationState: installation.state,
    requiresAccountSetup: !installation.isAccountSetupDone,
    requiresActivation: !installation.isActivated,
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

  const { getSystemInstallationStatus } = await import('./installation.service.js')
  const installation = await getSystemInstallationStatus()

  return {
    user: formatSafeUser(user),
    gym: formatSafeGym(user.gym),
    installationState: installation.state,
    requiresAccountSetup: !installation.isAccountSetupDone,
    requiresActivation: !installation.isActivated,
  }
}

/**
 * Updates the profile (name, phone, avatar) of the currently authenticated user
 */
export const updateUserProfile = async (
  userId: string,
  input: { name?: string; phone?: string | null; avatarUrl?: string | null }
): Promise<AuthSuccessData> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { gym: true },
  })

  if (!user || !user.isActive) {
    throw AppError.unauthorized('المستخدم غير موجود أو تم تعطيل الحساب')
  }

  let finalAvatarUrl = user.avatarUrl
  if (input.avatarUrl !== undefined) {
    if (input.avatarUrl) {
      finalAvatarUrl = await saveBase64Image(input.avatarUrl, 'users', `user-${user.id}`)
      if (
        user.avatarUrl &&
        user.avatarUrl !== finalAvatarUrl &&
        user.avatarUrl.startsWith('/uploads/')
      ) {
        await deleteStoredImage(user.avatarUrl)
      }
    } else {
      finalAvatarUrl = null
      if (user.avatarUrl?.startsWith('/uploads/')) {
        await deleteStoredImage(user.avatarUrl)
      }
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone || null }),
      ...(input.avatarUrl !== undefined && { avatarUrl: finalAvatarUrl }),
    },
    include: { gym: true },
  })

  return {
    user: formatSafeUser(updatedUser),
    gym: formatSafeGym(updatedUser.gym),
  }
}
