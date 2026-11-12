import { api } from '@/services/api'
import type { DashboardOverviewData } from '../types/dashboard.types'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  errors?: unknown[]
}

export const dashboardApi = {
  /**
   * GET /api/v1/dashboard/overview
   */
  getOverview: async (): Promise<DashboardOverviewData> => {
    const response = await api.get<ApiResponse<DashboardOverviewData>>('/dashboard/overview')
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch dashboard overview')
    }
    return response.data.data
  },
}

export default dashboardApi
