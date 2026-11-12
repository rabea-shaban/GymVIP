import type { Request, Response, NextFunction } from 'express'
import {
  getGymProfile,
  getGymSetupStatus,
  completeGymSetup,
  updateGymSettings,
  updateGymStatus,
} from '../services/gym.service.js'
import { sendSuccess } from '../utils/response.util.js'
import type {
  GymSetupInput,
  UpdateGymInput,
  UpdateGymStatusInput,
} from '../validators/gym.validator.js'

/**
 * Handles GET /api/v1/gym
 * Returns authenticated gym profile
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gymId = req.user!.gymId
    const gym = await getGymProfile(gymId)

    sendSuccess(res, 200, 'Gym information', { gym })
  } catch (error) {
    next(error)
  }
}

/**
 * Handles GET /api/v1/gym/setup-status
 * Returns setup completion status for routing
 */
export const getSetupStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gymId = req.user!.gymId
    const status = await getGymSetupStatus(gymId)

    sendSuccess(res, 200, 'Gym setup status', status)
  } catch (error) {
    next(error)
  }
}

/**
 * Handles PATCH /api/v1/gym/setup
 * Completes initial setup for the gym (OWNER, MANAGER)
 */
export const completeSetup = async (
  req: Request<unknown, unknown, GymSetupInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gymId = req.user!.gymId
    const gym = await completeGymSetup(gymId, req.body)

    sendSuccess(res, 200, 'تم إعداد بيانات الجيم بنجاح', { gym })
  } catch (error) {
    next(error)
  }
}

/**
 * Handles PATCH /api/v1/gym
 * Updates gym profile information (OWNER, MANAGER)
 */
export const updateSettings = async (
  req: Request<unknown, unknown, UpdateGymInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gymId = req.user!.gymId
    const gym = await updateGymSettings(gymId, req.body, req.user?.id)

    sendSuccess(res, 200, 'تم تحديث بيانات الجيم بنجاح', { gym })
  } catch (error) {
    next(error)
  }
}

/**
 * Handles PATCH /api/v1/gym/status
 * Deactivates or activates gym (OWNER only)
 */
export const updateStatus = async (
  req: Request<unknown, unknown, UpdateGymStatusInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gymId = req.user!.gymId
    const gym = await updateGymStatus(gymId, req.body)

    sendSuccess(res, 200, 'تم تحديث حالة الجيم بنجاح', { gym })
  } catch (error) {
    next(error)
  }
}
