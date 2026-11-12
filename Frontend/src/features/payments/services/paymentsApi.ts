import { api } from '@/services/api'
import type {
  PaymentItem,
  PaymentListResponse,
  PaymentFilterParams,
  CreatePaymentInput,
  SubscriptionPaymentsResponse,
} from '../types/payment.types'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  errors?: unknown[]
}

export const paymentsApi = {
  /**
   * GET /api/v1/payments
   * List payments with pagination, filters, and search
   */
  list: async (params?: PaymentFilterParams): Promise<PaymentListResponse> => {
    const response = await api.get<ApiResponse<PaymentListResponse>>('/payments', {
      params,
    })
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch payments')
    }
    return response.data.data
  },

  /**
   * GET /api/v1/payments/:id
   * Get single payment receipt details
   */
  getById: async (id: string): Promise<PaymentItem> => {
    const response = await api.get<ApiResponse<{ payment: PaymentItem }>>(`/payments/${id}`)
    if (!response.data.data?.payment) {
      throw new Error(response.data.message || 'Failed to fetch payment details')
    }
    return response.data.data.payment
  },

  /**
   * POST /api/v1/payments
   * Record a new payment
   */
  create: async (data: CreatePaymentInput): Promise<PaymentItem> => {
    const response = await api.post<ApiResponse<{ payment: PaymentItem }>>('/payments', data)
    if (!response.data.data?.payment) {
      throw new Error(response.data.message || 'Failed to create payment')
    }
    return response.data.data.payment
  },

  /**
   * GET /api/v1/subscriptions/:subscriptionId/payments
   * Get all payments and financial summary for a subscription
   */
  getSubscriptionPayments: async (
    subscriptionId: string
  ): Promise<SubscriptionPaymentsResponse> => {
    const response = await api.get<ApiResponse<SubscriptionPaymentsResponse>>(
      `/subscriptions/${subscriptionId}/payments`
    )
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch subscription payments')
    }
    return response.data.data
  },

  /**
   * GET /api/v1/members/:memberId/payments
   * Get all payments for a member
   */
  getMemberPayments: async (memberId: string): Promise<PaymentItem[]> => {
    const response = await api.get<ApiResponse<{ payments: PaymentItem[] }>>(
      `/members/${memberId}/payments`
    )
    return response.data.data?.payments || []
  },
}

export default paymentsApi
