import { api } from '@/services/api'
import type {
  MemberItem,
  MemberListResponse,
  MemberFilterParams,
  CreateMemberInput,
  UpdateMemberInput,
} from '../types/member.types'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  errors?: unknown[]
}

export const membersApi = {
  /**
   * GET /api/v1/members
   * List members for authenticated gym with search and filters
   */
  list: async (params?: MemberFilterParams): Promise<MemberListResponse> => {
    const response = await api.get<ApiResponse<MemberListResponse>>('/members', {
      params,
    })
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch members')
    }
    return response.data.data
  },

  /**
   * GET /api/v1/members/:id
   * Get member profile details
   */
  getById: async (id: string): Promise<MemberItem> => {
    const response = await api.get<ApiResponse<{ member: MemberItem }>>(`/members/${id}`)
    if (!response.data.data?.member) {
      throw new Error(response.data.message || 'Failed to fetch member')
    }
    return response.data.data.member
  },

  /**
   * POST /api/v1/members
   * Create new member
   */
  create: async (data: CreateMemberInput): Promise<MemberItem> => {
    const response = await api.post<ApiResponse<{ member: MemberItem }>>('/members', data)
    if (!response.data.data?.member) {
      throw new Error(response.data.message || 'Failed to create member')
    }
    return response.data.data.member
  },

  /**
   * PATCH /api/v1/members/:id
   * Update member information
   */
  update: async (id: string, data: UpdateMemberInput): Promise<MemberItem> => {
    const response = await api.patch<ApiResponse<{ member: MemberItem }>>(`/members/${id}`, data)
    if (!response.data.data?.member) {
      throw new Error(response.data.message || 'Failed to update member')
    }
    return response.data.data.member
  },

  /**
   * PATCH /api/v1/members/:id/status
   * Activate or deactivate member
   */
  updateStatus: async (id: string, isActive: boolean): Promise<MemberItem> => {
    const response = await api.patch<ApiResponse<{ member: MemberItem }>>(
      `/members/${id}/status`,
      { isActive }
    )
    if (!response.data.data?.member) {
      throw new Error(response.data.message || 'Failed to update member status')
    }
    return response.data.data.member
  },
}

export default membersApi
