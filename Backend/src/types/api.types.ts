export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  errors?: unknown[]
  meta?: Record<string, unknown>
}

export interface HealthCheckData {
  environment: string
  uptime?: number
  timestamp?: string
  version?: string
}

export type Environment = 'development' | 'production' | 'test'
