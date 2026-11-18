import { io, Socket } from 'socket.io-client'
import { queryClient } from '@/app/config/queryClient'
import { useEffect, useState } from 'react'

let socket: Socket | null = null

export const REALTIME_EVENTS = {
  ATTENDANCE_CHECK_IN: 'ATTENDANCE_CHECK_IN',
  ATTENDANCE_CHECK_OUT: 'ATTENDANCE_CHECK_OUT',
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_FROZEN: 'SUBSCRIPTION_FROZEN',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  MEMBER_CREATED: 'MEMBER_CREATED',
  MEMBER_UPDATED: 'MEMBER_UPDATED',
  TRAINER_UPDATED: 'TRAINER_UPDATED',
  NOTIFICATION_NEW: 'NOTIFICATION_NEW',
  SYSTEM_SYNC: 'SYSTEM_SYNC',
} as const

export type RealtimeEvent = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS]

function getSocketUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
  return envUrl.replace(/\/api\/v1\/?$/, '')
}

/**
 * Initializes the Socket.IO connection singleton
 */
export function initSocket(): Socket {
  if (socket && socket.connected) {
    return socket
  }

  const token =
    (typeof window !== 'undefined'
      ? localStorage.getItem('gymvip_token') ||
        localStorage.getItem('accessToken') ||
        sessionStorage.getItem('gymvip_token') ||
        sessionStorage.getItem('accessToken')
      : null) || undefined
  const socketUrl = getSocketUrl()

  socket = io(socketUrl, {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  })

  socket.on('connect', () => {
    // Notify window that real-time socket is connected
    window.dispatchEvent(new CustomEvent('gymvip:socket_status', { detail: { connected: true } }))
  })

  socket.on('disconnect', () => {
    window.dispatchEvent(new CustomEvent('gymvip:socket_status', { detail: { connected: false } }))
  })

  // Catch-all general real-time broadcast
  socket.on('realtime:update', ({ event, data }) => {
    handleIncomingRealtimeEvent(event, data)
  })

  // Specific event handlers for guaranteed rapid response
  Object.values(REALTIME_EVENTS).forEach((eventName) => {
    socket?.on(eventName, (data) => {
      handleIncomingRealtimeEvent(eventName, data)
    })
  })

  return socket
}

/**
 * Central router for incoming real-time events:
 * 1. Instantly invalidates matching TanStack Query caches
 * 2. Broadcasts a custom event for local useState components
 */
function handleIncomingRealtimeEvent(event: string, data: any) {
  // Dispatch local window event so any listening React component updates immediately
  window.dispatchEvent(
    new CustomEvent('gymvip:realtime', {
      detail: { event, data },
    })
  )

  // Smart TanStack Query Cache Invalidation based on event domain
  switch (event) {
    case REALTIME_EVENTS.ATTENDANCE_CHECK_IN:
    case REALTIME_EVENTS.ATTENDANCE_CHECK_OUT:
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['trainers'] })
      break

    case REALTIME_EVENTS.PAYMENT_CREATED:
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      break

    case REALTIME_EVENTS.SUBSCRIPTION_CREATED:
    case REALTIME_EVENTS.SUBSCRIPTION_RENEWED:
    case REALTIME_EVENTS.SUBSCRIPTION_FROZEN:
    case REALTIME_EVENTS.SUBSCRIPTION_CANCELLED:
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      break

    case REALTIME_EVENTS.MEMBER_CREATED:
    case REALTIME_EVENTS.MEMBER_UPDATED:
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['trainers'] })
      break

    case REALTIME_EVENTS.TRAINER_UPDATED:
      queryClient.invalidateQueries({ queryKey: ['trainers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      break

    case REALTIME_EVENTS.NOTIFICATION_NEW:
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      break

    default:
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      break
  }
}

/**
 * Re-authenticates socket when user logs in or switches tokens
 */
export function reauthenticateSocket(token?: string) {
  const effectiveToken =
    token ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('gymvip_token') || localStorage.getItem('accessToken')
      : null)

  if (!socket) {
    initSocket()
    return
  }

  socket.auth = { token: effectiveToken }
  if (socket.connected) {
    socket.emit('authenticate', effectiveToken)
  } else {
    socket.connect()
  }
}

/**
 * Disconnects socket cleanly (e.g. on logout)
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function getSocket(): Socket | null {
  return socket
}

/**
 * React Hook to subscribe a component to real-time events
 * Triggers callback immediately whenever specified events occur
 */
export function useRealtimeSync(
  eventFilter?: string | string[] | ((event: string) => boolean),
  callback?: (detail: { event: string; data: any }) => void
) {
  useEffect(() => {
    // Ensure socket is alive
    initSocket()

    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ event: string; data: any }>
      const { event, data } = customEvent.detail

      if (!eventFilter) {
        callback?.({ event, data })
        return
      }

      if (typeof eventFilter === 'string' && event === eventFilter) {
        callback?.({ event, data })
        return
      }

      if (Array.isArray(eventFilter) && eventFilter.includes(event)) {
        callback?.({ event, data })
        return
      }

      if (typeof eventFilter === 'function' && eventFilter(event)) {
        callback?.({ event, data })
        return
      }
    }

    window.addEventListener('gymvip:realtime', handleEvent)
    return () => {
      window.removeEventListener('gymvip:realtime', handleEvent)
    }
  }, [eventFilter, callback])
}

/**
 * Hook to track live WebSocket connection status
 */
export function useSocketStatus(): boolean {
  const [isConnected, setIsConnected] = useState<boolean>(() => {
    return !!socket?.connected
  })

  useEffect(() => {
    const s = initSocket()
    setIsConnected(s.connected)

    const handleStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ connected: boolean }>
      setIsConnected(customEvent.detail.connected)
    }

    window.addEventListener('gymvip:socket_status', handleStatus)
    return () => {
      window.removeEventListener('gymvip:socket_status', handleStatus)
    }
  }, [])

  return isConnected
}
