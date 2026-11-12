import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../utils/response.util.js'
import * as dashboardService from '../services/dashboard.service.js'

/**
 * GET /api/v1/dashboard/overview
 * Returns the gym's live dashboard metrics, charts, and activity
 */
export async function getOverview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const userRole = req.user!.role

    const overview = await dashboardService.getDashboardOverview(gymId, userRole)
    sendSuccess(res, 200, 'تم تحميل بيانات لوحة التحكم بنجاح / Dashboard loaded successfully', overview)
  } catch (error) {
    next(error)
  }
}
