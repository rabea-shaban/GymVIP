import type { Request, Response, NextFunction } from 'express'
import {
  getSystemInstallationStatus,
  completeInitialAccountSetup,
  getInstallationWizardData,
  completeInstallationSetup,
} from '../services/installation.service.js'
import { sendSuccess } from '../utils/response.util.js'

export const getInstallationStatusHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = await getSystemInstallationStatus()
    sendSuccess(res, 200, 'Installation status retrieved', status)
  } catch (error) {
    next(error)
  }
}

export const setupAccountHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actorUserId = req.user?.id
    const result = await completeInitialAccountSetup(req.body, actorUserId)
    sendSuccess(res, 200, 'تم تحديث بيانات الحساب الأولي بنجاح!', result)
  } catch (error) {
    next(error)
  }
}

export const getWizardDataHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gymId = req.user?.gymId
    const data = await getInstallationWizardData(gymId)
    sendSuccess(res, 200, 'Wizard data retrieved', data)
  } catch (error) {
    next(error)
  }
}

export const completeSetupHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actorUserId = req.user?.id
    const gymId = req.user?.gymId
    const result = await completeInstallationSetup(req.body, actorUserId, gymId)
    sendSuccess(res, 200, 'تم اكتمال إعداد وتثبيت النظام بنجاح!', result)
  } catch (error) {
    next(error)
  }
}
