import { api } from '@/services/api'
import type {
  SubscriptionItem,
  SubscriptionListResponse,
  SubscriptionFilterParams,
  CreateSubscriptionInput,
  FreezeSubscriptionInput,
  SubscriptionFreezeItem,
  FreezeListResponse,
  RenewSubscriptionInput,
  CancelSubscriptionInput,
} from '../types/subscription.types'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  errors?: unknown[]
}

export const subscriptionsApi = {
  /**
   * GET /api/v1/subscriptions
   * List subscriptions with pagination and search
   */
  list: async (params?: SubscriptionFilterParams): Promise<SubscriptionListResponse> => {
    const response = await api.get<ApiResponse<SubscriptionListResponse>>('/subscriptions', {
      params,
    })
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch subscriptions')
    }
    return response.data.data
  },

  /**
   * GET /api/v1/subscriptions/:id
   * Get single subscription details
   */
  getById: async (id: string): Promise<SubscriptionItem> => {
    const response = await api.get<ApiResponse<{ subscription: SubscriptionItem }>>(
      `/subscriptions/${id}`
    )
    if (!response.data.data?.subscription) {
      throw new Error(response.data.message || 'Failed to fetch subscription')
    }
    return response.data.data.subscription
  },

  /**
   * POST /api/v1/subscriptions
   * Create a new subscription
   */
  create: async (data: CreateSubscriptionInput): Promise<SubscriptionItem> => {
    const response = await api.post<ApiResponse<{ subscription: SubscriptionItem }>>(
      '/subscriptions',
      data
    )
    if (!response.data.data?.subscription) {
      throw new Error(response.data.message || 'Failed to create subscription')
    }
    return response.data.data.subscription
  },

  /**
   * GET /api/v1/members/:memberId/subscriptions
   * Get subscription history for a member
   */
  getMemberSubscriptions: async (memberId: string): Promise<SubscriptionItem[]> => {
    const response = await api.get<ApiResponse<{ subscriptions: SubscriptionItem[] }>>(
      `/members/${memberId}/subscriptions`
    )
    return response.data.data?.subscriptions || []
  },

  /**
   * GET /api/v1/members/:memberId/subscriptions/current
   * Get current active/frozen subscription for a member
   */
  getMemberCurrent: async (memberId: string): Promise<SubscriptionItem | null> => {
    const response = await api.get<ApiResponse<{ subscription: SubscriptionItem | null }>>(
      `/members/${memberId}/subscriptions/current`
    )
    return response.data.data?.subscription ?? null
  },

  /**
   * POST /api/v1/subscriptions/:id/freeze
   * Freeze subscription
   */
  freeze: async (
    id: string,
    data: FreezeSubscriptionInput
  ): Promise<{ subscription: SubscriptionItem; freeze: SubscriptionFreezeItem }> => {
    const response = await api.post<
      ApiResponse<{ subscription: SubscriptionItem; freeze: SubscriptionFreezeItem }>
    >(`/subscriptions/${id}/freeze`, data)
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to freeze subscription')
    }
    return response.data.data
  },

  /**
   * GET /api/v1/subscriptions/:id/freezes
   * Get subscription freeze history
   */
  getFreezes: async (id: string): Promise<FreezeListResponse> => {
    const response = await api.get<ApiResponse<FreezeListResponse>>(`/subscriptions/${id}/freezes`)
    return response.data.data || { freezes: [], total: 0 }
  },

  /**
   * POST /api/v1/subscriptions/:id/renew
   * Renew subscription creating a new one
   */
  renew: async (id: string, data: RenewSubscriptionInput): Promise<SubscriptionItem> => {
    const response = await api.post<ApiResponse<{ subscription: SubscriptionItem }>>(
      `/subscriptions/${id}/renew`,
      data
    )
    if (!response.data.data?.subscription) {
      throw new Error(response.data.message || 'Failed to renew subscription')
    }
    return response.data.data.subscription
  },

  /**
   * POST /api/v1/subscriptions/:id/cancel
   * Cancel active or frozen subscription (OWNER and MANAGER only)
   */
  cancel: async (id: string, data: CancelSubscriptionInput): Promise<SubscriptionItem> => {
    const response = await api.post<ApiResponse<{ subscription: SubscriptionItem }>>(
      `/subscriptions/${id}/cancel`,
      data
    )
    if (!response.data.data?.subscription) {
      throw new Error(response.data.message || 'Failed to cancel subscription')
    }
    return response.data.data.subscription
  },
}

export default subscriptionsApi
