import { Router } from 'express'
import { Role } from '@prisma/client'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/rbac.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  createMemberSchema,
  updateMemberSchema,
  updateMemberStatusSchema,
  memberQuerySchema,
} from '../validators/member.validator.js'
import { memberIdParamSchema } from '../validators/attendance.validator.js'
import * as memberController from '../controllers/member.controller.js'
import * as subscriptionController from '../controllers/subscription.controller.js'
import * as paymentController from '../controllers/payment.controller.js'
import * as attendanceController from '../controllers/attendance.controller.js'

export const memberRouter: Router = Router()

// All member routes require authentication
memberRouter.use(requireAuth)

/**
 * GET /api/v1/members
 * OWNER, MANAGER, RECEPTIONIST, TRAINER
 */
memberRouter.get(
  '/',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST, Role.TRAINER),
  validate(memberQuerySchema, 'query'),
  memberController.listMembers
)

/**
 * GET /api/v1/members/:memberId/subscriptions/current
 * OWNER, MANAGER, RECEPTIONIST, TRAINER
 */
memberRouter.get(
  '/:memberId/subscriptions/current',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST, Role.TRAINER),
  subscriptionController.getMemberCurrent
)

/**
 * GET /api/v1/members/:memberId/subscriptions
 * OWNER, MANAGER, RECEPTIONIST, TRAINER
 */
memberRouter.get(
  '/:memberId/subscriptions',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST, Role.TRAINER),
  subscriptionController.getMemberSubscriptions
)

/**
 * GET /api/v1/members/:memberId/payments
 * OWNER, MANAGER, RECEPTIONIST (TRAINER cannot access financial data)
 */
memberRouter.get(
  '/:memberId/payments',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST),
  paymentController.getMemberPayments
)

/**
 * GET /api/v1/members/:memberId/attendance/current
 * OWNER, MANAGER, RECEPTIONIST, TRAINER
 */
memberRouter.get(
  '/:memberId/attendance/current',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST, Role.TRAINER),
  validate(memberIdParamSchema, 'params'),
  attendanceController.getMemberCurrent
)

/**
 * GET /api/v1/members/:memberId/attendance
 * OWNER, MANAGER, RECEPTIONIST, TRAINER
 */
memberRouter.get(
  '/:memberId/attendance',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST, Role.TRAINER),
  validate(memberIdParamSchema, 'params'),
  attendanceController.getMemberHistory
)

/**
 * POST /api/v1/members/:memberId/check-out
 * OWNER, MANAGER, RECEPTIONIST, TRAINER
 */
memberRouter.post(
  '/:memberId/check-out',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST, Role.TRAINER),
  validate(memberIdParamSchema, 'params'),
  attendanceController.checkOutByMember
)

/**
 * GET /api/v1/members/:id
 * OWNER, MANAGER, RECEPTIONIST, TRAINER
 */
memberRouter.get(
  '/:id',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST, Role.TRAINER),
  memberController.getMember
)

/**
 * POST /api/v1/members
 * OWNER, MANAGER, RECEPTIONIST (TRAINER not allowed)
 */
memberRouter.post(
  '/',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST),
  validate(createMemberSchema),
  memberController.createMember
)

/**
 * PATCH /api/v1/members/:id
 * OWNER, MANAGER, RECEPTIONIST (TRAINER not allowed)
 */
memberRouter.patch(
  '/:id',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST),
  validate(updateMemberSchema),
  memberController.updateMember
)

/**
 * PATCH /api/v1/members/:id/status
 * OWNER, MANAGER, RECEPTIONIST (TRAINER not allowed)
 */
memberRouter.patch(
  '/:id/status',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST),
  validate(updateMemberStatusSchema),
  memberController.updateMemberStatus
)

