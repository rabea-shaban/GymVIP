export type UserRole = 'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'TRAINER'

export interface AuditActor {
  id: string
  name: string
  role: UserRole
}

export interface AuditLog {
  id: string
  gymId: string
  actorUserId: string | null
  actorUser?: AuditActor | null
  action: string
  entityType: string
  entityId: string | null
  description: string
  metadata: Record<string, any> | null
  beforeData: Record<string, any> | null
  afterData: Record<string, any> | null
  createdAt: string
}

export interface ActivityLogFilterParams {
  page?: number
  limit?: number
  action?: string
  entityType?: string
  actorUserId?: string
  fromDate?: string
  toDate?: string
  search?: string
}

export interface ActivityLogPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ActivityLogListResponse {
  data: AuditLog[]
  pagination: ActivityLogPagination
}
