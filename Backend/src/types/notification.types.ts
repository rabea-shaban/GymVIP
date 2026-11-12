import { NotificationType } from '@prisma/client'

export { NotificationType }

export interface NotificationDto {
  id: string
  gymId: string
  recipientUserId: string
  type: NotificationType
  title: string
  message: string
  entityType: string | null
  entityId: string | null
  isRead: boolean
  readAt: Date | null
  deduplicationKey: string | null
  createdAt: Date
}

export interface NotificationFilterParams {
  isRead?: boolean
  type?: NotificationType
  page?: number
  limit?: number
}

export interface NotificationListResult {
  notifications: NotificationDto[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateNotificationInput {
  gymId: string
  recipientUserId: string
  type: NotificationType
  title: string
  message: string
  entityType?: string | null
  entityId?: string | null
  deduplicationKey?: string | null
}
