import { Router } from 'express'
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
} from '../controllers/auth.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { validateBody } from '../middlewares/validate.middleware.js'
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from '../validators/auth.validator.js'
import {
  loginLimiter,
  registerLimiter,
} from '../middlewares/rateLimiter.middleware.js'
import { env } from '../config/env.js'

export const authRouter: Router = Router()

// Public authentication routes with rate limiting
const applyRegisterLimiter = env.NODE_ENV !== 'test' ? [registerLimiter] : []
const applyLoginLimiter = env.NODE_ENV !== 'test' ? [loginLimiter] : []

authRouter.post('/register', ...applyRegisterLimiter, validateBody(registerSchema), register)
authRouter.post('/login', ...applyLoginLimiter, validateBody(loginSchema), login)
authRouter.post('/logout', logout)

// Protected authentication routes
authRouter.get('/me', requireAuth, getMe)
authRouter.patch('/profile', requireAuth, validateBody(updateProfileSchema), updateProfile)
