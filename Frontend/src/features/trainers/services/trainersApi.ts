import { api } from '@/services/api'
import type {
  TrainerItem,
  TrainerListResponse,
  TrainerFilterParams,
  CreateTrainerInput,
  UpdateTrainerInput,
} from '../types/trainer.types'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  errors?: unknown[]
}

export const trainersApi = {
  /**
   * GET /api/v1/trainers
   * List trainers for authenticated gym with search & filters
   */
  list: async (params?: TrainerFilterParams): Promise<TrainerListResponse> => {
    const response = await api.get<ApiResponse<TrainerListResponse>>('/trainers', {
      params,
    })
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch trainers')
    }
    return response.data.data
  },

  /**
   * GET /api/v1/trainers/me
   * Get current authenticated trainer's profile
   */
  getMe: async (): Promise<TrainerItem> => {
    const response = await api.get<ApiResponse<{ trainer: TrainerItem }>>('/trainers/me')
    if (!response.data.data?.trainer) {
      throw new Error(response.data.message || 'Failed to fetch trainer profile')
    }
    return response.data.data.trainer
  },

  /**
   * GET /api/v1/trainers/:id
   * Get trainer profile details by ID
   */
  getById: async (id: string): Promise<TrainerItem> => {
    const response = await api.get<ApiResponse<{ trainer: TrainerItem }>>(`/trainers/${id}`)
    if (!response.data.data?.trainer) {
      throw new Error(response.data.message || 'Failed to fetch trainer')
    }
    return response.data.data.trainer
  },

  /**
   * POST /api/v1/trainers
   * Create a new trainer profile (User + Trainer)
   */
  create: async (data: CreateTrainerInput): Promise<TrainerItem> => {
    const response = await api.post<ApiResponse<{ trainer: TrainerItem }>>('/trainers', data)
    if (!response.data.data?.trainer) {
      throw new Error(response.data.message || 'Failed to create trainer')
    }
    return response.data.data.trainer
  },

  /**
   * PATCH /api/v1/trainers/:id
   * Update trainer profile information
   */
  update: async (id: string, data: UpdateTrainerInput): Promise<TrainerItem> => {
    const response = await api.patch<ApiResponse<{ trainer: TrainerItem }>>(
      `/trainers/${id}`,
      data
    )
    if (!response.data.data?.trainer) {
      throw new Error(response.data.message || 'Failed to update trainer')
    }
    return response.data.data.trainer
  },

  /**
   * PATCH /api/v1/trainers/:id/status
   * Activate or deactivate trainer
   */
  updateStatus: async (id: string, isActive: boolean): Promise<TrainerItem> => {
    const response = await api.patch<ApiResponse<{ trainer: TrainerItem }>>(
      `/trainers/${id}/status`,
      { isActive }
    )
    if (!response.data.data?.trainer) {
      throw new Error(response.data.message || 'Failed to update trainer status')
    }
    return response.data.data.trainer
  },

  /**
   * DELETE /api/v1/trainers/:id
   * Delete trainer profile
   */
  delete: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/trainers/${id}`)
  },
}

export default trainersApi
