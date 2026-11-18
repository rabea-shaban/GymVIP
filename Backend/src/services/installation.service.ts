import { prisma } from '../config/database.js'
import { AppError } from '../utils/appError.util.js'
import { hashPassword } from '../utils/password.util.js'
import { createAuditLog } from './audit.service.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../types/audit.types.js'
import { getSystemLicenseStatus } from './license.service.js'
import { logger } from '../utils/logger.util.js'

export type InstallationState =
  | 'NOT_INSTALLED'
  | 'INITIAL_LOGIN'
  | 'ACCOUNT_SETUP_REQUIRED'
  | 'ACTIVATION_REQUIRED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SUSPENDED'

export interface InstallationStatusDto {
  state: InstallationState
  isAccountSetupDone: boolean
  isActivated: boolean
  initialAdminEmail: string
  currentAdminEmail?: string
  installedAt?: string
  message: string
}

export interface SetupAccountInput {
  currentEmail: string
  newEmail: string
  confirmNewEmail: string
  newPassword: string
  confirmNewPassword: string
}

/**
 * Gets or initializes the singleton system installation record
 */
export async function getSystemInstallationStatus(): Promise<InstallationStatusDto> {
  let installation = await prisma.systemInstallation.findUnique({
    where: { id: 'singleton' },
  })

  // If no record exists, initialize it in INITIAL_LOGIN state
  if (!installation) {
    const defaultAdmin = await prisma.user.findFirst({
      where: { role: 'OWNER' },
      select: { email: true },
    })

    installation = await prisma.systemInstallation.create({
      data: {
        id: 'singleton',
        state: 'INITIAL_LOGIN',
        isAccountSetupDone: false,
        isActivated: false,
        initialAdminEmail: defaultAdmin?.email || 'capt.ahmed@gymvip.eg',
      },
    })
  }

  // Cross-check with license status
  const license = await getSystemLicenseStatus()

  let currentState = installation.state as InstallationState

  if (!installation.isAccountSetupDone) {
    currentState = installation.state === 'ACCOUNT_SETUP_REQUIRED'
      ? 'ACCOUNT_SETUP_REQUIRED'
      : 'INITIAL_LOGIN'
  } else if (!license.isActivated || !license.isValid) {
    if (license.status === 'EXPIRED') {
      currentState = 'EXPIRED'
    } else if (license.status === 'MACHINE_MISMATCH' || license.status === 'TAMPERED') {
      currentState = 'SUSPENDED'
    } else {
      currentState = 'ACTIVATION_REQUIRED'
    }
  } else {
    currentState = 'ACTIVE'
  }

  // Sync state if changed
  if (installation.state !== currentState) {
    await prisma.systemInstallation.update({
      where: { id: 'singleton' },
      data: { state: currentState },
    }).catch((err) => logger.warn('Failed to sync installation state:', err))
  }

  const currentAdmin = await prisma.user.findFirst({
    where: { role: 'OWNER' },
    select: { email: true },
  })

  let message = 'النظام جاهز للاستخدام'
  if (currentState === 'INITIAL_LOGIN') {
    message = 'يرجى تسجيل الدخول بالبيانات الافتراضية للمرة الأولى'
  } else if (currentState === 'ACCOUNT_SETUP_REQUIRED') {
    message = 'يرجى إعداد بيانات الحساب وتعيين البريد وكلمة المرور الجديدة'
  } else if (currentState === 'ACTIVATION_REQUIRED') {
    message = 'النظام بانتظار إدخال كود التفعيل الرقمي'
  } else if (currentState === 'EXPIRED') {
    message = 'انتهت صلاحية رخصة النظام، يرجى التجديد'
  } else if (currentState === 'SUSPENDED') {
    message = 'تم تعليق رخصة النظام بسبب اختلاف بصمة العتاد أو التلاعب'
  }

  return {
    state: currentState,
    isAccountSetupDone: installation.isAccountSetupDone,
    isActivated: license.isValid,
    initialAdminEmail: installation.initialAdminEmail,
    currentAdminEmail: currentAdmin?.email,
    installedAt: installation.installedAt.toISOString(),
    message,
  }
}

/**
 * Transitions state to ACCOUNT_SETUP_REQUIRED when admin logs in for the first time
 */
export async function markInitialLoginDone(): Promise<void> {
  const installation = await prisma.systemInstallation.findUnique({
    where: { id: 'singleton' },
  })

  if (installation && !installation.isAccountSetupDone) {
    await prisma.systemInstallation.update({
      where: { id: 'singleton' },
      data: { state: 'ACCOUNT_SETUP_REQUIRED' },
    })
  }
}

/**
 * Completes the Initial Account Setup step
 */
export async function completeInitialAccountSetup(
  input: SetupAccountInput,
  actorUserId?: string
): Promise<InstallationStatusDto> {
  const { currentEmail, newEmail, confirmNewEmail, newPassword, confirmNewPassword } = input

  // 1. Validation
  if (!newEmail || !confirmNewEmail || !newPassword || !confirmNewPassword) {
    throw AppError.badRequest('جميع الحقول مطلوبة لإعداد الحساب الأولي')
  }

  if (newEmail.trim().toLowerCase() !== confirmNewEmail.trim().toLowerCase()) {
    throw AppError.badRequest('البريد الإلكتروني الجديد وتأكيده غير متطابقين')
  }

  if (newPassword !== confirmNewPassword) {
    throw AppError.badRequest('كلمة المرور الجديدة وتأكيدها غير متطابقين')
  }

  if (newPassword.length < 8) {
    throw AppError.badRequest('يجب ألا تقل كلمة المرور عن 8 أحرف أو أرقام')
  }

  // 2. Find Owner User
  const ownerUser = await prisma.user.findFirst({
    where: {
      role: 'OWNER',
      ...(currentEmail ? { email: currentEmail.trim().toLowerCase() } : {}),
    },
  })

  if (!ownerUser) {
    throw AppError.notFound('لم يتم العثور على حساب المسؤول الرئيسي للنظام')
  }

  // 3. Hash new password securely
  const passwordHash = await hashPassword(newPassword)

  // 4. Update in transaction
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: ownerUser.id },
      data: {
        email: newEmail.trim().toLowerCase(),
        passwordHash,
      },
    })

    await tx.systemInstallation.upsert({
      where: { id: 'singleton' },
      update: {
        state: 'ACTIVATION_REQUIRED',
        isAccountSetupDone: true,
        accountSetupAt: new Date(),
      },
      create: {
        id: 'singleton',
        state: 'ACTIVATION_REQUIRED',
        isAccountSetupDone: true,
        isActivated: false,
        accountSetupAt: new Date(),
      },
    })
  })

  await createAuditLog({
    gymId: ownerUser.gymId,
    actorUserId: actorUserId || ownerUser.id,
    action: AUDIT_ACTIONS.USER_UPDATED,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: ownerUser.id,
    description: `إتمام إعداد الحساب الأولي وتحديث البريد الإلكتروني وكلمة المرور المشفرة بنجاح`,
    metadata: {
      previousEmail: ownerUser.email,
      newEmail: newEmail.trim().toLowerCase(),
    },
  })

  logger.info(`[Installation] Initial account setup completed for ${newEmail}`)
  return await getSystemInstallationStatus()
}

export interface InstallationWizardCompleteInput {
  name: string
  branchName?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  logo?: string
  subscriptionReminderEnabled?: boolean
  subscriptionReminderDays?: number[]
  subscriptionFreezeEnabled?: boolean
  allowedFreezeDurations?: number[]
  maxFreezeDays?: number
  allowManualCheckout?: boolean
}

/**
 * Retrieves all data required for the Installation Wizard
 */
export async function getInstallationWizardData(gymId?: string) {
  const installation = await getSystemInstallationStatus()
  const license = await getSystemLicenseStatus()

  // Get primary gym
  let gym = null
  if (gymId) {
    gym = await prisma.gym.findUnique({ where: { id: gymId } })
  }
  if (!gym) {
    gym = await prisma.gym.findFirst()
  }

  const { formatGymProfile } = await import('./gym.service.js')
  const { getMachineId } = await import('../utils/machineId.util.js')
  const machineId = getMachineId()

  const { listDatabaseBackups } = await import('./backup.service.js')
  const backups = await listDatabaseBackups().catch(() => [])

  return {
    installation,
    license,
    machineId,
    gym: gym ? formatGymProfile(gym) : null,
    backupsSummary: {
      count: backups.length,
      latestBackup: backups[0] || null,
    },
  }
}

/**
 * Completes the installation setup wizard, saving all 7 configuration sections,
 * verifying the license, and transitioning the system to ACTIVE.
 */
export async function completeInstallationSetup(
  input: InstallationWizardCompleteInput,
  actorUserId?: string,
  gymId?: string
) {
  // 1. Verify license is activated
  const license = await getSystemLicenseStatus()
  if (!license.isValid || !license.isActivated) {
    throw AppError.badRequest('لا يمكن إكمال التثبيت: يرجى تفعيل كود ترخيص النظام بنجاح أولاً')
  }

  // 2. Find gym
  let gym = null
  if (gymId) {
    gym = await prisma.gym.findUnique({ where: { id: gymId } })
  }
  if (!gym) {
    gym = await prisma.gym.findFirst()
  }
  if (!gym) {
    throw AppError.notFound('لم يتم العثور على سجل النادي الرياضي')
  }

  // 3. Handle logo storage if provided as data URL
  let savedLogo = gym.logo
  if (input.logo && input.logo.startsWith('data:image/')) {
    const { saveBase64Image } = await import('../utils/fileStorage.util.js')
    savedLogo = await saveBase64Image(input.logo, 'gyms', `gym-${gym.slug}`)
  } else if (input.logo !== undefined) {
    savedLogo = input.logo || null
  }

  // 4. Update Gym Profile and Settings
  const sortedReminderDays = input.subscriptionReminderDays
    ? JSON.stringify([...input.subscriptionReminderDays].sort((a, b) => b - a))
    : gym.subscriptionReminderDays

  const sortedFreezeDurations = input.allowedFreezeDurations
    ? JSON.stringify([...input.allowedFreezeDurations].sort((a, b) => a - b))
    : gym.allowedFreezeDurations

  const updatedGym = await prisma.gym.update({
    where: { id: gym.id },
    data: {
      name: input.name.trim() || gym.name,
      phone: input.phone !== undefined ? input.phone || null : gym.phone,
      email: input.email !== undefined ? input.email || null : gym.email,
      address: input.address !== undefined ? input.address || null : gym.address,
      city: input.city !== undefined ? input.city || null : gym.city,
      logo: savedLogo,
      subscriptionReminderEnabled: input.subscriptionReminderEnabled ?? gym.subscriptionReminderEnabled,
      subscriptionReminderDays: sortedReminderDays,
      subscriptionFreezeEnabled: input.subscriptionFreezeEnabled ?? gym.subscriptionFreezeEnabled,
      allowedFreezeDurations: sortedFreezeDurations,
      maxFreezeDays: input.maxFreezeDays ?? gym.maxFreezeDays,
      allowManualCheckout: input.allowManualCheckout ?? gym.allowManualCheckout,
      setupCompleted: true,
    },
  })

  // 5. Update System Installation State to ACTIVE
  await prisma.systemInstallation.upsert({
    where: { id: 'singleton' },
    update: {
      state: 'ACTIVE',
      isActivated: true,
      activatedAt: new Date(),
    },
    create: {
      id: 'singleton',
      state: 'ACTIVE',
      isAccountSetupDone: true,
      isActivated: true,
      activatedAt: new Date(),
    },
  })

  // 6. Log audit event
  await createAuditLog({
    gymId: gym.id,
    actorUserId: actorUserId || 'SYSTEM',
    action: AUDIT_ACTIONS.GYM_SETTINGS_UPDATED,
    entityType: AUDIT_ENTITY_TYPES.GYM,
    entityId: gym.id,
    description: `اكتمال معالج التثبيت والإعداد الأولي للنظام وتفعيل رخصة ${license.tier || 'PRO'} بنجاح`,
    metadata: {
      gymName: updatedGym.name,
      tier: license.tier,
      maxMembers: license.maxMembers,
    },
  })

  const { formatGymProfile } = await import('./gym.service.js')
  logger.info(`[Installation] Full setup completed successfully for Gym: ${updatedGym.name}`)

  return {
    success: true,
    message: 'تم إكمال معالج التثبيت وتفعيل النظام بنجاح!',
    gym: formatGymProfile(updatedGym),
    installation: await getSystemInstallationStatus(),
  }
}
