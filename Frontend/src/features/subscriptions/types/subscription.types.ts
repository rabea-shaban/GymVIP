export type SubscriptionStatus = 'ACTIVE' | 'FROZEN' | 'EXPIRED' | 'CANCELLED'

export interface SubscriptionMember {
  id: string
  name: string
  phone: string
  memberCode: string
  email?: string | null
  isActive: boolean
}

export interface SubscriptionPlan {
  id: string
  name: string
  durationDays: number
  price: string
  currency: string
  isActive: boolean
}

export interface SubscriptionItem {
  id: string
  gymId: string
  memberId: string
  planId: string
  planName: string
  planPrice: string
  durationDays: number
  currency: string
  startDate: string
  endDate: string
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
  member?: SubscriptionMember
  plan?: SubscriptionPlan
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

export interface SubscriptionFilterParams {
  search?: string
  status?: SubscriptionStatus
  memberId?: string
  planId?: string
  page?: number
  limit?: number
}

export interface SubscriptionPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface SubscriptionListResponse {
  subscriptions: SubscriptionItem[]
  pagination: SubscriptionPagination
}

export interface SubscriptionFreezeItem {
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

export interface FreezeListResponse {
  freezes: SubscriptionFreezeItem[]
  total: number
}
