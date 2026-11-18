export type UserRole = 'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'TRAINER'

export interface UserItem {
  id: string
  gymId: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  avatarUrl?: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface UserPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface UserListResponse {
  users: UserItem[]
  pagination: UserPagination
}

export interface CreateUserInput {
  name: string
  email: string
  phone?: string | null
  role: UserRole
  password: string
  avatarUrl?: string | null
}

export interface UpdateUserInput {
  name?: string
  phone?: string | null
  role?: UserRole
  avatarUrl?: string | null
}

export interface UserFilterParams {
  search?: string
  role?: UserRole
  status?: 'active' | 'inactive'
  page?: number
  limit?: number
}
