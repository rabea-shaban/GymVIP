import { Router } from 'express'
import { Role } from '@prisma/client'
import {
  getUsers,
  getUser,
  create,
  update,
  updateStatus,
  resetPassword,
  deleteUserHandler,
} from '../controllers/user.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/rbac.middleware.js'
import { validateBody } from '../middlewares/validate.middleware.js'
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  resetUserPasswordSchema,
} from '../validators/user.validator.js'

export const userRouter: Router = Router()

// All user management routes require authentication and OWNER/MANAGER privileges
userRouter.use(requireAuth)
userRouter.use(requireRole(Role.OWNER, Role.MANAGER))

// List users with search and filters
userRouter.get('/', getUsers)

// Get single user details
userRouter.get('/:id', getUser)

// Create a new staff user
userRouter.post('/', validateBody(createUserSchema), create)

// Update user details and role
userRouter.patch('/:id', validateBody(updateUserSchema), update)

// Activate or deactivate user
userRouter.patch(
  '/:id/status',
  validateBody(updateUserStatusSchema),
  updateStatus
)

// Admin reset password
userRouter.patch(
  '/:id/password',
  validateBody(resetUserPasswordSchema),
  resetPassword
)

// Delete user (OWNER / MANAGER)
userRouter.delete('/:id', deleteUserHandler)
