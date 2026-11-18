import { prisma } from '../config/database.js'
import { AppError } from '../utils/appError.util.js'
import type {
  GymSetupInput,
  UpdateGymInput,
  UpdateGymStatusInput,
} from '../validators/gym.validator.js'
import {
  type GymProfile,
  type GymSetupStatus,
  DEFAULT_REMINDER_DAYS,
  DEFAULT_ALLOWED_FREEZE_DURATIONS,
  DEFAULT_MAX_FREEZE_DAYS,
} from '../types/gym.types.js'
import { createAuditLog } from './audit.service.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../types/audit.types.js'
import { saveBase64Image, deleteStoredImage } from '../utils/fileStorage.util.js'

export const formatGymProfile = (gym: {
  id: string
  name: string
  slug: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  logo: string | null
  currency: string
  timezone: string
  isActive?: boolean
  setupCompleted: boolean
  subscriptionReminderEnabled?: boolean | null
  subscriptionReminderDays?: unknown
  subscriptionFreezeEnabled?: boolean | null
  allowedFreezeDurations?: unknown
  maxFreezeDays?: number | null
  allowManualCheckout?: boolean | null
}): GymProfile => {
  let rawReminderDays = gym.subscriptionReminderDays
  if (typeof rawReminderDays === 'string') {
    try { rawReminderDays = JSON.parse(rawReminderDays) } catch { rawReminderDays = null }
  }
  const reminderDays = Array.isArray(rawReminderDays)
    ? (rawReminderDays as number[])
    : DEFAULT_REMINDER_DAYS

  let rawFreezeDurations = gym.allowedFreezeDurations
  if (typeof rawFreezeDurations === 'string') {
    try { rawFreezeDurations = JSON.parse(rawFreezeDurations) } catch { rawFreezeDurations = null }
  }
  const freezeDurations = Array.isArray(rawFreezeDurations)
    ? (rawFreezeDurations as number[])
    : DEFAULT_ALLOWED_FREEZE_DURATIONS

  return {
    id: gym.id,
    name: gym.name,
    slug: gym.slug,
    phone: gym.phone,
    email: gym.email,
    address: gym.address,
    city: gym.city,
    logo: gym.logo,
    currency: gym.currency,
    timezone: gym.timezone,
    isActive: gym.isActive ?? true,
    setupCompleted: gym.setupCompleted,
    subscriptionReminderEnabled: gym.subscriptionReminderEnabled ?? true,
    subscriptionReminderDays: [...reminderDays].sort((a, b) => b - a),
    subscriptionFreezeEnabled: gym.subscriptionFreezeEnabled ?? true,
    allowedFreezeDurations: [...freezeDurations].sort((a, b) => a - b),
    maxFreezeDays: gym.maxFreezeDays ?? DEFAULT_MAX_FREEZE_DAYS,
    allowManualCheckout: gym.allowManualCheckout ?? true,
  }
}

/**
 * Retrieves the full profile of the authenticated gym
 */
export const getGymProfile = async (gymId: string): Promise<GymProfile> => {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
  })

  if (!gym) {
    throw AppError.notFound('بيانات الجيم غير موجودة / Gym not found')
  }

  return formatGymProfile(gym)
}

/**
 * Retrieves the setup completion status of the authenticated gym
 */
export const getGymSetupStatus = async (
  gymId: string
): Promise<GymSetupStatus> => {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { setupCompleted: true },
  })

  if (!gym) {
    throw AppError.notFound('بيانات الجيم غير موجودة / Gym not found')
  }

  return {
    setupCompleted: gym.setupCompleted,
  }
}

/**
 * Completes initial gym setup, updates profile fields, and marks setupCompleted = true
 */
export const completeGymSetup = async (
  gymId: string,
  input: GymSetupInput
): Promise<GymProfile> => {
  const existingGym = await prisma.gym.findUnique({
    where: { id: gymId },
  })

  if (!existingGym) {
    throw AppError.notFound('بيانات الجيم غير موجودة / Gym not found')
  }

  const savedLogo = input.logo
    ? await saveBase64Image(input.logo, 'gyms', `gym-${existingGym.slug}`)
    : null

  const updatedGym = await prisma.gym.update({
    where: { id: gymId },
    data: {
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
      logo: savedLogo,
      currency: input.currency ?? 'EGP',
      timezone: input.timezone ?? 'Africa/Cairo',
      setupCompleted: true,
    },
  })

  return formatGymProfile(updatedGym)
}

/**
 * Updates gym profile settings and business preferences
 * ID and Slug remain immutable!
 */
export const updateGymSettings = async (
  gymId: string,
  input: UpdateGymInput,
  actorUserId?: string
): Promise<GymProfile> => {
  const existingGym = await prisma.gym.findUnique({
    where: { id: gymId },
  })

  if (!existingGym) {
    throw AppError.notFound('بيانات الجيم غير موجودة / Gym not found')
  }

  // Cross-field validation with existing values for partial updates
  const effectiveMaxFreezeDays =
    input.maxFreezeDays !== undefined
      ? input.maxFreezeDays
      : existingGym.maxFreezeDays ?? DEFAULT_MAX_FREEZE_DAYS

  if (input.allowedFreezeDurations !== undefined) {
    for (const d of input.allowedFreezeDurations) {
      if (d > effectiveMaxFreezeDays) {
        throw AppError.badRequest(
          `مدة التجميد (${d}) تتجاوز الحد الأقصى المسموح به (${effectiveMaxFreezeDays}) / Freeze duration exceeds maxFreezeDays`
        )
      }
    }
  } else if (input.maxFreezeDays !== undefined) {
    const existingDurations = Array.isArray(existingGym.allowedFreezeDurations)
      ? (existingGym.allowedFreezeDurations as number[])
      : DEFAULT_ALLOWED_FREEZE_DURATIONS

    for (const d of existingDurations) {
      if (d > input.maxFreezeDays) {
        throw AppError.badRequest(
          `الحد الأقصى الجديد (${input.maxFreezeDays}) أقل من مدة التجميد المعتمدة (${d}) / New maxFreezeDays is less than existing allowed duration`
        )
      }
    }
  }

  // Consistent sorting
  const sortedReminderDays =
    input.subscriptionReminderDays !== undefined
      ? [...input.subscriptionReminderDays].sort((a, b) => b - a)
      : undefined

  const sortedFreezeDurations =
    input.allowedFreezeDurations !== undefined
      ? [...input.allowedFreezeDurations].sort((a, b) => a - b)
      : undefined

  let finalLogo = existingGym.logo
  if (input.logo !== undefined) {
    if (input.logo) {
      finalLogo = await saveBase64Image(input.logo, 'gyms', `gym-${existingGym.slug}`)
      if (
        existingGym.logo &&
        existingGym.logo !== finalLogo &&
        existingGym.logo.startsWith('/uploads/')
      ) {
        await deleteStoredImage(existingGym.logo)
      }
    } else {
      finalLogo = null
      if (existingGym.logo?.startsWith('/uploads/')) {
        await deleteStoredImage(existingGym.logo)
      }
    }
  }

  const updatedGym = await prisma.gym.update({
    where: { id: gymId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone || null }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.address !== undefined && { address: input.address || null }),
      ...(input.city !== undefined && { city: input.city || null }),
      ...(input.logo !== undefined && { logo: finalLogo }),
      ...(input.subscriptionReminderEnabled !== undefined && {
        subscriptionReminderEnabled: input.subscriptionReminderEnabled,
      }),
      ...(sortedReminderDays !== undefined && {
        subscriptionReminderDays: JSON.stringify(sortedReminderDays),
      }),
      ...(input.subscriptionFreezeEnabled !== undefined && {
        subscriptionFreezeEnabled: input.subscriptionFreezeEnabled,
      }),
      ...(sortedFreezeDurations !== undefined && {
        allowedFreezeDurations: JSON.stringify(sortedFreezeDurations),
      }),
      ...(input.maxFreezeDays !== undefined && {
        maxFreezeDays: input.maxFreezeDays,
      }),
      ...(input.allowManualCheckout !== undefined && {
        allowManualCheckout: input.allowManualCheckout,
      }),
    },
  })

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.GYM_SETTINGS_UPDATED,
    entityType: AUDIT_ENTITY_TYPES.GYM,
    entityId: gymId,
    description: `تم تحديث إعدادات وتفضيلات الجيم (${updatedGym.name})`,
    beforeData: formatGymProfile(existingGym),
    afterData: formatGymProfile(updatedGym),
    metadata: {
      changedFields: Object.keys(input),
    },
  })

  return formatGymProfile(updatedGym)
}

/**
 * Updates gym operational status (Active / Inactive) - OWNER only
 */
export const updateGymStatus = async (
  gymId: string,
  input: UpdateGymStatusInput
): Promise<GymProfile> => {
  const existingGym = await prisma.gym.findUnique({
    where: { id: gymId },
  })

  if (!existingGym) {
    throw AppError.notFound('بيانات الجيم غير موجودة / Gym not found')
  }

  const updatedGym = await prisma.gym.update({
    where: { id: gymId },
    data: {
      isActive: input.isActive,
    },
  })

  return formatGymProfile(updatedGym)
}
