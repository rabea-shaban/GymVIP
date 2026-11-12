import { Request, Response, NextFunction } from 'express'
import * as auditService from '../services/audit.service.js'
import { listAuditLogsQuerySchema } from '../validators/audit.validator.js'
import { sendSuccess } from '../utils/response.util.js'

/**
 * Controller to list audit logs for the authenticated gym
 */
export async function listAuditLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const query = listAuditLogsQuerySchema.parse(req.query)

    const result = await auditService.listAuditLogs(gymId, query)

    sendSuccess(
      res,
      200,
      'تم استرجاع سجل العمليات بنجاح',
      result.data,
      result.pagination
    )
  } catch (error) {
    next(error)
  }
}

/**
 * Controller to view details of a single audit log entry
 */
export async function getAuditLog(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const id = req.params.id as string

    const result = await auditService.getAuditLogById(gymId, id)

    sendSuccess(res, 200, 'تم استرجاع تفاصيل العملية بنجاح', { auditLog: result })
  } catch (error) {
    next(error)
  }
}
