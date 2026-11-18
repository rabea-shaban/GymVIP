import http from 'http'
import { app } from './app.js'
import { env } from './config/env.js'
import { logger } from './utils/logger.util.js'
import { disconnectDatabase } from './config/database.js'
import { initScheduler, stopScheduler } from './jobs/scheduler.job.js'
import { initSocketServer } from './services/socket.service.js'
import { initAutoBackupScheduler } from './services/backup.service.js'

let server: http.Server | null = null

const startServer = (): void => {
  const PORT = env.PORT

  server = http.createServer(app)

  // Initialize Real-time WebSockets
  initSocketServer(server)

  server.listen(PORT, () => {
    logger.info(`🚀 GymVIP SaaS Backend running on http://localhost:${PORT}`)
    logger.info(`🌍 Environment: ${env.NODE_ENV}`)
    logger.info(`🔗 API Health: http://localhost:${PORT}/api/v1/health`)
    logger.info(`🗄️  DB Health: http://localhost:${PORT}/api/v1/health/database`)
    logger.info(`🌐 Allowed Frontend Origin: ${env.FRONTEND_URL}`)
    logger.info(`⚡ WebSockets: Online and ready`)

    // Start background jobs scheduler & auto backups
    initScheduler()
    initAutoBackupScheduler()
  })
}

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Shutting down gracefully...`)
  stopScheduler()

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.')
      await disconnectDatabase()
      process.exit(0)
    })
  } else {
    await disconnectDatabase()
    process.exit(0)
  }

  // Force close after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forcefully terminating process after timeout.')
    process.exit(1)
  }, 10000)
}

// Process signal listeners
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => void gracefulShutdown('SIGINT'))

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error)
  void gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection:', reason)
  void gracefulShutdown('unhandledRejection')
})

// Boot server
startServer()
