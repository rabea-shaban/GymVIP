import { Router } from 'express'
import { Role } from '@prisma/client'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/rbac.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { reportDateFilterSchema } from '../validators/report.validator.js'
import * as reportController from '../controllers/report.controller.js'

import { reportLimiter } from '../middlewares/rateLimiter.middleware.js'
import { env } from '../config/env.js'

export const reportRouter: Router = Router()

// All report routes require authentication and rate limiting
reportRouter.use(requireAuth)
if (env.NODE_ENV !== 'test') {
  reportRouter.use(reportLimiter)
}

/**
 * GET /api/v1/reports/summary
 */
reportRouter.get(
  '/summary',
  validate(reportDateFilterSchema, 'query'),
  reportController.getSummary
)

/**
 * GET /api/v1/reports/members
 */
reportRouter.get(
  '/members',
  validate(reportDateFilterSchema, 'query'),
  reportController.getMembers
)

/**
 * GET /api/v1/reports/subscriptions
 */
reportRouter.get(
  '/subscriptions',
  validate(reportDateFilterSchema, 'query'),
  reportController.getSubscriptions
)

/**
 * GET /api/v1/reports/attendance
 */
reportRouter.get(
  '/attendance',
  validate(reportDateFilterSchema, 'query'),
  reportController.getAttendance
)

/**
 * GET /api/v1/reports/payments (OWNER & MANAGER only)
 */
reportRouter.get(
  '/payments',
  requireRole(Role.OWNER, Role.MANAGER),
  validate(reportDateFilterSchema, 'query'),
  reportController.getPayments
)
