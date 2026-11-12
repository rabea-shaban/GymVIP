export type NotificationType =
  | 'SUBSCRIPTION_EXPIRING'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_RENEWED'
  | 'SUBSCRIPTION_FROZEN'
  | 'PAYMENT_RECEIVED'

export interface NotificationItem {
  id: string
  gymId: string
  recipientUserId: string
  type: NotificationType
  title: string
  message: string
  entityType?: string | null
  entityId?: string | null
  isRead: boolean
  readAt?: string | null
  deduplicationKey?: string | null
  createdAt: string
}

export interface NotificationPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface NotificationListResponse {
  notifications: NotificationItem[]
  pagination: NotificationPagination
}

export interface NotificationFilterParams {
  isRead?: boolean
  type?: NotificationType
  page?: number
  limit?: number
}

export interface UnreadCountResponse {
  unreadCount: number
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  SUBSCRIPTION_EXPIRING: 'اشتراك على وشك الانتهاء',
  SUBSCRIPTION_EXPIRED: 'انتهاء اشتراك',
  SUBSCRIPTION_RENEWED: 'تجديد اشتراك',
  SUBSCRIPTION_FROZEN: 'تجميد اشتراك',
  PAYMENT_RECEIVED: 'تسجيل دفعة جديدة',
}
