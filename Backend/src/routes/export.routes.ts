import { Router } from 'express'
import { Role } from '@prisma/client'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/rbac.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { exportQuerySchema } from '../validators/export.validator.js'
import * as exportController from '../controllers/export.controller.js'

import { exportLimiter } from '../middlewares/rateLimiter.middleware.js'
import { env } from '../config/env.js'

export const exportRouter: Router = Router()

// All export routes require authentication and rate limiting
exportRouter.use(requireAuth)
if (env.NODE_ENV !== 'test') {
  exportRouter.use(exportLimiter)
}

/**
 * GET /api/v1/exports/members
 * Allowed: OWNER, MANAGER, RECEPTIONIST
 */
exportRouter.get(
  '/members',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST),
  validate(exportQuerySchema, 'query'),
  exportController.exportMembers
)

/**
 * GET /api/v1/exports/subscriptions
 * Allowed: OWNER, MANAGER, RECEPTIONIST
 */
exportRouter.get(
  '/subscriptions',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST),
  validate(exportQuerySchema, 'query'),
  exportController.exportSubscriptions
)

/**
 * GET /api/v1/exports/payments
 * Allowed: OWNER, MANAGER (RECEPTIONIST and TRAINER are forbidden)
 */
exportRouter.get(
  '/payments',
  requireRole(Role.OWNER, Role.MANAGER),
  validate(exportQuerySchema, 'query'),
  exportController.exportPayments
)

/**
 * GET /api/v1/exports/attendance
 * Allowed: OWNER, MANAGER, RECEPTIONIST
 */
exportRouter.get(
  '/attendance',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST),
  validate(exportQuerySchema, 'query'),
  exportController.exportAttendance
)

/**
 * GET /api/v1/exports/plans
 * Allowed: OWNER, MANAGER, RECEPTIONIST
 */
exportRouter.get(
  '/plans',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST),
  validate(exportQuerySchema, 'query'),
  exportController.exportPlans
)

/**
 * GET /api/v1/exports/activity-logs
 * Allowed: OWNER, MANAGER (RECEPTIONIST and TRAINER are forbidden)
 */
exportRouter.get(
  '/activity-logs',
  requireRole(Role.OWNER, Role.MANAGER),
  validate(exportQuerySchema, 'query'),
  exportController.exportActivityLogs
)
