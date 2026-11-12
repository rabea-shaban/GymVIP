import type { Gender } from '@prisma/client'

export interface MemberDto {
  id: string
  gymId: string
  memberCode: string
  name: string
  phone: string
  email: string | null
  gender: Gender | null
  dateOfBirth: string | null
  address: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  notes: string | null
  avatarUrl?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  currentSubscription?: {
    id: string
    planName: string
    status: string
    startDate: string
    endDate: string
  } | null
  lastAttendance?: {
    checkInAt: string
    checkOutAt: string | null
  } | null
}

export interface MemberStats {
  total: number
  active: number
  expired: number
  expiringSoon: number
  newThisMonth: number
}

export interface MemberPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface MemberListResult {
  members: MemberDto[]
  pagination: MemberPagination
  stats?: MemberStats
}

export interface MemberFilterQuery {
  search?: string
  status?: 'active' | 'inactive' | 'all'
  gender?: Gender
  page?: number
  limit?: number
}
