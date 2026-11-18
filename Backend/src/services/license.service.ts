import { prisma } from '../config/database.js'
import { getMachineId } from '../utils/machineId.util.js'
import { verifyLicenseKey, type LicenseVerificationResult } from '../utils/license.crypto.js'
import { AppError } from '../utils/appError.util.js'
import { logger } from '../utils/logger.util.js'

let cachedVerification: {
  timestamp: number
  result: LicenseStatusResponse
} | null = null

const CACHE_TTL_MS = 60 * 1000 // 1 minute in-memory cache for speed

export interface LicenseStatusResponse {
  isActivated: boolean
  isValid: boolean
  status: 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'NOT_ACTIVATED' | 'MACHINE_MISMATCH' | 'TAMPERED' | 'INVALID_SIGNATURE'
  machineId: string
  gymName?: string | null
  tier?: string | null
  maxMembers?: number | null
  currentMembersCount?: number
  daysRemaining?: number
  expiresAt?: string | null
  inGracePeriod?: boolean
  message: string
}

/**
 * Gets the latest database activity timestamp across audit logs and attendances
 * Used for anti-clock-tampering protection.
 */
async function getLatestDatabaseActivity(): Promise<Date | null> {
  try {
    const [latestAudit, latestAttendance] = await Promise.all([
      prisma.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.attendance.findFirst({
        orderBy: { checkInAt: 'desc' },
        select: { checkInAt: true },
      }),
    ])

    const dates = [latestAudit?.createdAt, latestAttendance?.checkInAt].filter(
      (d): d is Date => d instanceof Date
    )

    if (dates.length === 0) return null
    return new Date(Math.max(...dates.map((d) => d.getTime())))
  } catch {
    return null
  }
}

/**
 * Returns current license status of the system
 */
export async function getSystemLicenseStatus(forceFresh: boolean = false): Promise<LicenseStatusResponse> {
  const machineId = getMachineId()

  if (!forceFresh && cachedVerification && Date.now() - cachedVerification.timestamp < CACHE_TTL_MS) {
    return cachedVerification.result
  }

  const licenseRecord = await prisma.systemLicense.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  // Get current members count
  const currentMembersCount = await prisma.member.count({
    where: { isActive: true },
  })

  if (!licenseRecord) {
    const unactivatedRes: LicenseStatusResponse = {
      isActivated: false,
      isValid: false,
      status: 'NOT_ACTIVATED',
      machineId,
      currentMembersCount,
      message: 'النظام غير مفعل. يرجى إدخال كود التفعيل لتشغيل البرنامج.',
    }
    cachedVerification = { timestamp: Date.now(), result: unactivatedRes }
    return unactivatedRes
  }

  const latestDbActivity = await getLatestDatabaseActivity()
  const verification = verifyLicenseKey(licenseRecord.licenseKey, latestDbActivity)

  // Update last verified timestamp
  try {
    await prisma.systemLicense.update({
      where: { id: licenseRecord.id },
      data: {
        lastVerifiedAt: new Date(),
        status: verification.status,
      },
    })
  } catch (err) {
    logger.warn('Failed to update systemLicense lastVerifiedAt:', err)
  }

  const result: LicenseStatusResponse = {
    isActivated: true,
    isValid: verification.valid,
    status: verification.status,
    machineId,
    gymName: verification.payload?.gymName ?? licenseRecord.gymName,
    tier: verification.payload?.tier ?? licenseRecord.tier,
    maxMembers: verification.payload?.maxMembers ?? licenseRecord.maxMembers,
    currentMembersCount,
    daysRemaining: verification.daysRemaining,
    expiresAt: verification.payload?.expiresAt ?? licenseRecord.expiresAt.toISOString(),
    inGracePeriod: verification.inGracePeriod,
    message: verification.message,
  }

  cachedVerification = { timestamp: Date.now(), result }
  return result
}

/**
 * Activates or updates the system license with a new license key
 */
export async function activateSystemLicense(rawKey: string): Promise<LicenseStatusResponse> {
  if (!rawKey || typeof rawKey !== 'string') {
    throw AppError.badRequest('كود التفعيل مطلوب')
  }

  const latestDbActivity = await getLatestDatabaseActivity()
  const verification: LicenseVerificationResult = verifyLicenseKey(rawKey, latestDbActivity)

  if (!verification.valid || !verification.payload) {
    throw AppError.badRequest(verification.message)
  }

  const p = verification.payload

  // Save or replace license in DB
  await prisma.$transaction(async (tx) => {
    // Delete any old license records
    await tx.systemLicense.deleteMany()

    // Insert new license record
    await tx.systemLicense.create({
      data: {
        licenseKey: rawKey.trim(),
        machineId: p.machineId,
        gymName: p.gymName,
        tier: p.tier,
        maxMembers: p.maxMembers,
        features: JSON.stringify(p.features),
        issuedAt: new Date(p.issuedAt),
        expiresAt: new Date(p.expiresAt),
        gracePeriodDays: p.gracePeriodDays,
        status: verification.status,
      },
    })
  })

  // Invalidate cache
  cachedVerification = null

  logger.info(`[License] Successfully activated license for ${p.gymName} (Tier: ${p.tier}, Max: ${p.maxMembers})`)
  return await getSystemLicenseStatus(true)
}

/**
 * Checks if the gym has exceeded the max members allowed by their license
 */
export async function assertMemberCreationAllowed(gymId: string): Promise<void> {
  const status = await getSystemLicenseStatus()

  if (!status.isValid) {
    throw AppError.forbidden(`لا يمكن تسجيل أعضاء جدد: ${status.message}`)
  }

  if (status.maxMembers && status.maxMembers > 0) {
    const count = await prisma.member.count({
      where: { gymId, isActive: true },
    })

    if (count >= status.maxMembers) {
      throw AppError.forbidden(
        `تم الوصول للحد الأقصى المسموح به للأعضاء في باقتك (${status.maxMembers} عضو). يرجى ترقية باقة الترخيص لإضافة المزيد.`
      )
    }
  }
}
