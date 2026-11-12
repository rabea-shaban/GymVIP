import { Router } from 'express'
import { Role } from '@prisma/client'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/rbac.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  createSubscriptionSchema,
  subscriptionQuerySchema,
  subscriptionIdParamSchema,
  freezeSubscriptionSchema,
  renewSubscriptionSchema,
  cancelSubscriptionSchema,
} from '../validators/subscription.validator.js'
import * as subscriptionController from '../controllers/subscription.controller.js'
import * as paymentController from '../controllers/payment.controller.js'

export const subscriptionRouter: Router = Router()

// All subscription routes require authentication
subscriptionRouter.use(requireAuth)

/**
 * POST /api/v1/subscriptions
 * Allowed: OWNER, MANAGER, RECEPTIONIST (TRAINER cannot create subscriptions)
 */
subscriptionRouter.post(
  '/',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST),
  validate(createSubscriptionSchema, 'body'),
  subscriptionController.create
)

/**
 * GET /api/v1/subscriptions
 * Allowed: OWNER, MANAGER, RECEPTIONIST, TRAINER
 */
subscriptionRouter.get(
  '/',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST, Role.TRAINER),
  validate(subscriptionQuerySchema, 'query'),
  subscriptionController.list
)

/**
 * POST /api/v1/subscriptions/:id/freeze
 * Allowed: OWNER, MANAGER, RECEPTIONIST (TRAINER cannot freeze)
 */
subscriptionRouter.post(
  '/:id/freeze',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST),
  validate(subscriptionIdParamSchema, 'params'),
  validate(freezeSubscriptionSchema, 'body'),
  subscriptionController.freeze
)

/**
 * GET /api/v1/subscriptions/:id/freezes
 * Allowed: OWNER, MANAGER, RECEPTIONIST, TRAINER
 */
subscriptionRouter.get(
  '/:id/freezes',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST, Role.TRAINER),
  validate(subscriptionIdParamSchema, 'params'),
  subscriptionController.getFreezes
)

/**
 * POST /api/v1/subscriptions/:id/renew
 * Allowed: OWNER, MANAGER, RECEPTIONIST (TRAINER cannot renew)
 */
subscriptionRouter.post(
  '/:id/renew',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST),
  validate(subscriptionIdParamSchema, 'params'),
  validate(renewSubscriptionSchema, 'body'),
  subscriptionController.renew
)

/**
 * POST /api/v1/subscriptions/:id/cancel
 * Allowed: OWNER, MANAGER ONLY (RECEPTIONIST and TRAINER are strictly 403 Forbidden)
 */
subscriptionRouter.post(
  '/:id/cancel',
  requireRole(Role.OWNER, Role.MANAGER),
  validate(subscriptionIdParamSchema, 'params'),
  validate(cancelSubscriptionSchema, 'body'),
  subscriptionController.cancel
)

/**
 * GET /api/v1/subscriptions/:subscriptionId/payments
 * Allowed: OWNER, MANAGER, RECEPTIONIST (TRAINER cannot access financial data)
 */
subscriptionRouter.get(
  '/:subscriptionId/payments',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST),
  paymentController.getSubscriptionPayments
)

/**
 * GET /api/v1/subscriptions/:id
 * Allowed: OWNER, MANAGER, RECEPTIONIST, TRAINER
 */
subscriptionRouter.get(
  '/:id',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST, Role.TRAINER),
  validate(subscriptionIdParamSchema, 'params'),
  subscriptionController.getById
)

