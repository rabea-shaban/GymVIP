import crypto from 'crypto'
import { LICENSE_PUBLIC_KEY, LICENSE_CONFIG } from '../config/license.config.js'
import { getMachineId } from './machineId.util.js'
import { logger } from './logger.util.js'

export interface LicensePayload {
  licenseId: string
  gymName: string
  machineId: string
  tier: 'STARTER' | 'PRO' | 'ENTERPRISE'
  maxMembers: number
  amountPaid?: number
  durationDays?: number
  features: string[]
  issuedAt: string // ISO date
  expiresAt: string // ISO date
  gracePeriodDays: number
}

export interface LicenseVerificationResult {
  valid: boolean
  status: 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'INVALID_SIGNATURE' | 'MACHINE_MISMATCH' | 'TAMPERED'
  payload: LicensePayload | null
  daysRemaining: number
  inGracePeriod: boolean
  message: string
}

/**
 * Verifies a cryptographic license key string
 */
export const verifyLicenseKey = (
  rawKey: string,
  latestDatabaseActivityTimestamp?: Date | null
): LicenseVerificationResult => {
  if (!rawKey || typeof rawKey !== 'string') {
    return {
      valid: false,
      status: 'INVALID_SIGNATURE',
      payload: null,
      daysRemaining: 0,
      inGracePeriod: false,
      message: 'كود التفعيل غير صالح أو فارغ',
    }
  }

  const cleanKey = rawKey.trim()
  const token = cleanKey.startsWith(LICENSE_CONFIG.KEY_PREFIX)
    ? cleanKey.slice(LICENSE_CONFIG.KEY_PREFIX.length)
    : cleanKey

  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      valid: false,
      status: 'INVALID_SIGNATURE',
      payload: null,
      daysRemaining: 0,
      inGracePeriod: false,
      message: 'صيغة كود التفعيل غير صحيحة',
    }
  }

  const [payloadBase64, signatureBase64] = parts

  // 1. Verify RSA-2048 digital signature
  try {
    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(payloadBase64)
    const isSignatureValid = verifier.verify(
      LICENSE_PUBLIC_KEY,
      Buffer.from(signatureBase64, 'base64')
    )

    if (!isSignatureValid) {
      return {
        valid: false,
        status: 'INVALID_SIGNATURE',
        payload: null,
        daysRemaining: 0,
        inGracePeriod: false,
        message: 'التوقيع الرقمي لكود التفعيل غير صحيح أو تم التلاعب به',
      }
    }
  } catch (error) {
    logger.error('Signature verification error:', error)
    return {
      valid: false,
      status: 'INVALID_SIGNATURE',
      payload: null,
      daysRemaining: 0,
      inGracePeriod: false,
      message: 'فشل التحقق من التوقيع الرقمي',
    }
  }

  // 2. Decode and parse payload
  let payload: LicensePayload
  try {
    const jsonString = Buffer.from(payloadBase64, 'base64').toString('utf8')
    payload = JSON.parse(jsonString)
  } catch {
    return {
      valid: false,
      status: 'INVALID_SIGNATURE',
      payload: null,
      daysRemaining: 0,
      inGracePeriod: false,
      message: 'بيانات كود التفعيل تالفة',
    }
  }

  // 3. Node-lock check: Verify Machine ID
  const currentMachineId = getMachineId()
  if (payload.machineId !== '*' && payload.machineId !== currentMachineId) {
    return {
      valid: false,
      status: 'MACHINE_MISMATCH',
      payload,
      daysRemaining: 0,
      inGracePeriod: false,
      message: `كود التفعيل مخصص لجهاز آخر (${payload.machineId}) ولا يتطابق مع هذا الجهاز (${currentMachineId})`,
    }
  }

  const now = new Date()

  // 4. Clock-Tampering Protection: System date cannot be older than DB activity
  if (latestDatabaseActivityTimestamp && now < latestDatabaseActivityTimestamp) {
    // If the difference is more than 30 minutes in the past
    const diffMinutes = (latestDatabaseActivityTimestamp.getTime() - now.getTime()) / (1000 * 60)
    if (diffMinutes > 30) {
      return {
        valid: false,
        status: 'TAMPERED',
        payload,
        daysRemaining: 0,
        inGracePeriod: false,
        message: 'تم رصد تلاعب بساعة وتاريخ النظام. يرجى ضبط توقيت الجهاز الصحيح للمتابعة.',
      }
    }
  }

  // 5. Expiration & Grace Period evaluation
  const expiresAt = new Date(payload.expiresAt)
  const graceDays = payload.gracePeriodDays ?? LICENSE_CONFIG.DEFAULT_GRACE_PERIOD_DAYS
  const graceEndsAt = new Date(expiresAt.getTime() + graceDays * 24 * 60 * 60 * 1000)

  const diffMs = expiresAt.getTime() - now.getTime()
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (now > graceEndsAt) {
    return {
      valid: false,
      status: 'EXPIRED',
      payload,
      daysRemaining,
      inGracePeriod: false,
      message: 'انتهت صلاحية ترخيص النظام وفترة السماح. يرجى تجديد الاشتراك للتفعيل.',
    }
  }

  if (now > expiresAt) {
    return {
      valid: true,
      status: 'GRACE_PERIOD',
      payload,
      daysRemaining,
      inGracePeriod: true,
      message: `انتهت صلاحية الترخيص، النظام يعمل حالياً في فترة سماح (${Math.ceil((graceEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} يوم متبقي). يرجى التجديد.`,
    }
  }

  return {
    valid: true,
    status: 'ACTIVE',
    payload,
    daysRemaining,
    inGracePeriod: false,
    message: 'الترخيص سارٍ ويعمل بصورة طبيعية',
  }
}
