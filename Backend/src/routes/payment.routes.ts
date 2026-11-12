import { Router } from 'express'
import { Role } from '@prisma/client'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/rbac.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  createPaymentSchema,
  paymentQuerySchema,
  paymentIdParamSchema,
} from '../validators/payment.validator.js'
import * as paymentController from '../controllers/payment.controller.js'

export const paymentRouter: Router = Router()

// All payment routes require authentication
paymentRouter.use(requireAuth)

// TRAINER role is forbidden from accessing payments in V1
const allowedPaymentRoles = [Role.OWNER, Role.MANAGER, Role.RECEPTIONIST]

/**
 * POST /api/v1/payments
 * Create a new payment record
 */
paymentRouter.post(
  '/',
  requireRole(...allowedPaymentRoles),
  validate(createPaymentSchema, 'body'),
  paymentController.createPayment
)

/**
 * GET /api/v1/payments
 * List payments with filters & search
 */
paymentRouter.get(
  '/',
  requireRole(...allowedPaymentRoles),
  validate(paymentQuerySchema, 'query'),
  paymentController.listPayments
)

/**
 * GET /api/v1/payments/:id
 * Get single payment details with receipt data
 */
paymentRouter.get(
  '/:id',
  requireRole(...allowedPaymentRoles),
  validate(paymentIdParamSchema, 'params'),
  paymentController.getPayment
)
