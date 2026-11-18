import { Prisma, Role, NotificationType } from '@prisma/client'
import { prisma } from '../config/database.js'
import { AppError } from '../utils/appError.util.js'
import { createNotificationForRecipients } from './notification.service.js'
import type {
  CreatePaymentInput,
  PaymentDto,
  PaymentFilterQuery,
  PaymentListResult,
  PaymentSummaryDto,
  SubscriptionPaymentsResult,
} from '../types/payment.types.js'
import { createAuditLog } from './audit.service.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../types/audit.types.js'
import { emitGymEvent, REALTIME_EVENTS } from './socket.service.js'

export function formatPaymentDto(
  payment: any,
  financialSummary?: PaymentSummaryDto
): PaymentDto {
  return {
    id: payment.id,
    gymId: payment.gymId,
    subscriptionId: payment.subscriptionId,
    memberId: payment.memberId,
    amount: Number(payment.amount).toFixed(2),
    currency: payment.currency,
    method: payment.method,
    walletProvider: payment.walletProvider ?? null,
    transactionReference: payment.transactionReference ?? null,
    notes: payment.notes ?? null,
    createdByUserId: payment.createdByUserId,
    createdAt:
      payment.createdAt instanceof Date
        ? payment.createdAt.toISOString()
        : String(payment.createdAt),
    member: payment.member
      ? {
          id: payment.member.id,
          name: payment.member.name,
          phone: payment.member.phone,
          memberCode: payment.member.memberCode,
          email: payment.member.email ?? null,
        }
      : undefined,
    subscription: payment.subscription
      ? {
          id: payment.subscription.id,
          planName: payment.subscription.planName,
          planPrice: Number(payment.subscription.planPrice).toFixed(2),
          durationDays: payment.subscription.durationDays,
          startDate:
            payment.subscription.startDate instanceof Date
              ? payment.subscription.startDate.toISOString()
              : String(payment.subscription.startDate),
          endDate:
            payment.subscription.endDate instanceof Date
              ? payment.subscription.endDate.toISOString()
              : String(payment.subscription.endDate),
          status: payment.subscription.status,
        }
      : undefined,
    createdByUser: payment.createdByUser
      ? {
          id: payment.createdByUser.id,
          name: payment.createdByUser.name,
          role: payment.createdByUser.role,
        }
      : undefined,
    gym: payment.gym
      ? {
          name: payment.gym.name,
          phone: payment.gym.phone ?? null,
          address: payment.gym.address ?? null,
        }
      : undefined,
    financialSummary,
  }
}

/**
 * Calculates financial summary for a subscription using Decimal arithmetic.
 */
export async function getSubscriptionPaymentSummary(
  subscriptionId: string,
  gymId: string
): Promise<PaymentSummaryDto> {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, gymId },
  })

  if (!subscription) {
    throw AppError.notFound('الاشتراك غير موجود / Subscription not found')
  }

  const payments = await prisma.payment.findMany({
    where: { subscriptionId, gymId },
  })

  const totalAmount = new Prisma.Decimal(subscription.planPrice)
  const paidAmount = payments.reduce(
    (acc, p) => acc.plus(new Prisma.Decimal(p.amount)),
    new Prisma.Decimal(0)
  )
  const outstandingAmount = Prisma.Decimal.max(
    new Prisma.Decimal(0),
    totalAmount.minus(paidAmount)
  )
  const isPaid = paidAmount.greaterThanOrEqualTo(totalAmount)

  return {
    totalAmount: totalAmount.toFixed(2),
    paidAmount: paidAmount.toFixed(2),
    outstandingAmount: outstandingAmount.toFixed(2),
    isPaid,
    paymentCount: payments.length,
  }
}

/**
 * Creates a financial payment within an ACID transaction preventing overpayments.
 */
export async function createPayment(
  gymId: string,
  createdByUserId: string,
  input: CreatePaymentInput
): Promise<PaymentDto> {
  const inputAmount = new Prisma.Decimal(input.amount)

  if (inputAmount.lessThanOrEqualTo(0)) {
    throw AppError.badRequest('مبلغ الدفع يجب أن يكون أكبر من الصفر / Amount must be positive')
  }

  const paymentDto = await prisma.$transaction(async (tx) => {
    // 1. Verify subscription belongs to gym
    const subscription = await tx.subscription.findFirst({
      where: { id: input.subscriptionId, gymId },
      include: { member: true, gym: true },
    })

    if (!subscription) {
      throw AppError.notFound('الاشتراك غير موجود / Subscription not found')
    }

    if (subscription.status === 'CANCELLED') {
      throw AppError.conflict('لا يمكن سداد اشتراك ملغي / Cannot pay for cancelled subscription')
    }

    // 2. Recalculate existing payments inside transaction to prevent concurrency race conditions
    const existingPayments = await tx.payment.findMany({
      where: { subscriptionId: subscription.id, gymId },
    })

    const totalOwed = new Prisma.Decimal(subscription.planPrice)
    const currentPaid = existingPayments.reduce(
      (acc, p) => acc.plus(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0)
    )
    const remainingBalance = totalOwed.minus(currentPaid)

    // 3. Reject if remaining balance is 0 or payment amount exceeds remaining
    if (remainingBalance.lessThanOrEqualTo(0)) {
      throw AppError.conflict('المبلغ المدفوع أكبر من المبلغ المستحق')
    }

    if (inputAmount.greaterThan(remainingBalance)) {
      throw AppError.conflict('المبلغ المدفوع أكبر من المبلغ المستحق')
    }

    // 4. Create the payment record
    const created = await tx.payment.create({
      data: {
        gymId,
        subscriptionId: subscription.id,
        memberId: subscription.memberId,
        amount: inputAmount,
        currency: subscription.currency || 'EGP',
        method: input.method,
        walletProvider: input.method === 'WALLET' ? input.walletProvider : null,
        transactionReference: input.transactionReference?.trim() || null,
        notes: input.notes?.trim() || null,
        createdByUserId,
      },
      include: {
        member: true,
        subscription: true,
        createdByUser: true,
        gym: true,
      },
    })

    // 5. Updated summary
    const newPaid = currentPaid.plus(inputAmount)
    const newOutstanding = Prisma.Decimal.max(new Prisma.Decimal(0), totalOwed.minus(newPaid))
    const financialSummary: PaymentSummaryDto = {
      totalAmount: totalOwed.toFixed(2),
      paidAmount: newPaid.toFixed(2),
      outstandingAmount: newOutstanding.toFixed(2),
      isPaid: newPaid.greaterThanOrEqualTo(totalOwed),
      paymentCount: existingPayments.length + 1,
    }

    return formatPaymentDto(created, financialSummary)
  })

  // Create PAYMENT_RECEIVED notification for OWNER, MANAGER, RECEPTIONIST (TRAINER excluded)
  await createNotificationForRecipients({
    gymId,
    type: NotificationType.PAYMENT_RECEIVED,
    title: 'تسجيل دفعة جديدة',
    message: `تم تسجيل دفعة بقيمة ${paymentDto.amount} ج.م للعضو "${paymentDto.member?.name || 'العضو'}".`,
    entityType: 'PAYMENT',
    entityId: paymentDto.id,
    deduplicationBaseKey: `payment-received:${paymentDto.id}`,
    excludeRoles: [Role.TRAINER],
  })

  await createAuditLog({
    gymId,
    actorUserId: createdByUserId,
    action: AUDIT_ACTIONS.PAYMENT_RECEIVED,
    entityType: AUDIT_ENTITY_TYPES.PAYMENT,
    entityId: paymentDto.id,
    description: `تم تسجيل دفعة مالية بقيمة (${paymentDto.amount} ${paymentDto.currency}) للعضو (${paymentDto.member?.name || 'العضو'})`,
    afterData: paymentDto,
  })

  // Emit real-time event across the gym
  emitGymEvent(gymId, REALTIME_EVENTS.PAYMENT_CREATED, {
    payment: paymentDto,
    memberId: paymentDto.memberId,
    amount: paymentDto.amount,
  })

  return paymentDto
}

/**
 * Retrieves paginated list of payments with search and filters.
 */
export async function getPayments(
  gymId: string,
  query: PaymentFilterQuery
): Promise<PaymentListResult> {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  const skip = (page - 1) * limit

  const where: any = { gymId }

  if (query.method) {
    where.method = query.method
  }

  if (query.walletProvider) {
    where.walletProvider = query.walletProvider
  }

  if (query.subscriptionId) {
    where.subscriptionId = query.subscriptionId
  }

  if (query.memberId) {
    where.memberId = query.memberId
  }

  if (query.dateFrom || query.dateTo) {
    where.createdAt = {}
    if (query.dateFrom) {
      where.createdAt.gte = new Date(query.dateFrom)
    }
    if (query.dateTo) {
      const toDate = new Date(query.dateTo)
      toDate.setUTCHours(23, 59, 59, 999)
      where.createdAt.lte = toDate
    }
  }

  if (query.search) {
    const searchPattern = query.search.trim()
    where.OR = [
      { member: { name: { contains: searchPattern } } },
      { member: { phone: { contains: searchPattern } } },
      { member: { memberCode: { contains: searchPattern } } },
      { id: { contains: searchPattern } },
      { transactionReference: { contains: searchPattern } },
    ]
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        member: true,
        subscription: true,
        createdByUser: true,
        gym: true,
      },
    }),
    prisma.payment.count({ where }),
  ])

  return {
    payments: payments.map((p) => formatPaymentDto(p)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Retrieves a single payment by id with receipt data.
 */
export async function getPaymentById(
  id: string,
  gymId: string
): Promise<PaymentDto> {
  const payment = await prisma.payment.findFirst({
    where: { id, gymId },
    include: {
      member: true,
      subscription: true,
      createdByUser: true,
      gym: true,
    },
  })

  if (!payment) {
    throw AppError.notFound('العملية غير موجودة / Payment not found')
  }

  const summary = await getSubscriptionPaymentSummary(payment.subscriptionId, gymId)
  return formatPaymentDto(payment, summary)
}

/**
 * Retrieves all payments for a specific subscription plus summary.
 */
export async function getSubscriptionPayments(
  subscriptionId: string,
  gymId: string
): Promise<SubscriptionPaymentsResult> {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, gymId },
  })

  if (!subscription) {
    throw AppError.notFound('الاشتراك غير موجود / Subscription not found')
  }

  const [payments, financialSummary] = await Promise.all([
    prisma.payment.findMany({
      where: { subscriptionId, gymId },
      orderBy: { createdAt: 'desc' },
      include: {
        member: true,
        subscription: true,
        createdByUser: true,
        gym: true,
      },
    }),
    getSubscriptionPaymentSummary(subscriptionId, gymId),
  ])

  return {
    payments: payments.map((p) => formatPaymentDto(p, financialSummary)),
    financialSummary,
  }
}

/**
 * Retrieves all payments for a specific member ordered newest first.
 */
export async function getMemberPayments(
  memberId: string,
  gymId: string
): Promise<PaymentDto[]> {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
  })

  if (!member) {
    throw AppError.notFound('العضو غير موجود / Member not found')
  }

  const payments = await prisma.payment.findMany({
    where: { memberId, gymId },
    orderBy: { createdAt: 'desc' },
    include: {
      member: true,
      subscription: true,
      createdByUser: true,
      gym: true,
    },
  })

  return payments.map((p) => formatPaymentDto(p))
}
