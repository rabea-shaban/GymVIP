import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../utils/response.util.js'
import * as planService from '../services/plan.service.js'
import type {
  CreatePlanInput,
  UpdatePlanInput,
  UpdatePlanStatusInput,
  PlanQueryParams,
} from '../validators/plan.validator.js'

/**
 * GET /api/v1/plans
 * Retrieves paginated list of membership plans for authenticated gym
 */
export async function listPlans(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const query = req.query as unknown as PlanQueryParams
    const result = await planService.getPlans(gymId, query)

    sendSuccess(res, 200, 'تم جلب باقات الاشتراك بنجاح / Plans retrieved successfully', result)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/plans/:id
 * Retrieves details of a specific membership plan
 */
export async function getPlan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const id = req.params.id as string
    const plan = await planService.getPlanById(gymId, id)

    sendSuccess(res, 200, 'تم جلب بيانات الباقة بنجاح / Plan retrieved successfully', { plan })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/plans
 * Creates a new membership plan for the gym
 */
export async function createPlan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const input = req.body as CreatePlanInput
    const plan = await planService.createPlan(gymId, input, req.user?.id)

    sendSuccess(res, 201, 'تم إنشاء الباقة بنجاح / Plan created successfully', { plan })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/v1/plans/:id
 * Updates membership plan details
 */
export async function updatePlan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const id = req.params.id as string
    const input = req.body as UpdatePlanInput
    const plan = await planService.updatePlan(gymId, id, input, req.user?.id)

    sendSuccess(res, 200, 'تم تحديث الباقة بنجاح / Plan updated successfully', { plan })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/v1/plans/:id/status
 * Activates or disables a membership plan
 */
export async function updatePlanStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const id = req.params.id as string
    const input = req.body as UpdatePlanStatusInput
    const plan = await planService.updatePlanStatus(gymId, id, input, req.user?.id)

    sendSuccess(res, 200, 'تم تحديث حالة الباقة بنجاح / Plan status updated successfully', { plan })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/v1/plans/:id
 * Deletes a membership plan if it has no subscriptions
 */
export async function deletePlan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const id = req.params.id as string
    await planService.deletePlan(gymId, id, req.user?.id)

    sendSuccess(res, 200, 'تم حذف الباقة بنجاح / Plan deleted successfully')
  } catch (error) {
    next(error)
  }
}

