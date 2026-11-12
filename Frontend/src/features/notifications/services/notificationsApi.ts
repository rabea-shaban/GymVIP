import { api } from '@/services/api'
import type {
  NotificationItem,
  NotificationListResponse,
  NotificationFilterParams,
  UnreadCountResponse,
} from '../types/notification.types'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  errors?: unknown[]
}

export const notificationsApi = {
  /**
   * GET /api/v1/notifications
   * List notifications for the authenticated user
   */
  list: async (params?: NotificationFilterParams): Promise<NotificationListResponse> => {
    const response = await api.get<ApiResponse<NotificationListResponse>>('/notifications', {
      params,
    })
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch notifications')
    }
    return response.data.data
  },

  /**
   * GET /api/v1/notifications/unread-count
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await api.get<ApiResponse<UnreadCountResponse>>('/notifications/unread-count')
    return response.data.data || { unreadCount: 0 }
  },

  /**
   * PATCH /api/v1/notifications/:id/read
   * Mark a single notification as read
   */
  markAsRead: async (id: string): Promise<NotificationItem> => {
    const response = await api.patch<ApiResponse<{ notification: NotificationItem }>>(
      `/notifications/${id}/read`
    )
    if (!response.data.data?.notification) {
      throw new Error(response.data.message || 'Failed to mark notification as read')
    }
    return response.data.data.notification
  },

  /**
   * PATCH /api/v1/notifications/read-all
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<{ updatedCount: number }> => {
    const response = await api.patch<ApiResponse<{ updatedCount: number }>>(
      '/notifications/read-all'
    )
    return response.data.data || { updatedCount: 0 }
  },
}

export default notificationsApi
