export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly errors?: unknown[]

  constructor(message: string, statusCode = 500, errors?: unknown[], isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.errors = errors

    Object.setPrototypeOf(this, new.target.prototype)
    Error.captureStackTrace(this, this.constructor)
  }

  static badRequest(message = 'بيانات الطلب غير صالحة / Bad request', errors?: unknown[]): AppError {
    return new AppError(message, 400, errors)
  }

  static unauthorized(message = 'غير مصرح بالوصول / Unauthorized', errors?: unknown[]): AppError {
    return new AppError(message, 401, errors)
  }

  static forbidden(message = 'ليس لديك صلاحية لتنفيذ هذا الإجراء / Forbidden', errors?: unknown[]): AppError {
    return new AppError(message, 403, errors)
  }

  static notFound(message = 'المورد المطلوب غير موجود / Resource not found', errors?: unknown[]): AppError {
    return new AppError(message, 404, errors)
  }

  static conflict(message = 'تعارض في البيانات المدخلة / Resource conflict', errors?: unknown[]): AppError {
    return new AppError(message, 409, errors)
  }

  static internal(message = 'حدث خطأ غير متوقع في الخادم / Internal server error', errors?: unknown[]): AppError {
    return new AppError(message, 500, errors, false)
  }

  static serviceUnavailable(message = 'الخدمة غير متوفرة حالياً / Service unavailable', errors?: unknown[]): AppError {
    return new AppError(message, 503, errors)
  }
}
