import type { Request, Response, NextFunction } from 'express'
import {
  createDatabaseBackup,
  listDatabaseBackups,
  getBackupDownloadPath,
  restoreDatabaseFromBackup,
} from '../services/backup.service.js'
import { sendSuccess } from '../utils/response.util.js'
import { createAuditLog } from '../services/audit.service.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../types/audit.types.js'

export const listBackupsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const backups = await listDatabaseBackups()
    sendSuccess(res, 200, 'Backups retrieved successfully', backups)
  } catch (error) {
    next(error)
  }
}

export const createBackupHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const backup = await createDatabaseBackup('MANUAL')

    if (req.user) {
      await createAuditLog({
        gymId: req.user.gymId,
        actorUserId: req.user.id,
        action: AUDIT_ACTIONS.GYM_SETTINGS_UPDATED,
        entityType: AUDIT_ENTITY_TYPES.GYM,
        description: `تم إنشاء نسخة احتياطية يدوية لقاعدة البيانات (${backup.fileName})`,
        metadata: { fileName: backup.fileName, size: backup.fileSizeFormatted },
      })
    }

    sendSuccess(res, 201, 'تم إنشاء النسخة الاحتياطية بنجاح', backup)
  } catch (error) {
    next(error)
  }
}

export const downloadBackupHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fileName } = req.params
    if (!fileName) {
      res.status(400).json({ success: false, message: 'اسم الملف مطلوب' })
      return
    }
    const filePath = getBackupDownloadPath(fileName)
    res.download(filePath, fileName)
  } catch (error) {
    next(error)
  }
}

export const restoreBackupHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fileName } = req.params
    if (!fileName) {
      res.status(400).json({ success: false, message: 'اسم الملف مطلوب' })
      return
    }
    await restoreDatabaseFromBackup(fileName)

    if (req.user) {
      await createAuditLog({
        gymId: req.user.gymId,
        actorUserId: req.user.id,
        action: AUDIT_ACTIONS.GYM_SETTINGS_UPDATED,
        entityType: AUDIT_ENTITY_TYPES.GYM,
        description: `تمت استعادة قاعدة البيانات من النسخة الاحتياطية (${fileName})`,
      })
    }

    sendSuccess(res, 200, 'تمت استعادة قاعدة البيانات بنجاح من النسخة الاحتياطية', { fileName })
  } catch (error) {
    next(error)
  }
}
