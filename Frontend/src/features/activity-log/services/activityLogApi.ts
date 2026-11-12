import { api } from '@/services/api'
import type {
  AuditLog,
  ActivityLogFilterParams,
  ActivityLogListResponse,
} from '../types'

interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  meta?: any
}

export const activityLogApi = {
  /**
   * GET /api/v1/activity-logs
   */
  listLogs: async (params?: ActivityLogFilterParams): Promise<ActivityLogListResponse> => {
    const cleanParams: Record<string, any> = {}
    if (params) {
      if (params.page) cleanParams.page = params.page
      if (params.limit) cleanParams.limit = params.limit
      if (params.action) cleanParams.action = params.action
      if (params.entityType) cleanParams.entityType = params.entityType
      if (params.actorUserId) cleanParams.actorUserId = params.actorUserId
      if (params.fromDate) cleanParams.fromDate = params.fromDate
      if (params.toDate) cleanParams.toDate = params.toDate
      if (params.search?.trim()) cleanParams.search = params.search.trim()
    }

    const response = await api.get<ApiResponse<AuditLog[]>>('/activity-logs', {
      params: cleanParams,
    })

    const data = response.data.data ?? []
    const meta = response.data.meta ?? {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      total: data.length,
      totalPages: 1,
    }

    return {
      data,
      pagination: meta,
    }
  },

  /**
   * GET /api/v1/activity-logs/:id
   */
  getLogById: async (id: string): Promise<AuditLog> => {
    const response = await api.get<ApiResponse<{ auditLog: AuditLog }>>(`/activity-logs/${id}`)
    const auditLog = response.data.data?.auditLog
    if (!auditLog) {
      throw new Error(response.data.message || 'تعذر جلب تفاصيل العملية')
    }
    return auditLog
  },
}
