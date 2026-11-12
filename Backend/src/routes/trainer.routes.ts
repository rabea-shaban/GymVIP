import { Router } from 'express'
import { Role } from '@prisma/client'
import {
  createTrainerHandler,
  getTrainersHandler,
  getTrainerMeHandler,
  getTrainerByIdHandler,
  updateTrainerHandler,
  updateTrainerStatusHandler,
  deleteTrainerHandler,
} from '../controllers/trainer.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/rbac.middleware.js'
import { validate, validateBody } from '../middlewares/validate.middleware.js'
import {
  createTrainerSchema,
  updateTrainerSchema,
  updateTrainerStatusSchema,
  trainerQuerySchema,
  trainerIdParamSchema,
} from '../validators/trainer.validator.js'

export const trainerRouter: Router = Router()

// All trainer routes require authentication
trainerRouter.use(requireAuth)

// Current trainer's own profile (Role: TRAINER)
trainerRouter.get('/me', requireRole(Role.TRAINER), getTrainerMeHandler)

// List trainers (Roles: OWNER, MANAGER, RECEPTIONIST)
trainerRouter.get(
  '/',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST),
  validate(trainerQuerySchema, 'query'),
  getTrainersHandler
)

// Create trainer (Roles: OWNER, MANAGER)
trainerRouter.post(
  '/',
  requireRole(Role.OWNER, Role.MANAGER),
  validateBody(createTrainerSchema),
  createTrainerHandler
)

// Get trainer details (Roles: OWNER, MANAGER, RECEPTIONIST, TRAINER)
trainerRouter.get(
  '/:id',
  requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST, Role.TRAINER),
  validate(trainerIdParamSchema, 'params'),
  getTrainerByIdHandler
)

// Update trainer (Roles: OWNER, MANAGER)
trainerRouter.patch(
  '/:id',
  requireRole(Role.OWNER, Role.MANAGER),
  validate(trainerIdParamSchema, 'params'),
  validateBody(updateTrainerSchema),
  updateTrainerHandler
)

// Activate or deactivate trainer (Roles: OWNER, MANAGER)
trainerRouter.patch(
  '/:id/status',
  requireRole(Role.OWNER, Role.MANAGER),
  validate(trainerIdParamSchema, 'params'),
  validateBody(updateTrainerStatusSchema),
  updateTrainerStatusHandler
)

// Delete trainer (Roles: OWNER, MANAGER)
trainerRouter.delete(
  '/:id',
  requireRole(Role.OWNER, Role.MANAGER),
  validate(trainerIdParamSchema, 'params'),
  deleteTrainerHandler
)

export default trainerRouter
