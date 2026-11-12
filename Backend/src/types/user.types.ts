import type { Role } from '@prisma/client'

export interface UserDto {
  id: string
  gymId: string
  name: string
  email: string
  phone: string | null
  role: Role
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface UserPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface UserListResult {
  users: UserDto[]
  pagination: UserPagination
}

export interface UserFilterQuery {
  search?: string
  role?: Role
  status?: 'active' | 'inactive'
  page?: number
  limit?: number
}

export type UserQueryParams = UserFilterQuery
