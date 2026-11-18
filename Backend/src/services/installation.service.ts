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
