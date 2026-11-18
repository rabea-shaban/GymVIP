export interface TrainerUserDto {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl?: string | null
  isActive: boolean
}

export interface TrainerDto {
  id: string
  gymId: string
  userId: string
  specialization: string | null
  bio: string | null
  createdAt: Date
  updatedAt: Date
  user: TrainerUserDto
}

export interface TrainerPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface TrainerListResult {
  trainers: TrainerDto[]
  pagination: TrainerPagination
}

export interface TrainerFilterQuery {
  search?: string
  status?: 'active' | 'inactive' | 'all'
  page?: number
  limit?: number
}
