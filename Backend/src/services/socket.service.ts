import { Server as SocketIOServer, Socket } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.util.js'

let io: SocketIOServer | null = null

export interface AuthenticatedSocketData {
  userId?: string
  gymId?: string
  role?: string
}

export const REALTIME_EVENTS = {
  // Attendance
  ATTENDANCE_CHECK_IN: 'ATTENDANCE_CHECK_IN',
  ATTENDANCE_CHECK_OUT: 'ATTENDANCE_CHECK_OUT',

  // Payments
  PAYMENT_CREATED: 'PAYMENT_CREATED',

  // Subscriptions
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_FROZEN: 'SUBSCRIPTION_FROZEN',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',

  // Members
  MEMBER_CREATED: 'MEMBER_CREATED',
  MEMBER_UPDATED: 'MEMBER_UPDATED',

  // Trainers
  TRAINER_UPDATED: 'TRAINER_UPDATED',

  // General Notification & Sync
  NOTIFICATION_NEW: 'NOTIFICATION_NEW',
  SYSTEM_SYNC: 'SYSTEM_SYNC',
} as const

export type RealtimeEventName = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS]

/**
 * Initialize Socket.IO instance and attach to existing HTTP server
 */
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        env.FRONTEND_URL,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
      ],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 15000,
  })

  // Authentication Middleware for secure Gym tenant isolation
  io.use((socket: Socket<any, any, any, AuthenticatedSocketData>, next) => {
    try {
      let cookieToken: string | null = null
      if (socket.handshake.headers?.cookie) {
        const rawCookie = socket.handshake.headers.cookie
        const match =
          rawCookie.match(/(?:^|;\s*)gymvip_token=([^;]+)/) ||
          rawCookie.match(/(?:^|;\s*)access_token=([^;]+)/) ||
          rawCookie.match(/(?:^|;\s*)token=([^;]+)/)
        if (match && match[1]) {
          cookieToken = decodeURIComponent(match[1])
        }
      }

      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization?.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.slice(7)
          : null) ||
        (socket.handshake.query?.token as string | undefined) ||
        cookieToken

      if (!token) {
        // Allow unauthenticated connection but without joining private gym rooms
        return next()
      }

      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        userId?: string
        id?: string
        gymId?: string
        role?: string
      }

      socket.data.userId = decoded.userId || decoded.id
      socket.data.gymId = decoded.gymId
      socket.data.role = decoded.role

      return next()
    } catch {
      // Proceed without authenticated rooms; client can authenticate later
      return next()
    }
  })

  // Connection Handler
  io.on('connection', (socket: Socket<any, any, any, AuthenticatedSocketData>) => {
    const { userId, gymId, role } = socket.data

    if (gymId) {
      const gymRoom = `gym:${gymId}`
      socket.join(gymRoom)
      logger.info(`⚡ Socket [${socket.id}] joined gym room: ${gymRoom} (User: ${userId || 'anonymous'}, Role: ${role || 'none'})`)

      if (userId) {
        socket.join(`user:${userId}`)
      }
      if (role) {
        socket.join(`role:${gymId}:${role}`)
      }
    }

    // Client can explicitly authenticate or switch gym
    socket.on('authenticate', (token: string) => {
      try {
        let effectiveToken = token
        if (!effectiveToken && socket.handshake.headers?.cookie) {
          const rawCookie = socket.handshake.headers.cookie
          const match =
            rawCookie.match(/(?:^|;\s*)gymvip_token=([^;]+)/) ||
            rawCookie.match(/(?:^|;\s*)access_token=([^;]+)/) ||
            rawCookie.match(/(?:^|;\s*)token=([^;]+)/)
          if (match && match[1]) {
            effectiveToken = decodeURIComponent(match[1])
          }
        }
        if (!effectiveToken) return
        const decoded = jwt.verify(effectiveToken, env.JWT_SECRET) as {
          userId?: string
          id?: string
          gymId?: string
          role?: string
        }

        socket.data.userId = decoded.userId || decoded.id
        socket.data.gymId = decoded.gymId
        socket.data.role = decoded.role

        if (socket.data.gymId) {
          const gymRoom = `gym:${socket.data.gymId}`
          socket.join(gymRoom)
          if (socket.data.userId) socket.join(`user:${socket.data.userId}`)
          if (socket.data.role) socket.join(`role:${socket.data.gymId}:${socket.data.role}`)

          socket.emit('authenticated', {
            success: true,
            gymId: socket.data.gymId,
            userId: socket.data.userId,
          })
          logger.info(`⚡ Socket [${socket.id}] re-authenticated into room: ${gymRoom}`)
        }
      } catch (err: any) {
        socket.emit('authenticated', { success: false, error: err.message })
      }
    })

    socket.on('disconnect', () => {
      // Client disconnected cleanly
    })
  })

  logger.info('🚀 Socket.IO Real-Time Engine initialized successfully')
  return io
}

/**
 * Returns current Socket.IO server instance
 */
export function getSocketServer(): SocketIOServer | null {
  return io
}

/**
 * Broadcasts an event to all users connected within a specific gym
 */
export function emitGymEvent(
  gymId: string | undefined | null,
  event: RealtimeEventName | string,
  payload: Record<string, any> = {}
): void {
  if (!io || !gymId) return

  const room = `gym:${gymId}`
  const enrichedPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
    event,
  }

  io.to(room).emit(event, enrichedPayload)
  // Also emit a general real-time ping event
  io.to(room).emit('realtime:update', { event, data: enrichedPayload })
}

/**
 * Sends a private event to a specific user
 */
export function emitUserEvent(
  userId: string | undefined | null,
  event: RealtimeEventName | string,
  payload: Record<string, any> = {}
): void {
  if (!io || !userId) return

  const room = `user:${userId}`
  io.to(room).emit(event, {
    ...payload,
    timestamp: new Date().toISOString(),
    event,
  })
}

/**
 * Broadcasts an event to all users with a specific role in a gym
 */
export function emitRoleEvent(
  gymId: string | undefined | null,
  role: string,
  event: RealtimeEventName | string,
  payload: Record<string, any> = {}
): void {
  if (!io || !gymId) return

  const room = `role:${gymId}:${role}`
  io.to(room).emit(event, {
    ...payload,
    timestamp: new Date().toISOString(),
    event,
  })
}
