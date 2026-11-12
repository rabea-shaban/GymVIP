import { env } from '../config/env.js'
import { checkDatabaseConnection } from '../config/database.js'
import type { HealthCheckData } from '../types/api.types.js'

export const getSystemHealthInfo = (): HealthCheckData => {
  return {
    environment: env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }
}

export const checkDatabaseHealthStatus = async (): Promise<{
  isHealthy: boolean
  message: string
}> => {
  const isConnected = await checkDatabaseConnection()

  if (isConnected) {
    return {
      isHealthy: true,
      message: 'Database connection is healthy',
    }
  }

  return {
    isHealthy: false,
    message: 'Database connection is unavailable or unreachable',
  }
}
