import type { Request, Response, NextFunction } from 'express'
import { getSystemLicenseStatus } from '../services/license.service.js'

// Routes that must never be blocked by license check
const ALLOWED_UNLICENSED_PATHS = [
  '/api/v1/license/status',
  '/api/v1/license/machine-id',
  '/api/v1/license/activate',
  '/api/v1/installation/status',
  '/api/v1/installation/setup-account',
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
  '/api/v1/auth/me',
  '/api/v1/health',
]

/**
 * Middleware that validates system license status.
 * Blocks application access if system is unactivated or expired past grace period.
 */
export const requireLicense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (process.env.NODE_ENV === 'test') {
    return next()
  }

  const path = req.path.toLowerCase()

  // Always allow license endpoints, installation endpoints, and auth essentials
  if (ALLOWED_UNLICENSED_PATHS.some((allowed) => path.startsWith(allowed))) {
    return next()
  }

  try {
    const { getSystemInstallationStatus } = await import('../services/installation.service.js')
    const installation = await getSystemInstallationStatus()

    if (installation.state !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        code: 'INSTALLATION_GUARD',
        state: installation.state,
        message: installation.message,
        timestamp: new Date().toISOString(),
      })
      return
    }

    const license = await getSystemLicenseStatus()

    if (!license.isValid) {
      res.status(403).json({
        success: false,
        code: 'LICENSE_BLOCKED',
        status: license.status,
        machineId: license.machineId,
        message: license.message,
        timestamp: new Date().toISOString(),
      })
      return
    }

    // Attach license info to response headers for frontend awareness
    res.setHeader('X-GymVIP-License-Status', license.status)
    if (license.daysRemaining !== undefined) {
      res.setHeader('X-GymVIP-License-Days-Left', String(license.daysRemaining))
    }
    if (license.inGracePeriod) {
      res.setHeader('X-GymVIP-License-Grace-Period', 'true')
    }

    next()
  } catch (error) {
    next(error)
  }
}
