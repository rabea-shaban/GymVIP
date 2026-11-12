import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../utils/response.util.js'
import * as memberService from '../services/member.service.js'
import type {
  CreateMemberInput,
  UpdateMemberInput,
  UpdateMemberStatusInput,
  MemberQueryParams,
} from '../validators/member.validator.js'

/**
 * GET /api/v1/members
 * Retrieves paginated list of gym members with search and filtering
 */
export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const query = req.query as unknown as MemberQueryParams
    const result = await memberService.getMembers(gymId, query)

    sendSuccess(res, 200, 'تم جلب قائمة الأعضاء بنجاح / Members retrieved successfully', result)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/members/:id
 * Retrieves details of a specific member
 */
export async function getMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const id = req.params.id as string
    const member = await memberService.getMemberById(gymId, id)

    sendSuccess(res, 200, 'تم جلب بيانات العضو بنجاح / Member retrieved successfully', { member })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/members
 * Creates a new member for the authenticated gym
 */
export async function createMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const input = req.body as CreateMemberInput
    const member = await memberService.createMember(gymId, input, req.user?.id)

    sendSuccess(res, 201, 'تم إضافة العضو بنجاح / Member created successfully', { member })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/v1/members/:id
 * Updates member info
 */
export async function updateMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const id = req.params.id as string
    const input = req.body as UpdateMemberInput
    const member = await memberService.updateMember(gymId, id, input, req.user?.id)

    sendSuccess(res, 200, 'تم تحديث بيانات العضو بنجاح / Member updated successfully', { member })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/v1/members/:id/status
 * Activates or deactivates a member
 */
export async function updateMemberStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const id = req.params.id as string
    const input = req.body as UpdateMemberStatusInput
    const member = await memberService.updateMemberStatus(gymId, id, input, req.user?.id)

    sendSuccess(res, 200, 'تم تحديث حالة العضو بنجاح / Member status updated successfully', { member })
  } catch (error) {
    next(error)
  }
}
