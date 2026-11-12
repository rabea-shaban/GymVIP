import { PrismaClient } from '@prisma/client'
import { env } from './env.js'
import { logger } from '../utils/logger.util.js'

// Declare global type for development singleton caching
const globalForPrisma = globalThis as unknown as {
  prismaGlobal?: PrismaClient
}

const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })
}

export const prisma: PrismaClient =
  globalForPrisma.prismaGlobal ?? createPrismaClient()

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prismaGlobal = prisma
}

/**
 * Verifies if database connection is alive and healthy
 */
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    // Fast lightweight raw query to test MySQL connectivity
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    logger.error('Database connection verification failed:', error)
    return false
  }
}

/**
 * Gracefully disconnects Prisma client
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect()
    logger.info('Database disconnected cleanly.')
  } catch (error) {
    logger.error('Error disconnecting database:', error)
  }
}
