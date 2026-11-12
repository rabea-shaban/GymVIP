import { api } from '@/services/api'
import type {
  PlanItem,
  PlanListResponse,
  PlanFilterParams,
  CreatePlanInput,
  UpdatePlanInput,
} from '../types/plan.types'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  errors?: unknown[]
}

export const plansApi = {
  /**
   * GET /api/v1/plans
   * List membership plans for authenticated gym
   */
  list: async (params?: PlanFilterParams): Promise<PlanListResponse> => {
    const response = await api.get<ApiResponse<PlanListResponse>>('/plans', {
      params,
    })
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch plans')
    }
    return response.data.data
  },

  /**
   * GET /api/v1/plans/:id
   * Get single membership plan details
   */
  getById: async (id: string): Promise<PlanItem> => {
    const response = await api.get<ApiResponse<{ plan: PlanItem }>>(`/plans/${id}`)
    if (!response.data.data?.plan) {
      throw new Error(response.data.message || 'Failed to fetch plan')
    }
    return response.data.data.plan
  },

  /**
   * POST /api/v1/plans
   * Create a new membership plan
   */
  create: async (data: CreatePlanInput): Promise<PlanItem> => {
    const response = await api.post<ApiResponse<{ plan: PlanItem }>>('/plans', data)
    if (!response.data.data?.plan) {
      throw new Error(response.data.message || 'Failed to create plan')
    }
    return response.data.data.plan
  },

  /**
   * PATCH /api/v1/plans/:id
   * Update membership plan details
   */
  update: async (id: string, data: UpdatePlanInput): Promise<PlanItem> => {
    const response = await api.patch<ApiResponse<{ plan: PlanItem }>>(`/plans/${id}`, data)
    if (!response.data.data?.plan) {
      throw new Error(response.data.message || 'Failed to update plan')
    }
    return response.data.data.plan
  },

  /**
   * PATCH /api/v1/plans/:id/status
   * Activate or disable membership plan
   */
  updateStatus: async (id: string, isActive: boolean): Promise<PlanItem> => {
    const response = await api.patch<ApiResponse<{ plan: PlanItem }>>(
      `/plans/${id}/status`,
      { isActive }
    )
    if (!response.data.data?.plan) {
      throw new Error(response.data.message || 'Failed to update plan status')
    }
    return response.data.data.plan
  },

  /**
   * DELETE /api/v1/plans/:id
   * Delete membership plan if no active subscriptions
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/plans/${id}`)
  },
}

export default plansApi
