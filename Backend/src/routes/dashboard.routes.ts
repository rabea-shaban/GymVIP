import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import * as dashboardController from '../controllers/dashboard.controller.js'

import { reportLimiter } from '../middlewares/rateLimiter.middleware.js'
import { env } from '../config/env.js'

export const dashboardRouter: Router = Router()

// All dashboard routes require authentication and rate limiting
dashboardRouter.use(requireAuth)
if (env.NODE_ENV !== 'test') {
  dashboardRouter.use(reportLimiter)
}

/**
 * GET /api/v1/dashboard/overview
 */
dashboardRouter.get(
  '/overview',
  dashboardController.getOverview
)
