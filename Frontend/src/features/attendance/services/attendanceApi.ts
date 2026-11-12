import { api } from '@/services/api'
import type {
  AttendanceItem,
  AttendanceListResponse,
  AttendanceFilterParams,
  TodayAttendanceSummary,
} from '../types/attendance.types'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  errors?: unknown[]
}

export const attendanceApi = {
  /**
   * POST /api/v1/attendance/check-in
   * Check in a member
   */
  checkIn: async (memberId: string): Promise<AttendanceItem> => {
    const response = await api.post<ApiResponse<{ attendance: AttendanceItem }>>(
      '/attendance/check-in',
      { memberId }
    )
    if (!response.data.data?.attendance) {
      throw new Error(response.data.message || 'Failed to check in member')
    }
    return response.data.data.attendance
  },

  /**
   * POST /api/v1/attendance/:id/check-out
   * Check out an attendance record by ID
   */
  checkOut: async (id: string): Promise<AttendanceItem> => {
    const response = await api.post<ApiResponse<{ attendance: AttendanceItem }>>(
      `/attendance/${id}/check-out`
    )
    if (!response.data.data?.attendance) {
      throw new Error(response.data.message || 'Failed to check out')
    }
    return response.data.data.attendance
  },

  /**
   * POST /api/v1/members/:memberId/check-out
   * Check out a member by their member ID (open session)
   */
  checkOutMember: async (memberId: string): Promise<AttendanceItem> => {
    const response = await api.post<ApiResponse<{ attendance: AttendanceItem }>>(
      `/members/${memberId}/check-out`
    )
    if (!response.data.data?.attendance) {
      throw new Error(response.data.message || 'Failed to check out member')
    }
    return response.data.data.attendance
  },

  /**
   * GET /api/v1/attendance/today
   * Get summary of today's attendance
   */
  getTodaySummary: async (): Promise<TodayAttendanceSummary> => {
    const response = await api.get<ApiResponse<TodayAttendanceSummary>>(
      '/attendance/today'
    )
    if (!response.data.data) {
      throw new Error(response.data.message || "Failed to fetch today's attendance summary")
    }
    return response.data.data
  },

  /**
   * GET /api/v1/attendance/current
   * Get all members currently inside
   */
  getCurrentlyInside: async (): Promise<AttendanceItem[]> => {
    const response = await api.get<ApiResponse<{ attendance: AttendanceItem[] }>>(
      '/attendance/current'
    )
    return response.data.data?.attendance || []
  },

  /**
   * GET /api/v1/attendance
   * List attendance records with filtering, search, and pagination
   */
  list: async (params?: AttendanceFilterParams): Promise<AttendanceListResponse> => {
    const response = await api.get<ApiResponse<AttendanceListResponse>>('/attendance', {
      params,
    })
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch attendance list')
    }
    return response.data.data
  },

  /**
   * GET /api/v1/attendance/:id
   * Get single attendance record by ID
   */
  getById: async (id: string): Promise<AttendanceItem> => {
    const response = await api.get<ApiResponse<{ attendance: AttendanceItem }>>(
      `/attendance/${id}`
    )
    if (!response.data.data?.attendance) {
      throw new Error(response.data.message || 'Failed to fetch attendance record')
    }
    return response.data.data.attendance
  },

  /**
   * GET /api/v1/members/:memberId/attendance
   * Get attendance history for a member
   */
  getMemberHistory: async (memberId: string): Promise<AttendanceItem[]> => {
    const response = await api.get<ApiResponse<{ attendance: AttendanceItem[] }>>(
      `/members/${memberId}/attendance`
    )
    return response.data.data?.attendance || []
  },

  /**
   * GET /api/v1/members/:memberId/attendance/current
   * Get current open attendance session for a member (or null)
   */
  getMemberCurrent: async (memberId: string): Promise<AttendanceItem | null> => {
    const response = await api.get<ApiResponse<{ attendance: AttendanceItem | null }>>(
      `/members/${memberId}/attendance/current`
    )
    return response.data.data?.attendance ?? null
  },
}

export default attendanceApi
