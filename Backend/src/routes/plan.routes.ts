import { Router } from 'express'
import { Role } from '@prisma/client'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/rbac.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  createPlanSchema,
  updatePlanSchema,
  updatePlanStatusSchema,
  planQuerySchema,
} from '../validators/plan.validator.js'
import * as planController from '../controllers/plan.controller.js'

export const planRouter: Router = Router()

// All plan routes require authentication
planRouter.use(requireAuth)

/**
 * GET /api/v1/plans
 * OWNER, MANAGER, RECEPTIONIST, TRAINER
 */
planRouter.get(
  '/',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST, Role.TRAINER),
  validate(planQuerySchema, 'query'),
  planController.listPlans
)

/**
 * GET /api/v1/plans/:id
 * OWNER, MANAGER, RECEPTIONIST, TRAINER
 */
planRouter.get(
  '/:id',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST, Role.TRAINER),
  planController.getPlan
)

/**
 * POST /api/v1/plans
 * OWNER, MANAGER (RECEPTIONIST & TRAINER not allowed)
 */
planRouter.post(
  '/',
  requireRole(Role.OWNER, Role.MANAGER),
  validate(createPlanSchema),
  planController.createPlan
)

/**
 * PATCH /api/v1/plans/:id
 * OWNER, MANAGER (RECEPTIONIST & TRAINER not allowed)
 */
planRouter.patch(
  '/:id',
  requireRole(Role.OWNER, Role.MANAGER),
  validate(updatePlanSchema),
  planController.updatePlan
)

/**
 * PATCH /api/v1/plans/:id/status
 * OWNER, MANAGER (RECEPTIONIST & TRAINER not allowed)
 */
planRouter.patch(
  '/:id/status',
  requireRole(Role.OWNER, Role.MANAGER),
  validate(updatePlanStatusSchema),
  planController.updatePlanStatus
)

/**
 * DELETE /api/v1/plans/:id
 * OWNER, MANAGER
 */
planRouter.delete(
  '/:id',
  requireRole(Role.OWNER, Role.MANAGER),
  planController.deletePlan
)

