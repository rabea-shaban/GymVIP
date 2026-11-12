import { SubscriptionStatus } from '@prisma/client'

export interface SubscriptionMemberDto {
  id: string
  name: string
  phone: string
  memberCode: string
  email?: string | null
  isActive: boolean
}

export interface SubscriptionPlanDto {
  id: string
  name: string
  durationDays: number
  price: string
  currency: string
  isActive: boolean
}

export interface SubscriptionDto {
  id: string
  gymId: string
  memberId: string
  planId: string
  planName: string
  planPrice: string // Decimal formatted string e.g. "500.00"
  durationDays: number
  currency: string
  startDate: string // ISO string or YYYY-MM-DD
  endDate: string // ISO string or YYYY-MM-DD
  status: SubscriptionStatus
  effectiveStatus: SubscriptionStatus
  notes?: string | null
  // Feature 16: Cancellation fields
  cancelledAt?: string | null
  cancellationReason?: string | null
  cancellationNotes?: string | null
  cancelledByUserId?: string | null
  cancelledByUser?: {
    id: string
    name: string
    role: string
  } | null
  createdAt: string
  updatedAt: string
  member?: SubscriptionMemberDto
  plan?: SubscriptionPlanDto
}

export interface CancelSubscriptionInput {
  reason: string
  notes?: string | null
}

export interface CreateSubscriptionInput {
  memberId: string
  planId: string
  startDate?: string
  notes?: string
}

export interface SubscriptionFilterQuery {
  search?: string
  status?: SubscriptionStatus
  memberId?: string
  planId?: string
  page?: number
  limit?: number
}

export interface SubscriptionFreezeDto {
  id: string
  gymId: string
  subscriptionId: string
  startDate: string
  endDate: string
  days: number
  reason?: string | null
  createdByUserId: string
  createdAt: string
  createdByUser?: {
    id: string
    name: string
    role: string
  }
}

export interface FreezeSubscriptionInput {
  days: number
  reason?: string | null
}

export interface RenewSubscriptionInput {
  planId: string
  startDate?: string | null
  notes?: string | null
}

export interface SubscriptionPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface SubscriptionListResult {
  subscriptions: SubscriptionDto[]
  pagination: SubscriptionPagination
}

export interface FreezeListResult {
  freezes: SubscriptionFreezeDto[]
  total: number
}
