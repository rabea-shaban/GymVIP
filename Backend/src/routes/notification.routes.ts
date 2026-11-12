import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  notificationFilterSchema,
  notificationIdParamSchema,
} from '../validators/notification.validator.js'
import * as notificationController from '../controllers/notification.controller.js'

export const notificationRouter: Router = Router()

// All notification routes require authentication
notificationRouter.use(requireAuth)

/**
 * GET /api/v1/notifications
 * List notifications for the authenticated user
 */
notificationRouter.get(
  '/',
  validate(notificationFilterSchema, 'query'),
  notificationController.getNotifications
)

/**
 * GET /api/v1/notifications/unread-count
 * Get unread notification count
 */
notificationRouter.get(
  '/unread-count',
  notificationController.getUnreadCount
)

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all notifications as read
 */
notificationRouter.patch(
  '/read-all',
  notificationController.markAllAsRead
)

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a specific notification as read
 */
notificationRouter.patch(
  '/:id/read',
  validate(notificationIdParamSchema, 'params'),
  notificationController.markAsRead
)
