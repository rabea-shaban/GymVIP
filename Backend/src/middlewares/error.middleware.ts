import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { AppError } from '../utils/appError.util.js'
import { sendError } from '../utils/response.util.js'
import { logger } from '../utils/logger.util.js'
import { env } from '../config/env.js'

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Always log error details in development/test
  if (env.NODE_ENV !== 'production') {
    logger.error(`[${req.method}] ${req.originalUrl} - Error:`, err)
  }

  // 1. Handle Known Custom App Errors
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.message, err.errors)
    return
  }

  // 2. Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }))

    sendError(
      res,
      400,
      'خطأ في التحقق من صحة البيانات المدخلة / Validation error',
      formattedErrors
    )
    return
  }

  // 3. Handle Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    let message = 'خطأ في عملية قاعدة البيانات / Database operation error'
    let statusCode = 400

    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.['target'] as string[]) || 'الحقل'
        message = `قيمة مكررة في الحقل: ${Array.isArray(target) ? target.join(', ') : target} / Unique constraint violation`
        statusCode = 409
        break
      }
      case 'P2025':
        message = 'السجل المطلوب غير موجود في قاعدة البيانات / Record not found'
        statusCode = 404
        break
      case 'P2003':
        message = 'خطأ في ارتباط البيانات الأجنبية / Foreign key constraint failed'
        statusCode = 400
        break
      default:
        message = 'حدث خطأ في استعلام قاعدة البيانات / Database query error'
        statusCode = 400
        break
    }

    sendError(res, statusCode, message, [
      {
        code: err.code,
        ...(env.NODE_ENV !== 'production' && { meta: err.meta }),
      },
    ])
    return
  }

  // 4. Handle Prisma Initialization / Connection Errors
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    logger.error('Prisma Database Connection Failure:', err.message)
    sendError(
      res,
      503,
      'تعذر الاتصال بقاعدة البيانات حالياً / Database service unavailable',
      env.NODE_ENV !== 'production' ? [{ details: err.message }] : undefined
    )
    return
  }

  // 5. Handle Malformed JSON Body Errors
  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    sendError(res, 400, 'صيغة JSON غير صالحة في جسم الطلب / Invalid JSON payload', [
      {
        message: err.message,
      },
    ])
    return
  }

  // 6. Generic Internal Server Errors (Unknown)
  const fallbackMessage =
    env.NODE_ENV === 'production'
      ? 'حدث خطأ غير متوقع في الخادم / Internal server error'
      : err instanceof Error
        ? err.message
        : 'Unknown server error'

  sendError(
    res,
    500,
    fallbackMessage,
    env.NODE_ENV !== 'production' && err instanceof Error
      ? [{ stack: err.stack }]
      : undefined
  )
}
