import { Router } from 'express'
import { Role } from '@prisma/client'
import {
  getProfile,
  getSetupStatus,
  completeSetup,
  updateSettings,
  updateStatus,
} from '../controllers/gym.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/rbac.middleware.js'
import { validateBody } from '../middlewares/validate.middleware.js'
import {
  gymSetupSchema,
  updateGymSchema,
  updateGymStatusSchema,
} from '../validators/gym.validator.js'

export const gymRouter: Router = Router()

// All gym routes require authentication
gymRouter.use(requireAuth)

// Get full gym profile (All authenticated staff roles)
gymRouter.get('/', getProfile)

// Get gym setup status (All authenticated staff roles)
gymRouter.get('/setup-status', getSetupStatus)

// Complete initial gym setup (OWNER, MANAGER)
gymRouter.patch(
  '/setup',
  requireRole(Role.OWNER, Role.MANAGER),
  validateBody(gymSetupSchema),
  completeSetup
)

// Update gym settings (OWNER, MANAGER)
gymRouter.patch(
  '/',
  requireRole(Role.OWNER, Role.MANAGER),
  validateBody(updateGymSchema),
  updateSettings
)

// Update gym operational status (OWNER only)
gymRouter.patch(
  '/status',
  requireRole(Role.OWNER),
  validateBody(updateGymStatusSchema),
  updateStatus
)
