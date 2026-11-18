import type { Request, Response, NextFunction } from 'express'
import {
  registerGymAndOwner,
  loginUser,
  getCurrentUserProfile,
  updateUserProfile,
} from '../services/auth.service.js'
import { setAuthCookie, clearAuthCookie } from '../utils/cookie.util.js'
import { sendSuccess } from '../utils/response.util.js'
import type { RegisterInput, LoginInput } from '../validators/auth.validator.js'

/**
 * Handles POST /api/v1/auth/register
 * Creates Gym + OWNER user, sets HTTPOnly cookie, returns safe profile
 */
export const register = async (
  req: Request<unknown, unknown, RegisterInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user, gym, token } = await registerGymAndOwner(req.body)

    // Set secure HTTPOnly cookie
    setAuthCookie(res, token)

    // Return authenticated profile and token
    sendSuccess(
      res,
      201,
      'تم إنشاء حساب النادي الرياضي والمالك بنجاح / Gym and owner created successfully',
      { user, gym, token }
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Handles POST /api/v1/auth/login
 * Validates credentials, sets HTTPOnly cookie, returns safe profile
 */
export const login = async (
  req: Request<unknown, unknown, LoginInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user, gym, token } = await loginUser(req.body)

    // Set secure HTTPOnly cookie
    setAuthCookie(res, token)

    // Return authenticated profile and token
    sendSuccess(res, 200, 'تم تسجيل الدخول بنجاح / Logged in successfully', {
      user,
      gym,
      token,
    })
  } catch (error) {
    next(error)
  }
}

import { createAuditLog } from '../services/audit.service.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../types/audit.types.js'

/**
 * Handles POST /api/v1/auth/logout
 * Clears the HTTPOnly session cookie
 */
export const logout = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  if (req.user) {
    await createAuditLog({
      gymId: req.user.gymId,
      actorUserId: req.user.id,
      action: AUDIT_ACTIONS.LOGOUT,
      entityType: AUDIT_ENTITY_TYPES.AUTH,
      entityId: req.user.id,
      description: `تسجيل خروج للمستخدم (${req.user.name ?? req.user.id})`,
    })
  }
  clearAuthCookie(res)
  sendSuccess(res, 200, 'تم تسجيل الخروج بنجاح')
}

/**
 * Handles GET /api/v1/auth/me
 * Returns the currently authenticated user and gym profile
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id
    const profile = await getCurrentUserProfile(userId)

    sendSuccess(res, 200, 'Authenticated user', profile)
  } catch (error) {
    next(error)
  }
}

/**
 * Handles PATCH /api/v1/auth/profile
 * Updates the current user's profile information (name, phone, avatar)
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id
    const { name, phone, avatarUrl } = req.body
    const updated = await updateUserProfile(userId, { name, phone, avatarUrl })
    sendSuccess(res, 200, 'تم تحديث الملف الشخصي بنجاح / Profile updated successfully', updated)
  } catch (error) {
    next(error)
  }
}
