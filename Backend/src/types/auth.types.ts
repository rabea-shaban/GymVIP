import type { Role } from '@prisma/client'

export interface AuthUser {
  id: string
  gymId: string
  name: string
  email: string
  role: Role
}

export interface AuthTokenPayload {
  sub: string
  gymId: string
  role: Role
}

export interface SafeUser {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl?: string | null
  role: Role
}

export interface SafeGym {
  id: string
  name: string
  slug: string
  city: string | null
  currency: string
  phone?: string | null
  email?: string | null
  address?: string | null
  logo?: string | null
  subscriptionReminderEnabled?: boolean
  subscriptionFreezeEnabled?: boolean
  allowedFreezeDurations?: number[]
  maxFreezeDays?: number
  allowManualCheckout?: boolean
}

export interface AuthSuccessData {
  user: SafeUser
  gym: SafeGym
}
