/**
 * Sensitive field names that must never be recorded in plain text in audit logs
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'refreshtoken',
  'refresh_token',
  'cookie',
  'secret',
  'authorization',
  'accesstoken',
  'access_token',
  'creditcard',
  'cvv',
  'pincode',
])

/**
 * Recursively sanitizes data objects/arrays by stripping or masking sensitive keys
 * and ensuring values are safely JSON-serializable.
 */
export function sanitizeAuditData<T = any>(data: T): T {
  if (data === null || data === undefined) {
    return data
  }

  if (typeof data !== 'object') {
    return data
  }

  // Handle Date
  if (data instanceof Date) {
    return data.toISOString() as unknown as T
  }

  // Handle Array
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditData(item)) as unknown as T
  }

  // Handle Prisma Decimal or objects with toFixed/toNumber
  if ('toFixed' in (data as any) && typeof (data as any).toFixed === 'function') {
    return Number((data as any).toFixed(2)) as unknown as T
  }

  // Handle Plain Object
  const sanitized: Record<string, any> = {}
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeAuditData(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized as T
}
