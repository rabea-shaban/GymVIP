export const DEFAULT_REMINDER_DAYS = [3, 1]
export const DEFAULT_ALLOWED_FREEZE_DURATIONS = [3, 7, 15, 30]
export const DEFAULT_MAX_FREEZE_DAYS = 90
export const ALLOWED_REMINDER_VALUES = [1, 3, 7] as const

export interface GymProfile {
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
  // Feature 15: Settings & Business Preferences
  subscriptionReminderEnabled: boolean
  subscriptionReminderDays: number[]
  subscriptionFreezeEnabled: boolean
  allowedFreezeDurations: number[]
  maxFreezeDays: number
  allowManualCheckout: boolean
}

export interface GymSetupStatus {
  setupCompleted: boolean
}
