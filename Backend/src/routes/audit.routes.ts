import { Router } from 'express'
import { Role } from '@prisma/client'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/rbac.middleware.js'
import * as auditController from '../controllers/audit.controller.js'

export const auditRouter: Router = Router()

// All activity log routes require authentication and OWNER or MANAGER role
auditRouter.use(requireAuth)
auditRouter.use(requireRole(Role.OWNER, Role.MANAGER))

/**
 * GET /api/v1/activity-logs
 * List paginated activity / audit trail
 */
auditRouter.get('/', auditController.listAuditLogs)

/**
 * GET /api/v1/activity-logs/:id
 * Retrieve details for a single activity log entry
 */
auditRouter.get('/:id', auditController.getAuditLog)
