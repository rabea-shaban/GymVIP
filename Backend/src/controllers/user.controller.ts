import type { Request, Response, NextFunction } from 'express'
import {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  resetUserPassword,
  deleteUser,
} from '../services/user.service.js'
import { sendSuccess } from '../utils/response.util.js'
import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  ResetUserPasswordInput,
  UserQueryParams,
} from '../validators/user.validator.js'

/**
 * Handles GET /api/v1/users
 * Lists staff users for the authenticated gym with filtering and search
 */
export const getUsers = async (
  req: Request<unknown, unknown, unknown, UserQueryParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await listUsers(req.user!, req.query)
    sendSuccess(res, 200, 'Users retrieved successfully', result)
  } catch (error) {
    next(error)
  }
}

/**
 * Handles GET /api/v1/users/:id
 * Retrieves details of a specific user
 */
export const getUser = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getUserById(req.user!, req.params.id)
    sendSuccess(res, 200, 'User retrieved successfully', { user })
  } catch (error) {
    next(error)
  }
}

/**
 * Handles POST /api/v1/users
 * Creates a new staff member (OWNER, MANAGER)
 */
export const create = async (
  req: Request<unknown, unknown, CreateUserInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await createUser(req.user!, req.body)
    sendSuccess(res, 201, 'تم إنشاء المستخدم بنجاح', { user })
  } catch (error) {
    next(error)
  }
}

/**
 * Handles PATCH /api/v1/users/:id
 * Updates staff member profile and role
 */
export const update = async (
  req: Request<{ id: string }, unknown, UpdateUserInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await updateUser(req.user!, req.params.id, req.body)
    sendSuccess(res, 200, 'تم تحديث بيانات المستخدم بنجاح', { user })
  } catch (error) {
    next(error)
  }
}

/**
 * Handles PATCH /api/v1/users/:id/status
 * Activates or deactivates a staff member
 */
export const updateStatus = async (
  req: Request<{ id: string }, unknown, UpdateUserStatusInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await updateUserStatus(
      req.user!,
      req.params.id,
      req.body.isActive
    )
    sendSuccess(res, 200, 'تم تحديث حالة الحساب بنجاح', { user })
  } catch (error) {
    next(error)
  }
}

/**
 * Handles PATCH /api/v1/users/:id/password
 * Resets a staff member's password by an authorized admin
 */
export const resetPassword = async (
  req: Request<{ id: string }, unknown, ResetUserPasswordInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await resetUserPassword(req.user!, req.params.id, req.body.newPassword)
    sendSuccess(res, 200, 'تم إعادة تعيين كلمة المرور بنجاح')
  } catch (error) {
    next(error)
  }
}

/**
 * Handles DELETE /api/v1/users/:id
 * Deletes a staff user if there are no referential blocks
 */
export const deleteUserHandler = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await deleteUser(req.user!, req.params.id)
    sendSuccess(res, 200, 'تم حذف المستخدم بنجاح')
  } catch (error) {
    next(error)
  }
}
