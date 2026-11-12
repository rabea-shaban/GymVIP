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
  // Feature 15 settings
  subscriptionReminderEnabled: boolean
  subscriptionReminderDays: number[]
  subscriptionFreezeEnabled: boolean
  allowedFreezeDurations: number[]
  maxFreezeDays: number
  allowManualCheckout: boolean
}

export interface GymSetupInput {
  name: string
  phone?: string
  email?: string
  address?: string
  city?: string
  logo?: string
  currency?: 'EGP'
  timezone?: 'Africa/Cairo'
}

export interface UpdateGymInput {
  name?: string
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  logo?: string | null
  subscriptionReminderEnabled?: boolean
  subscriptionReminderDays?: number[]
  subscriptionFreezeEnabled?: boolean
  allowedFreezeDurations?: number[]
  maxFreezeDays?: number
  allowManualCheckout?: boolean
}

export interface GymSetupStatusResponse {
  setupCompleted: boolean
}
