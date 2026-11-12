import { Role } from '@prisma/client'

export const AUDIT_ACTIONS = {
  // Auth
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',

  // User
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
  USER_DELETED: 'USER_DELETED',

  // Member
  MEMBER_CREATED: 'MEMBER_CREATED',
  MEMBER_UPDATED: 'MEMBER_UPDATED',
  MEMBER_ACTIVATED: 'MEMBER_ACTIVATED',
  MEMBER_DEACTIVATED: 'MEMBER_DEACTIVATED',

  // Plan
  PLAN_CREATED: 'PLAN_CREATED',
  PLAN_UPDATED: 'PLAN_UPDATED',
  PLAN_ACTIVATED: 'PLAN_ACTIVATED',
  PLAN_DEACTIVATED: 'PLAN_DEACTIVATED',
  PLAN_DELETED: 'PLAN_DELETED',

  // Subscription
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_FROZEN: 'SUBSCRIPTION_FROZEN',
  SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',

  // Payment
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',

  // Attendance
  ATTENDANCE_CHECK_IN: 'ATTENDANCE_CHECK_IN',
  ATTENDANCE_CHECK_OUT: 'ATTENDANCE_CHECK_OUT',

  // Trainer
  TRAINER_CREATED: 'TRAINER_CREATED',
  TRAINER_UPDATED: 'TRAINER_UPDATED',
  TRAINER_ACTIVATED: 'TRAINER_ACTIVATED',
  TRAINER_DEACTIVATED: 'TRAINER_DEACTIVATED',
  TRAINER_DELETED: 'TRAINER_DELETED',

  // Gym
  GYM_SETTINGS_UPDATED: 'GYM_SETTINGS_UPDATED',

  // Feature 17: Data Export
  DATA_EXPORT_MEMBERS: 'DATA_EXPORT_MEMBERS',
  DATA_EXPORT_SUBSCRIPTIONS: 'DATA_EXPORT_SUBSCRIPTIONS',
  DATA_EXPORT_PAYMENTS: 'DATA_EXPORT_PAYMENTS',
  DATA_EXPORT_ATTENDANCE: 'DATA_EXPORT_ATTENDANCE',
  DATA_EXPORT_PLANS: 'DATA_EXPORT_PLANS',
  DATA_EXPORT_ACTIVITY_LOGS: 'DATA_EXPORT_ACTIVITY_LOGS',
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS] | string

export const AUDIT_ENTITY_TYPES = {
  USER: 'USER',
  MEMBER: 'MEMBER',
  PLAN: 'PLAN',
  SUBSCRIPTION: 'SUBSCRIPTION',
  PAYMENT: 'PAYMENT',
  ATTENDANCE: 'ATTENDANCE',
  TRAINER: 'TRAINER',
  GYM: 'GYM',
  AUTH: 'AUTH',
  DATA_EXPORT: 'DATA_EXPORT',
} as const

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[keyof typeof AUDIT_ENTITY_TYPES] | string

export interface CreateAuditLogParams {
  gymId: string
  actorUserId?: string | null
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string | null
  description: string
  metadata?: Record<string, any> | null
  beforeData?: Record<string, any> | null
  afterData?: Record<string, any> | null
  tx?: any
}

export interface AuditLogQueryFilter {
  page?: number
  limit?: number
  actorUserId?: string
  action?: string
  entityType?: string
  entityId?: string
  fromDate?: string
  toDate?: string
  search?: string
}

export interface AuditLogActorDto {
  id: string
  name: string
  role: Role
}

export interface AuditLogResponseDto {
  id: string
  gymId: string
  actorUserId: string | null
  actorUser?: AuditLogActorDto | null
  action: string
  entityType: string
  entityId: string | null
  description: string
  metadata: Record<string, any> | null
  beforeData: Record<string, any> | null
  afterData: Record<string, any> | null
  createdAt: Date | string
}

export interface AuditLogListResult {
  data: AuditLogResponseDto[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
