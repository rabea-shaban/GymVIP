import type { Response } from 'express'
import type { ApiResponse } from '../types/api.types.js'

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  meta?: Record<string, unknown>
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta !== undefined && { meta }),
  }

  return res.status(statusCode).json(payload)
}

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  errors?: unknown[]
): Response => {
  const payload: ApiResponse = {
    success: false,
    message,
    ...(errors !== undefined && { errors }),
  }

  return res.status(statusCode).json(payload)
}
