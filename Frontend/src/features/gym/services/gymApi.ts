import { api } from '@/services/api'
import type {
  GymProfile,
  GymSetupInput,
  UpdateGymInput,
  GymSetupStatusResponse,
} from '../types/gym.types'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  errors?: unknown[]
}

export const gymApi = {
  /**
   * GET /api/v1/gym/setup-status
   * Checks whether the authenticated gym has completed initial setup
   */
  getSetupStatus: async (): Promise<GymSetupStatusResponse> => {
    const response = await api.get<ApiResponse<GymSetupStatusResponse>>('/gym/setup-status')
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch setup status')
    }
    return response.data.data
  },

  /**
   * GET /api/v1/gym
   * Fetches full authenticated gym profile
   */
  getProfile: async (): Promise<GymProfile> => {
    const response = await api.get<ApiResponse<{ gym: GymProfile }>>('/gym')
    if (!response.data.data?.gym) {
      throw new Error(response.data.message || 'Failed to fetch gym profile')
    }
    return response.data.data.gym
  },

  /**
   * PATCH /api/v1/gym/setup
   * Completes initial gym setup
   */
  completeSetup: async (data: GymSetupInput): Promise<GymProfile> => {
    const response = await api.patch<ApiResponse<{ gym: GymProfile }>>('/gym/setup', data)
    if (!response.data.data?.gym) {
      throw new Error(response.data.message || 'Failed to complete setup')
    }
    return response.data.data.gym
  },

  /**
   * PATCH /api/v1/gym
   * Updates gym settings
   */
  updateSettings: async (data: UpdateGymInput): Promise<GymProfile> => {
    const response = await api.patch<ApiResponse<{ gym: GymProfile }>>('/gym', data)
    if (!response.data.data?.gym) {
      throw new Error(response.data.message || 'Failed to update gym settings')
    }
    return response.data.data.gym
  },

  /**
   * PATCH /api/v1/gym/status
   * Updates gym active status (OWNER only)
   */
  updateStatus: async (isActive: boolean): Promise<GymProfile> => {
    const response = await api.patch<ApiResponse<{ gym: GymProfile }>>('/gym/status', { isActive })
    if (!response.data.data?.gym) {
      throw new Error(response.data.message || 'Failed to update gym status')
    }
    return response.data.data.gym
  },
}

export default gymApi
