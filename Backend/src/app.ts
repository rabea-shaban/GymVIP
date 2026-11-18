import express, { type Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import { apiRouter } from './routes/index.js'
import { notFoundHandler } from './middlewares/notFound.middleware.js'
import { errorHandler } from './middlewares/error.middleware.js'

import { apiLimiter } from './middlewares/rateLimiter.middleware.js'
import { ensureUploadDirs, UPLOADS_ROOT } from './utils/fileStorage.util.js'

export const createApp = (): Express => {
  const app = express()

  // 1. Trust proxy if behind Nginx / Cloudflare
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1)
  }

  // 2. Security Headers Middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
      hsts: env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
      noSniff: true,
      xssFilter: true,
      hidePoweredBy: true,
    })
  )

  // 3. CORS Middleware with Credentials & Safe Origin Validation
  const allowedOrigins = [
    env.FRONTEND_URL,
    ...(env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
      : []),
  ]

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or in test/dev
        if (!origin) {
          callback(null, true)
          return
        }
        if (allowedOrigins.includes(origin)) {
          callback(null, true)
          return
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`))
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  )

  // 4. Global Rate Limiter (Skipped during vitest/test runs)
  if (env.NODE_ENV !== 'test') {
    app.use('/api', apiLimiter)
  }

  // 5. Body & Cookie Parsing Middlewares
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))
  app.use(cookieParser())

  // 6. Request Logging Middleware (Development)
  if (env.NODE_ENV !== 'production' && env.NODE_ENV !== 'test') {
    app.use(morgan('dev'))
  }

  // 7. Static Uploads File Serving
  ensureUploadDirs()
  app.use(
    '/uploads',
    express.static(UPLOADS_ROOT, {
      maxAge: env.NODE_ENV === 'production' ? '7d' : '1h',
      etag: true,
      fallthrough: true,
    })
  )

  // 8. API V1 Routes
  app.use('/api/v1', apiRouter)

  // 6. 404 Not Found Middleware
  app.use(notFoundHandler)

  // 7. Centralized Error Handling Middleware
  app.use(errorHandler)

  return app
}

export const app = createApp()
export default app
