export interface TrainerUser {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl?: string | null
  isActive: boolean
}

export interface TrainerItem {
  id: string
  gymId: string
  userId: string
  specialization: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
  user: TrainerUser
}

export interface CreateTrainerInput {
  name: string
  email: string
  password: string
  phone: string
  specialization?: string | null
  bio?: string | null
}

export interface UpdateTrainerInput {
  name?: string
  phone?: string | null
  specialization?: string | null
  bio?: string | null
}

export interface TrainerFilterParams {
  search?: string
  status?: 'active' | 'inactive' | 'all'
  page?: number
  limit?: number
}

export interface TrainerPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface TrainerListResponse {
  trainers: TrainerItem[]
  pagination: TrainerPagination
}
