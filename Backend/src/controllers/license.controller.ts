import type { Request, Response, NextFunction } from 'express'
import {
  getSystemLicenseStatus,
  activateSystemLicense,
} from '../services/license.service.js'
import { getMachineId } from '../utils/machineId.util.js'
import { sendSuccess } from '../utils/response.util.js'

export const getLicenseStatusHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = await getSystemLicenseStatus(true)
    sendSuccess(res, 200, 'License status retrieved', status)
  } catch (error) {
    next(error)
  }
}

export const getMachineIdHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const machineId = getMachineId()
    sendSuccess(res, 200, 'Machine ID retrieved', { machineId })
  } catch (error) {
    next(error)
  }
}

export const activateLicenseHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { licenseKey } = req.body
    const result = await activateSystemLicense(licenseKey)
    sendSuccess(res, 200, 'تم تفعيل ترخيص النظام بنجاح!', result)
  } catch (error) {
    next(error)
  }
}
