import type { Request, Response, NextFunction } from 'express'
import { sendSuccess, sendError } from '../utils/response.util.js'
import {
  getSystemHealthInfo,
  checkDatabaseHealthStatus,
} from '../services/health.service.js'

/**
 * Handles GET /api/v1/health
 * Returns API operational status and current environment
 */
export const getHealth = (
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const healthData = getSystemHealthInfo()

  sendSuccess(res, 200, 'GymVIP API is running', {
    environment: healthData.environment,
  })
}

/**
 * Handles GET /api/v1/health/database
 * Verifies that Prisma can successfully communicate with MySQL
 */
export const getDatabaseHealth = async (
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const { isHealthy, message } = await checkDatabaseHealthStatus()

  if (isHealthy) {
    sendSuccess(res, 200, message)
    return
  }

  sendError(res, 503, message, [
    {
      service: 'MySQL Database',
      status: 'DISCONNECTED',
      tip: 'Please ensure MySQL server is running and DATABASE_URL is properly configured.',
    },
  ])
}
