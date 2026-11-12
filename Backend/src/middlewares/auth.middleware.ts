import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database.js'
import { AppError } from '../utils/appError.util.js'
import { verifyAuthToken } from '../utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../utils/cookie.util.js'

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Extract token from HTTPOnly cookie or Bearer authorization header fallback
    let token = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      throw AppError.unauthorized(
        'يرجى تسجيل الدخول للوصول إلى هذه الخدمة / Authentication token missing'
      )
    }

    // 2. Verify token signature and payload
    const decoded = verifyAuthToken(token)

    // 3. Load user from database to verify active status and gym status
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        gymId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        gym: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    })

    if (!user) {
      throw AppError.unauthorized(
        'المستخدم المرتبط بهذا الحساب لم يعد موجوداً / User no longer exists'
      )
    }

    // 4. Verify user status
    if (!user.isActive) {
      throw AppError.forbidden(
        'تم تعطيل هذا الحساب مؤقتاً، يرجى التواصل مع إدارة النظام / Account disabled'
      )
    }

    // 5. Verify gym status
    if (!user.gym.isActive) {
      throw AppError.forbidden(
        'اشتراك النادي الرياضي معطل أو غير نشط / Gym account is inactive'
      )
    }

    // 6. Attach authoritative user context to Express request
    req.user = {
      id: user.id,
      gymId: user.gymId,
      name: user.name,
      email: user.email,
      role: user.role,
    }

    next()
  } catch (error) {
    next(error)
  }
}
