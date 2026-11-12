import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../utils/response.util.js'
import * as notificationService from '../services/notification.service.js'
import type { NotificationFilterParams } from '../types/notification.types.js'

/**
 * GET /api/v1/notifications
 * Lists notifications for the authenticated user
 */
export async function getNotifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const userId = req.user!.id
    const filters = req.query as unknown as NotificationFilterParams

    const result = await notificationService.listNotifications(gymId, userId, filters)
    sendSuccess(res, 200, 'تم جلب الإشعارات بنجاح / Notifications retrieved successfully', result)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/notifications/unread-count
 * Gets unread count for the authenticated user
 */
export async function getUnreadCount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const userId = req.user!.id

    const result = await notificationService.getUnreadCount(gymId, userId)
    sendSuccess(res, 200, 'تم جلب عدد الإشعارات غير المقروءة / Unread count retrieved', result)
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/v1/notifications/:id/read
 * Marks a single notification as read
 */
export async function markAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const userId = req.user!.id
    const id = req.params.id as string

    const notification = await notificationService.markAsRead(gymId, userId, id)
    sendSuccess(res, 200, 'تم تحديد الإشعار كمقروء / Notification marked as read', { notification })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/v1/notifications/read-all
 * Marks all notifications for the authenticated user as read
 */
export async function markAllAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const userId = req.user!.id

    const result = await notificationService.markAllAsRead(gymId, userId)
    sendSuccess(res, 200, 'تم تحديد جميع الإشعارات كمقروءة / All notifications marked as read', result)
  } catch (error) {
    next(error)
  }
}
