import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../utils/response.util.js'
import * as paymentService from '../services/payment.service.js'
import type { CreatePaymentInput, PaymentFilterQuery } from '../types/payment.types.js'

export async function createPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const userId = req.user!.id
    const input = req.body as CreatePaymentInput
    const payment = await paymentService.createPayment(gymId, userId, input)
    sendSuccess(res, 201, 'تم تسجيل الدفعة بنجاح / Payment created successfully', {
      payment,
    })
  } catch (error) {
    next(error)
  }
}

export async function listPayments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const query = req.query as unknown as PaymentFilterQuery
    const result = await paymentService.getPayments(gymId, query)
    sendSuccess(res, 200, 'Payments retrieved successfully', result)
  } catch (error) {
    next(error)
  }
}

export async function getPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const id = req.params.id as string
    const payment = await paymentService.getPaymentById(id, gymId)
    sendSuccess(res, 200, 'Payment retrieved successfully', { payment })
  } catch (error) {
    next(error)
  }
}

export async function getSubscriptionPayments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const subscriptionId = req.params.subscriptionId as string
    const result = await paymentService.getSubscriptionPayments(subscriptionId, gymId)
    sendSuccess(res, 200, 'Subscription payments retrieved successfully', result)
  } catch (error) {
    next(error)
  }
}

export async function getMemberPayments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const memberId = req.params.memberId as string
    const payments = await paymentService.getMemberPayments(memberId, gymId)
    sendSuccess(res, 200, 'Member payments retrieved successfully', { payments })
  } catch (error) {
    next(error)
  }
}
