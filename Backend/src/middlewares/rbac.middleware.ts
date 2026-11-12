import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { Role } from '@prisma/client'
import { AppError } from '../utils/appError.util.js'

/**
 * Middleware that restricts route access to specified roles
 * Usage: requireRole(Role.OWNER), requireRole(Role.OWNER, Role.MANAGER)
 */
export const requireRole = (...allowedRoles: Role[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized('يرجى تسجيل الدخول أولاً / Authentication required'))
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(AppError.forbidden('ليس لديك صلاحية لتنفيذ هذا الإجراء'))
      return
    }

    next()
  }
}
