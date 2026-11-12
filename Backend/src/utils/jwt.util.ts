import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import type { AuthTokenPayload } from '../types/auth.types.js'
import { AppError } from './appError.util.js'

export const generateAuthToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload
    if (!decoded.sub || !decoded.gymId || !decoded.role) {
      throw AppError.unauthorized('رمز المصادقة غير صالح / Invalid token payload')
    }
    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً / Token expired')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw AppError.unauthorized('رمز المصادقة غير صالح أو تالف / Invalid token signature')
    }
    throw error
  }
}
