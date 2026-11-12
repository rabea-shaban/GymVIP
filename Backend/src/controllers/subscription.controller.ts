import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../utils/response.util.js'
import * as subscriptionService from '../services/subscription.service.js'
import type { CreateSubscriptionInput, SubscriptionFilterQuery } from '../types/subscription.types.js'

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const input = req.body as CreateSubscriptionInput
    const subscription = await subscriptionService.createSubscription(gymId, input, req.user?.id)
    sendSuccess(res, 201, 'تم إنشاء الاشتراك بنجاح / Subscription created successfully', {
      subscription,
    })
  } catch (error) {
    next(error)
  }
}

export async function list(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const query = req.query as unknown as SubscriptionFilterQuery
    const result = await subscriptionService.getSubscriptions(gymId, query, req.user?.role)
    sendSuccess(res, 200, 'Subscriptions retrieved successfully', result)
  } catch (error) {
    next(error)
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const id = req.params.id as string
    const subscription = await subscriptionService.getSubscriptionById(id, gymId, req.user?.role)
    sendSuccess(res, 200, 'Subscription retrieved successfully', { subscription })
  } catch (error) {
    next(error)
  }
}

export async function getMemberSubscriptions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const memberId = req.params.memberId as string
    const subscriptions = await subscriptionService.getMemberSubscriptions(memberId, gymId, req.user?.role)
    sendSuccess(res, 200, 'Member subscriptions retrieved successfully', { subscriptions })
  } catch (error) {
    next(error)
  }
}

export async function getMemberCurrent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const memberId = req.params.memberId as string
    const subscription = await subscriptionService.getMemberCurrentSubscription(memberId, gymId)
    sendSuccess(
      res,
      200,
      subscription ? 'Current subscription retrieved successfully' : 'No current subscription',
      { subscription }
    )
  } catch (error) {
    next(error)
  }
}

export async function freeze(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const userId = req.user!.id
    const id = req.params.id as string
    const input = req.body
    const result = await subscriptionService.freezeSubscription(gymId, id, userId, input)
    sendSuccess(res, 200, 'تم تجميد الاشتراك بنجاح', result)
  } catch (error) {
    next(error)
  }
}

export async function getFreezes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const id = req.params.id as string
    const result = await subscriptionService.getSubscriptionFreezes(gymId, id)
    sendSuccess(res, 200, 'تم جلب سجل التجميد بنجاح', result)
  } catch (error) {
    next(error)
  }
}

export async function renew(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const id = req.params.id as string
    const input = req.body
    const subscription = await subscriptionService.renewSubscription(gymId, id, input, req.user?.id)
    sendSuccess(res, 201, 'تم تجديد الاشتراك بنجاح', { subscription })
  } catch (error) {
    next(error)
  }
}

export async function cancel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const userId = req.user!.id
    const id = req.params.id as string
    const input = req.body
    const subscription = await subscriptionService.cancelSubscription(
      gymId,
      id,
      input,
      userId,
      req.user?.role
    )
    sendSuccess(res, 200, 'تم إلغاء الاشتراك بنجاح / Subscription cancelled successfully', {
      subscription,
    })
  } catch (error) {
    next(error)
  }
}
