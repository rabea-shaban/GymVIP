export type AttendanceStatusFilter = 'OPEN' | 'COMPLETED'

export interface AttendanceMember {
  id: string
  name: string
  phone: string
  memberCode: string
  email?: string | null
  avatarUrl?: string | null
}

export interface AttendanceSubscription {
  id: string
  planName: string
  planPrice: string
  durationDays: number
  startDate: string
  endDate: string
  status: string
}

export interface AttendanceItem {
  id: string
  gymId: string
  memberId: string
  subscriptionId: string
  checkInAt: string
  checkOutAt: string | null
  durationMinutes: number | null
  createdAt: string
  updatedAt: string
  member?: AttendanceMember
  subscription?: AttendanceSubscription
}

export interface CheckInInput {
  memberId: string
}

export interface AttendanceFilterParams {
  search?: string
  memberId?: string
  dateFrom?: string
  dateTo?: string
  status?: AttendanceStatusFilter
  page?: number
  limit?: number
}

export interface AttendancePagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface AttendanceListResponse {
  attendance: AttendanceItem[]
  pagination: AttendancePagination
}

export interface TodayAttendanceSummary {
  currentlyInside: number
  checkedOutToday: number
  totalCheckInsToday: number
  totalCompletedVisitsToday: number
}
