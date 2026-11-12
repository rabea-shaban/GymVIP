import type { SubscriptionStatus } from '@prisma/client'

export type AttendanceStatusFilter = 'OPEN' | 'COMPLETED'

export interface AttendanceMemberDto {
  id: string
  name: string
  phone: string
  memberCode: string
  email?: string | null
}

export interface AttendanceSubscriptionDto {
  id: string
  planName: string
  planPrice: string
  durationDays: number
  startDate: string | Date
  endDate: string | Date
  status: SubscriptionStatus | string
}

export interface AttendanceDto {
  id: string
  gymId: string
  memberId: string
  subscriptionId: string
  checkInAt: Date | string
  checkOutAt: Date | string | null
  durationMinutes: number | null
  createdAt: Date | string
  updatedAt: Date | string
  member?: AttendanceMemberDto
  subscription?: AttendanceSubscriptionDto
}

export interface CheckInInput {
  memberId: string
}

export interface AttendanceFilterQuery {
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

export interface AttendanceListResult {
  attendance: AttendanceDto[]
  pagination: AttendancePagination
}

export interface TodayAttendanceSummary {
  currentlyInside: number
  checkedOutToday: number
  totalCheckInsToday: number
  totalCompletedVisitsToday: number
}
