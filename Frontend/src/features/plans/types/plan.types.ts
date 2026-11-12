export interface PlanItem {
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

export interface PlanListResponse {
  plans: PlanItem[]
  pagination: PlanPagination
}

export interface PlanFilterParams {
  search?: string
  status?: 'active' | 'inactive' | 'all'
  page?: number
  limit?: number
}

export interface CreatePlanInput {
  name: string
  description?: string | null
  durationDays: number
  price: number
}

export interface UpdatePlanInput {
  name?: string
  description?: string | null
  durationDays?: number
  price?: number
}
