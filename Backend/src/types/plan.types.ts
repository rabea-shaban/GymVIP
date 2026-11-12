export interface PlanDto {
  id: string
  gymId: string
  name: string
  description: string | null
  durationDays: number
  price: string
  currency: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PlanPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PlanListResult {
  plans: PlanDto[]
  pagination: PlanPagination
}

export interface PlanFilterQuery {
  search?: string
  status?: 'active' | 'inactive' | 'all'
  page?: number
  limit?: number
}
