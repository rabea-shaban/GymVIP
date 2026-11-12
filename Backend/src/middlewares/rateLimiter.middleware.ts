import rateLimit, { type Options } from 'express-rate-limit'
import type { Request, Response } from 'express'
import { sendError } from '../utils/response.util.js'

/**
 * Standard factory for rate limiters with unified GymVIP error response
 */
function createRateLimiter(options: Partial<Options>) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      sendError(
        res,
        429,
        options.message
          ? String(options.message)
          : 'تم تجاوز الحد الأقصى للطلبات المسموح بها، يرجى المحاولة بعد قليل / Too many requests, please try again later'
      )
    },
    ...options,
  })
}

/**
 * Global API rate limiter:
 * 1000 requests per 15 minutes per IP (generous for operational gym usage)
 */
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'تم تجاوز الحد الأقصى للطلبات العامة للنظام، يرجى المحاولة بعد قليل / Too many requests',
})

/**
 * Public authentication rate limiter (Login):
 * 15 login attempts per 15 minutes per IP to mitigate credential stuffing & brute-force
 */
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول، يرجى الانتظار 15 دقيقة قبل المحاولة مجدداً / Too many login attempts',
})

/**
 * Registration rate limiter:
 * 5 registrations per hour per IP to prevent spam gym creations
 */
export const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'تم تجاوز الحد الأقصى لمحاولات التسجيل من هذا الجهاز، يرجى المحاولة لاحقاً / Too many registration attempts',
})

/**
 * Data export rate limiter:
 * 30 export requests per 15 minutes per IP to protect server memory and CPU
 */
export const exportLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'تم تجاوز الحد الأقصى لعمليات تصدير البيانات، يرجى المحاولة بعد قليل / Too many export requests',
})

/**
 * Reporting & Dashboard rate limiter:
 * 60 requests per 5 minutes per IP for expensive analytical queries
 */
export const reportLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: 'تم تجاوز الحد الأقصى لطلب التقارير، يرجى الانتظار دقيقة والمحاولة مجدداً / Too many report requests',
})
