import type { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/response.util.js'

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  sendError(
    res,
    404,
    `المسار المطلوب غير موجود / Cannot ${req.method} ${req.originalUrl}`,
    [
      {
        path: req.originalUrl,
        method: req.method,
        suggestion: 'Please check the requested URL and API version (/api/v1).',
      },
    ]
  )
}
