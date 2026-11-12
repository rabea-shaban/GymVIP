import { api } from '@/services/api'
import type {
  UserItem,
  UserListResponse,
  CreateUserInput,
  UpdateUserInput,
  UserFilterParams,
} from '../types/user.types'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  errors?: unknown[]
}

export const usersApi = {
  /**
   * GET /api/v1/users
   * Lists staff users for the authenticated gym
   */
  list: async (params?: UserFilterParams): Promise<UserListResponse> => {
    const response = await api.get<ApiResponse<UserListResponse>>('/users', {
      params,
    })
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch users')
    }
    return response.data.data
  },

  /**
   * GET /api/v1/users/:id
   * Retrieves single user details
   */
  getById: async (id: string): Promise<UserItem> => {
    const response = await api.get<ApiResponse<{ user: UserItem }>>(`/users/${id}`)
    if (!response.data.data?.user) {
      throw new Error(response.data.message || 'Failed to fetch user')
    }
    return response.data.data.user
  },

  /**
   * POST /api/v1/users
   * Creates a new staff user
   */
  create: async (data: CreateUserInput): Promise<UserItem> => {
    const response = await api.post<ApiResponse<{ user: UserItem }>>('/users', data)
    if (!response.data.data?.user) {
      throw new Error(response.data.message || 'Failed to create user')
    }
    return response.data.data.user
  },

  /**
   * PATCH /api/v1/users/:id
   * Updates basic user info and role
   */
  update: async (id: string, data: UpdateUserInput): Promise<UserItem> => {
    const response = await api.patch<ApiResponse<{ user: UserItem }>>(`/users/${id}`, data)
    if (!response.data.data?.user) {
      throw new Error(response.data.message || 'Failed to update user')
    }
    return response.data.data.user
  },

  /**
   * PATCH /api/v1/users/:id/status
   * Activates or deactivates user account
   */
  updateStatus: async (id: string, isActive: boolean): Promise<UserItem> => {
    const response = await api.patch<ApiResponse<{ user: UserItem }>>(
      `/users/${id}/status`,
      { isActive }
    )
    if (!response.data.data?.user) {
      throw new Error(response.data.message || 'Failed to update user status')
    }
    return response.data.data.user
  },

  /**
   * PATCH /api/v1/users/:id/password
   * Admin resets user password
   */
  resetPassword: async (id: string, newPassword: string): Promise<void> => {
    await api.patch<ApiResponse<void>>(`/users/${id}/password`, { newPassword })
  },

  /**
   * DELETE /api/v1/users/:id
   * Admin deletes a staff member
   */
  delete: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/users/${id}`)
  },
}

export default usersApi
