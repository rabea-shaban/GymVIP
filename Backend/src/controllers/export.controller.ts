import type { Request, Response, NextFunction } from 'express'
import * as exportService from '../services/export.service.js'
import type { ExportFilterQuery, ExportResult } from '../types/export.types.js'

function sendExportFile(res: Response, result: ExportResult) {
  res.setHeader('Content-Type', result.contentType)
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
  res.setHeader('Content-Length', result.buffer.length)
  res.status(200).send(result.buffer)
}

export async function exportMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const query = req.query as unknown as ExportFilterQuery
    const result = await exportService.exportMembers(gymId, query, req.user?.id)
    sendExportFile(res, result)
  } catch (error) {
    next(error)
  }
}

export async function exportSubscriptions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const query = req.query as unknown as ExportFilterQuery
    const result = await exportService.exportSubscriptions(gymId, query, req.user?.id)
    sendExportFile(res, result)
  } catch (error) {
    next(error)
  }
}

export async function exportPayments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const query = req.query as unknown as ExportFilterQuery
    const result = await exportService.exportPayments(gymId, query, req.user?.id)
    sendExportFile(res, result)
  } catch (error) {
    next(error)
  }
}

export async function exportAttendance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const query = req.query as unknown as ExportFilterQuery
    const result = await exportService.exportAttendance(gymId, query, req.user?.id)
    sendExportFile(res, result)
  } catch (error) {
    next(error)
  }
}

export async function exportPlans(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const query = req.query as unknown as ExportFilterQuery
    const result = await exportService.exportPlans(gymId, query, req.user?.id)
    sendExportFile(res, result)
  } catch (error) {
    next(error)
  }
}

export async function exportActivityLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const query = req.query as unknown as ExportFilterQuery
    const result = await exportService.exportActivityLogs(gymId, query, req.user?.id)
    sendExportFile(res, result)
  } catch (error) {
    next(error)
  }
}
