import type { Request, Response, NextFunction } from 'express'
import {
  createTrainer,
  getTrainersList,
  getTrainerById,
  getTrainerByUserId,
  updateTrainer,
  updateTrainerStatus,
  deleteTrainer,
} from '../services/trainer.service.js'
import { sendSuccess } from '../utils/response.util.js'
import { AppError } from '../utils/appError.util.js'
import { Role } from '@prisma/client'

/**
 * Handles POST /api/v1/trainers
 * Creates a new Trainer profile and User with role TRAINER (OWNER, MANAGER)
 */
export const createTrainerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gymId = req.user!.gymId
    const trainer = await createTrainer(gymId, req.body, req.user?.id)
    sendSuccess(res, 201, 'تم إضافة المدرب بنجاح / Trainer created successfully', { trainer })
  } catch (error) {
    next(error)
  }
}

/**
 * Handles GET /api/v1/trainers
 * Lists trainers for the authenticated gym with search & status filters (OWNER, MANAGER, RECEPTIONIST)
 */
export const getTrainersHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gymId = req.user!.gymId
    const result = await getTrainersList(gymId, req.query as any)
    sendSuccess(res, 200, 'تم استرجاع قائمة المدربين بنجاح / Trainers retrieved successfully', result)
  } catch (error) {
    next(error)
  }
}

/**
 * Handles GET /api/v1/trainers/me
 * Retrieves the authenticated trainer's own profile (TRAINER role only)
 */
export const getTrainerMeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!
    if (user.role !== Role.TRAINER) {
      throw AppError.forbidden('هذه الخدمة متاحة لحسابات المدربين فقط / Only accessible by TRAINER role')
    }

    const trainer = await getTrainerByUserId(user.gymId, user.id)
    sendSuccess(res, 200, 'تم استرجاع ملف المدرب بنجاح / Trainer profile retrieved successfully', { trainer })
  } catch (error) {
    next(error)
  }
}

/**
 * Handles GET /api/v1/trainers/:id
 * Retrieves details of a specific trainer
 */
export const getTrainerByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gymId = req.user!.gymId
    const trainer = await getTrainerById(gymId, req.params.id!, {
      id: req.user!.id,
      role: req.user!.role,
    })
    sendSuccess(res, 200, 'تم استرجاع تفاصيل المدرب بنجاح / Trainer details retrieved successfully', { trainer })
  } catch (error) {
    next(error)
  }
}

/**
 * Handles PATCH /api/v1/trainers/:id
 * Updates trainer profile information (OWNER, MANAGER)
 */
export const updateTrainerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gymId = req.user!.gymId
    const trainer = await updateTrainer(gymId, req.params.id!, req.body, {
      id: req.user!.id,
      role: req.user!.role,
    })
    sendSuccess(res, 200, 'تم تحديث بيانات المدرب بنجاح / Trainer updated successfully', { trainer })
  } catch (error) {
    next(error)
  }
}

/**
 * Handles PATCH /api/v1/trainers/:id/status
 * Activates or deactivates a trainer (OWNER, MANAGER)
 */
export const updateTrainerStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gymId = req.user!.gymId
    const trainer = await updateTrainerStatus(gymId, req.params.id!, req.body.isActive, req.user?.id)
    sendSuccess(res, 200, 'تم تحديث حالة المدرب بنجاح / Trainer status updated successfully', { trainer })
  } catch (error) {
    next(error)
  }
}

/**
 * Handles DELETE /api/v1/trainers/:id
 * Deletes a trainer profile (OWNER, MANAGER)
 */
export const deleteTrainerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gymId = req.user!.gymId
    await deleteTrainer(gymId, req.params.id!, req.user?.id)
    sendSuccess(res, 200, 'تم حذف المدرب بنجاح / Trainer deleted successfully')
  } catch (error) {
    next(error)
  }
}
