import { api } from '@/services/api'
import type {
  ReportDateFilterParams,
  ReportSummaryData,
  MembersReportData,
  SubscriptionsReportData,
  AttendanceReportData,
  PaymentsReportData,
} from '../types/report.types'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  errors?: unknown[]
}

export const reportsApi = {
  /**
   * GET /api/v1/reports/summary
   */
  getSummary: async (params?: ReportDateFilterParams): Promise<ReportSummaryData> => {
    const response = await api.get<ApiResponse<ReportSummaryData>>('/reports/summary', { params })
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch reports summary')
    }
    return response.data.data
  },

  /**
   * GET /api/v1/reports/members
   */
  getMembers: async (params?: ReportDateFilterParams): Promise<MembersReportData> => {
    const response = await api.get<ApiResponse<MembersReportData>>('/reports/members', { params })
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch members report')
    }
    return response.data.data
  },

  /**
   * GET /api/v1/reports/subscriptions
   */
  getSubscriptions: async (params?: ReportDateFilterParams): Promise<SubscriptionsReportData> => {
    const response = await api.get<ApiResponse<SubscriptionsReportData>>('/reports/subscriptions', { params })
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch subscriptions report')
    }
    return response.data.data
  },

  /**
   * GET /api/v1/reports/attendance
   */
  getAttendance: async (params?: ReportDateFilterParams): Promise<AttendanceReportData> => {
    const response = await api.get<ApiResponse<AttendanceReportData>>('/reports/attendance', { params })
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch attendance report')
    }
    return response.data.data
  },

  /**
   * GET /api/v1/reports/payments (OWNER & MANAGER only)
   */
  getPayments: async (params?: ReportDateFilterParams): Promise<PaymentsReportData> => {
    const response = await api.get<ApiResponse<PaymentsReportData>>('/reports/payments', { params })
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch payments report')
    }
    return response.data.data
  },
}

export default reportsApi
