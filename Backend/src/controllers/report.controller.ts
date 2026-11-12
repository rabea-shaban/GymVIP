import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../utils/response.util.js'
import * as reportService from '../services/report.service.js'
import type { ReportDateFilter } from '../types/report.types.js'

/**
 * GET /api/v1/reports/summary
 */
export async function getSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const userRole = req.user!.role
    const filter = req.query as unknown as ReportDateFilter

    const summary = await reportService.getReportsSummary(gymId, userRole, filter)
    sendSuccess(res, 200, 'تم تحميل ملخص التقارير بنجاح / Reports summary loaded', summary)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/reports/members
 */
export async function getMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const filter = req.query as unknown as ReportDateFilter

    const report = await reportService.getMembersReport(gymId, filter)
    sendSuccess(res, 200, 'تم تحميل تقرير الأعضاء بنجاح / Members report loaded', report)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/reports/subscriptions
 */
export async function getSubscriptions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const filter = req.query as unknown as ReportDateFilter

    const report = await reportService.getSubscriptionsReport(gymId, filter)
    sendSuccess(res, 200, 'تم تحميل تقرير الاشتراكات بنجاح / Subscriptions report loaded', report)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/reports/attendance
 */
export async function getAttendance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const filter = req.query as unknown as ReportDateFilter

    const report = await reportService.getAttendanceReport(gymId, filter)
    sendSuccess(res, 200, 'تم تحميل تقرير الحضور بنجاح / Attendance report loaded', report)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/reports/payments (OWNER / MANAGER only)
 */
export async function getPayments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const userRole = req.user!.role
    const filter = req.query as unknown as ReportDateFilter

    const report = await reportService.getPaymentsReport(gymId, userRole, filter)
    sendSuccess(res, 200, 'تم تحميل تقرير المدفوعات بنجاح / Payments report loaded', report)
  } catch (error) {
    next(error)
  }
}
