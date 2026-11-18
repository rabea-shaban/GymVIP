import { prisma } from '../config/database.js'
import { SubscriptionStatus, NotificationType, Role } from '@prisma/client'
import { AppError } from '../utils/appError.util.js'
import { createNotificationForRecipients } from './notification.service.js'
import {
  calculateSubscriptionEndDate,
  getEffectiveSubscriptionStatus,
  parseDate,
  getCurrentCairoDate,
} from '../utils/date.util.js'
import type {
  CreateSubscriptionInput,
  SubscriptionDto,
  SubscriptionFilterQuery,
  SubscriptionListResult,
  SubscriptionFreezeDto,
  FreezeSubscriptionInput,
  RenewSubscriptionInput,
  FreezeListResult,
  CancelSubscriptionInput,
} from '../types/subscription.types.js'
import { createAuditLog } from './audit.service.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../types/audit.types.js'
import { emitGymEvent, REALTIME_EVENTS } from './socket.service.js'

export function formatSubscriptionDto(subscription: any, userRole?: Role): SubscriptionDto {
  const effectiveStatus = getEffectiveSubscriptionStatus(subscription)
  const isTrainer = userRole === Role.TRAINER

  return {
    id: subscription.id,
    gymId: subscription.gymId,
    memberId: subscription.memberId,
    planId: subscription.planId,
    planName: subscription.planName,
    planPrice: Number(subscription.planPrice).toFixed(2),
    durationDays: subscription.durationDays,
    currency: subscription.currency,
    startDate:
      subscription.startDate instanceof Date
        ? subscription.startDate.toISOString()
        : String(subscription.startDate),
    endDate:
      subscription.endDate instanceof Date
        ? subscription.endDate.toISOString()
        : String(subscription.endDate),
    status: subscription.status,
    effectiveStatus,
    notes: isTrainer ? null : subscription.notes ?? null,
    // Feature 16: Cancellation fields
    cancelledAt:
      subscription.cancelledAt instanceof Date
        ? subscription.cancelledAt.toISOString()
        : subscription.cancelledAt
        ? String(subscription.cancelledAt)
        : null,
    cancellationReason: isTrainer ? null : subscription.cancellationReason ?? null,
    cancellationNotes: isTrainer ? null : subscription.cancellationNotes ?? null,
    cancelledByUserId: isTrainer ? null : subscription.cancelledByUserId ?? null,
    cancelledByUser: isTrainer
      ? null
      : subscription.cancelledByUser
      ? {
          id: subscription.cancelledByUser.id,
          name: subscription.cancelledByUser.name,
          role: subscription.cancelledByUser.role,
        }
      : null,
    createdAt:
      subscription.createdAt instanceof Date
        ? subscription.createdAt.toISOString()
        : String(subscription.createdAt),
    updatedAt:
      subscription.updatedAt instanceof Date
        ? subscription.updatedAt.toISOString()
        : String(subscription.updatedAt),
    member: subscription.member
      ? {
          id: subscription.member.id,
          name: subscription.member.name,
          phone: subscription.member.phone,
          memberCode: subscription.member.memberCode,
          email: subscription.member.email ?? null,
          avatarUrl: subscription.member.avatarUrl ?? null,
          isActive: subscription.member.isActive,
        }
      : undefined,
    plan: subscription.plan
      ? {
          id: subscription.plan.id,
          name: subscription.plan.name,
          durationDays: subscription.plan.durationDays,
          price: Number(subscription.plan.price).toFixed(2),
          currency: subscription.plan.currency,
          isActive: subscription.plan.isActive,
        }
      : undefined,
  }
}

/**
 * Creates a new membership subscription for a member with authoritative database snapshots.
 */
export async function createSubscription(
  gymId: string,
  input: CreateSubscriptionInput,
  actorUserId?: string
): Promise<SubscriptionDto> {
  // 1. Find and verify member
  const member = await prisma.member.findFirst({
    where: { id: input.memberId, gymId },
  })

  if (!member) {
    throw AppError.notFound('العضو غير موجود / Member not found')
  }

  if (!member.isActive) {
    throw AppError.conflict('لا يمكن إنشاء اشتراك لعضو غير نشط / Cannot create subscription for inactive member')
  }

  // 2. Find and verify plan
  const plan = await prisma.membershipPlan.findFirst({
    where: { id: input.planId, gymId },
  })

  if (!plan) {
    throw AppError.notFound('باقة الاشتراك غير موجودة / Membership plan not found')
  }

  if (!plan.isActive) {
    throw AppError.conflict('لا يمكن إنشاء اشتراك باستخدام باقة غير نشطة / Cannot create subscription using disabled plan')
  }

  // 3. Check for existing active or frozen subscription
  const existingSubscriptions = await prisma.subscription.findMany({
    where: {
      gymId,
      memberId: member.id,
      status: {
        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.FROZEN],
      },
    },
  })

  const hasActiveOrFrozen = existingSubscriptions.some((sub) => {
    const effStatus = getEffectiveSubscriptionStatus(sub)
    return effStatus === SubscriptionStatus.ACTIVE || effStatus === SubscriptionStatus.FROZEN
  })

  if (hasActiveOrFrozen) {
    throw AppError.conflict('العضو لديه اشتراك حالي بالفعل')
  }

  // 4. Calculate start and end date
  const startDate = parseDate(input.startDate)
  const endDate = calculateSubscriptionEndDate(startDate, plan.durationDays)

  // 5. Create subscription with snapshotted plan values
  const created = await prisma.subscription.create({
    data: {
      gymId,
      memberId: member.id,
      planId: plan.id,
      planName: plan.name,
      planPrice: plan.price,
      durationDays: plan.durationDays,
      currency: plan.currency,
      startDate,
      endDate,
      status: SubscriptionStatus.ACTIVE,
      notes: input.notes?.trim() || null,
    },
    include: {
      member: true,
      plan: true,
    },
  })

  const dto = formatSubscriptionDto(created)

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.SUBSCRIPTION_CREATED,
    entityType: AUDIT_ENTITY_TYPES.SUBSCRIPTION,
    entityId: created.id,
    description: `تم إنشاء اشتراك جديد للعضو (${member.name}) في باقة (${plan.name})`,
    afterData: dto,
  })

  // Emit real-time event across the gym
  emitGymEvent(gymId, REALTIME_EVENTS.SUBSCRIPTION_CREATED, {
    subscription: dto,
    memberId: member.id,
  })

  return dto
}

/**
 * Retrieves paginated subscriptions list with search and filters scoped by gym.
 */
export async function getSubscriptions(
  gymId: string,
  query: SubscriptionFilterQuery,
  userRole?: Role
): Promise<SubscriptionListResult> {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  const skip = (page - 1) * limit

  const where: any = { gymId }

  if (query.memberId) {
    where.memberId = query.memberId
  }

  if (query.planId) {
    where.planId = query.planId
  }

  if (query.status) {
    where.status = query.status
  }

  if (query.search) {
    const searchPattern = query.search.trim()
    where.OR = [
      { member: { name: { contains: searchPattern } } },
      { member: { phone: { contains: searchPattern } } },
      { member: { memberCode: { contains: searchPattern } } },
      { planName: { contains: searchPattern } },
    ]
  }

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        member: true,
        plan: true,
        cancelledByUser: {
          select: { id: true, name: true, role: true },
        },
      },
    }),
    prisma.subscription.count({ where }),
  ])

  return {
    subscriptions: subscriptions.map((s) => formatSubscriptionDto(s, userRole)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Retrieves a single subscription by id scoped to the gym.
 */
export async function getSubscriptionById(
  id: string,
  gymId: string,
  userRole?: Role
): Promise<SubscriptionDto> {
  const subscription = await prisma.subscription.findFirst({
    where: { id, gymId },
    include: {
      member: true,
      plan: true,
      cancelledByUser: {
        select: { id: true, name: true, role: true },
      },
    },
  })

  if (!subscription) {
    throw AppError.notFound('الاشتراك غير موجود / Subscription not found')
  }

  return formatSubscriptionDto(subscription, userRole)
}

/**
 * Retrieves all subscriptions for a specific member ordered by newest first.
 */
export async function getMemberSubscriptions(
  memberId: string,
  gymId: string,
  userRole?: Role
): Promise<SubscriptionDto[]> {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
  })

  if (!member) {
    throw AppError.notFound('العضو غير موجود / Member not found')
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { memberId, gymId },
    orderBy: { createdAt: 'desc' },
    include: {
      member: true,
      plan: true,
      cancelledByUser: {
        select: { id: true, name: true, role: true },
      },
    },
  })

  return subscriptions.map((s) => formatSubscriptionDto(s, userRole))
}

/**
 * Retrieves the current active or frozen subscription for a member.
 */
export async function getMemberCurrentSubscription(
  memberId: string,
  gymId: string
): Promise<SubscriptionDto | null> {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
  })

  if (!member) {
    throw AppError.notFound('العضو غير موجود / Member not found')
  }

  const subscriptions = await prisma.subscription.findMany({
    where: {
      memberId,
      gymId,
      status: {
        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.FROZEN],
      },
    },
    orderBy: { endDate: 'desc' },
    include: {
      member: true,
      plan: true,
    },
  })

  const current = subscriptions.find((sub) => {
    const effStatus = getEffectiveSubscriptionStatus(sub)
    return effStatus === SubscriptionStatus.ACTIVE || effStatus === SubscriptionStatus.FROZEN
  })

  return current ? formatSubscriptionDto(current) : null
}
/**
 * Formats a raw SubscriptionFreeze database model into a safe DTO.
 */
export function formatSubscriptionFreezeDto(freeze: any): SubscriptionFreezeDto {
  return {
    id: freeze.id,
    gymId: freeze.gymId,
    subscriptionId: freeze.subscriptionId,
    startDate:
      freeze.startDate instanceof Date
        ? freeze.startDate.toISOString()
        : String(freeze.startDate),
    endDate:
      freeze.endDate instanceof Date
        ? freeze.endDate.toISOString()
        : String(freeze.endDate),
    days: freeze.days,
    reason: freeze.reason ?? null,
    createdByUserId: freeze.createdByUserId,
    createdAt:
      freeze.createdAt instanceof Date
        ? freeze.createdAt.toISOString()
        : String(freeze.createdAt),
    createdByUser: freeze.createdByUser
      ? {
          id: freeze.createdByUser.id,
          name: freeze.createdByUser.name,
          role: freeze.createdByUser.role,
        }
      : undefined,
  }
}

/**
 * Freezes an active subscription for a specified number of days (3, 7, 15, 30, up to 90 days),
 * pushing its expiration date and recording an immutable history entry.
 */
export async function freezeSubscription(
  gymId: string,
  subscriptionId: string,
  userId: string,
  input: FreezeSubscriptionInput
): Promise<{ subscription: SubscriptionDto; freeze: SubscriptionFreezeDto }> {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch subscription and check gym isolation
    const subscription = await tx.subscription.findFirst({
      where: { id: subscriptionId, gymId },
      include: {
        member: true,
        plan: true,
        gym: true,
      },
    })

    if (!subscription) {
      throw AppError.notFound('الاشتراك غير موجود / Subscription not found')
    }

    // 1.1 Load and enforce gym freeze policy
    const gym = subscription.gym ?? (subscription as any).gym

    if (gym && gym.subscriptionFreezeEnabled === false) {
      throw AppError.conflict('تجميد الاشتراكات معطل وفق سياسة النادي / Subscription freezing is disabled by gym policy')
    }

    const allowedDurations: number[] =
      gym && Array.isArray(gym.allowedFreezeDurations)
        ? (gym.allowedFreezeDurations as number[])
        : [3, 7, 15, 30]

    const maxFreezeDays = gym?.maxFreezeDays ?? 90

    if (input.days > maxFreezeDays) {
      throw AppError.badRequest(
        `مدة التجميد المطلوبة (${input.days} يوم) تتجاوز الحد الأقصى المسموح به (${maxFreezeDays} يوم) / Requested duration exceeds maxFreezeDays`
      )
    }

    if (!allowedDurations.includes(input.days)) {
      throw AppError.badRequest(
        `مدة التجميد (${input.days} يوم) غير مسموح بها وفق سياسة النادي / Freeze duration is not allowed by policy`
      )
    }

    // 2. Member must be active
    if (!subscription.member.isActive) {
      throw AppError.conflict('لا يمكن تجميد اشتراك لعضو غير نشط / Cannot freeze subscription for inactive member')
    }

    // 3. Status validation
    if (subscription.status === SubscriptionStatus.FROZEN) {
      throw AppError.conflict('الاشتراك مجمد بالفعل / Subscription is already frozen')
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw AppError.conflict('لا يمكن تجميد اشتراك ملغى / Cannot freeze cancelled subscription')
    }

    const effectiveStatus = getEffectiveSubscriptionStatus(subscription)

    if (subscription.status === SubscriptionStatus.EXPIRED || effectiveStatus === SubscriptionStatus.EXPIRED) {
      throw AppError.conflict('لا يمكن تجميد اشتراك منتهي / Cannot freeze expired subscription')
    }

    if (effectiveStatus !== SubscriptionStatus.ACTIVE) {
      throw AppError.conflict('يمكن تجميد الاشتراكات النشطة فقط / Only active subscriptions can be frozen')
    }

    // 4. Calculate freeze dates & new subscription end date
    const freezeStartDate = getCurrentCairoDate()
    const freezeEndDate = calculateSubscriptionEndDate(freezeStartDate, input.days)

    const originalEndDate = new Date(subscription.endDate)
    const newEndDate = new Date(originalEndDate)
    newEndDate.setUTCDate(newEndDate.getUTCDate() + input.days)

    // 5. Update subscription
    const updatedSubscription = await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.FROZEN,
        endDate: newEndDate,
      },
      include: {
        member: true,
        plan: true,
      },
    })

    // 6. Create freeze history record
    const freezeRecord = await tx.subscriptionFreeze.create({
      data: {
        gymId,
        subscriptionId: subscription.id,
        startDate: freezeStartDate,
        endDate: freezeEndDate,
        days: input.days,
        reason: input.reason?.trim() || null,
        createdByUserId: userId,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    return {
      subscription: formatSubscriptionDto(updatedSubscription),
      freeze: formatSubscriptionFreezeDto(freezeRecord),
    }
  })

  // Create SUBSCRIPTION_FROZEN notification after successful transaction
  await createNotificationForRecipients({
    gymId,
    type: NotificationType.SUBSCRIPTION_FROZEN,
    title: 'تجميد اشتراك',
    message: `تم تجميد اشتراك العضو "${result.subscription.member?.name || 'العضو'}" بنجاح لمدة ${input.days} يوم.`,
    entityType: 'SUBSCRIPTION',
    entityId: result.subscription.id,
    deduplicationBaseKey: `subscription-frozen:${result.freeze.id}`,
  })

  await createAuditLog({
    gymId,
    actorUserId: userId,
    action: AUDIT_ACTIONS.SUBSCRIPTION_FROZEN,
    entityType: AUDIT_ENTITY_TYPES.SUBSCRIPTION,
    entityId: result.subscription.id,
    description: `تم تجميد اشتراك العضو (${result.subscription.member?.name || 'العضو'}) لمدة (${input.days}) يوم`,
    metadata: { days: input.days, reason: input.reason },
    afterData: result.subscription,
  })

  // Emit real-time event across the gym
  emitGymEvent(gymId, REALTIME_EVENTS.SUBSCRIPTION_FROZEN, {
    subscription: result.subscription,
    memberId: result.subscription.memberId,
  })

  return result
}

/**
 * Retrieves freeze history for a subscription.
 */
export async function getSubscriptionFreezes(
  gymId: string,
  subscriptionId: string
): Promise<FreezeListResult> {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, gymId },
  })

  if (!subscription) {
    throw AppError.notFound('الاشتراك غير موجود / Subscription not found')
  }

  const freezes = await prisma.subscriptionFreeze.findMany({
    where: { gymId, subscriptionId },
    orderBy: { createdAt: 'desc' },
    include: {
      createdByUser: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  })

  return {
    freezes: freezes.map(formatSubscriptionFreezeDto),
    total: freezes.length,
  }
}

/**
 * Renews a subscription by creating a NEW subscription record with snapshotted current plan values.
 * Never overwrites or deletes the previous subscription.
 */
export async function renewSubscription(
  gymId: string,
  subscriptionId: string,
  input: RenewSubscriptionInput,
  actorUserId?: string
): Promise<SubscriptionDto> {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch previous subscription
    const previousSubscription = await tx.subscription.findFirst({
      where: { id: subscriptionId, gymId },
      include: {
        member: true,
        plan: true,
      },
    })

    if (!previousSubscription) {
      throw AppError.notFound('الاشتراك السابق غير موجود / Previous subscription not found')
    }

    // 2. Member must be active
    if (!previousSubscription.member.isActive) {
      throw AppError.conflict('لا يمكن تجديد اشتراك لعضو غير نشط / Cannot renew subscription for inactive member')
    }

    // 2.1 Cancelled subscriptions cannot be renewed directly
    if (previousSubscription.status === SubscriptionStatus.CANCELLED) {
      throw AppError.conflict(
        'لا يمكن تجديد اشتراك ملغى مباشرة، يرجى إنشاء اشتراك جديد / Cannot renew a cancelled subscription directly. Please create a new subscription.'
      )
    }

    // 3. Fetch current plan
    const plan = await tx.membershipPlan.findFirst({
      where: { id: input.planId, gymId },
    })

    if (!plan) {
      throw AppError.notFound('باقة الاشتراك غير موجودة / Membership plan not found')
    }

    if (!plan.isActive) {
      throw AppError.conflict('لا يمكن تجديد اشتراك باستخدام باقة غير نشطة / Cannot renew using disabled plan')
    }

    // 4. Determine deterministic start date
    const now = new Date()
    const effStatus = getEffectiveSubscriptionStatus(previousSubscription)
    let startDate: Date

    if (
      effStatus === SubscriptionStatus.ACTIVE &&
      now.getTime() <= new Date(previousSubscription.endDate).getTime()
    ) {
      // Starts the day after previous subscription's end date
      const prevEnd = new Date(previousSubscription.endDate)
      startDate = new Date(
        Date.UTC(prevEnd.getUTCFullYear(), prevEnd.getUTCMonth(), prevEnd.getUTCDate() + 1, 0, 0, 0, 0)
      )
    } else {
      startDate = input.startDate ? parseDate(input.startDate) : getCurrentCairoDate()
    }

    const endDate = calculateSubscriptionEndDate(startDate, plan.durationDays)

    // 5. Create new subscription with snapshotted plan values
    const newSubscription = await tx.subscription.create({
      data: {
        gymId,
        memberId: previousSubscription.memberId,
        planId: plan.id,
        planName: plan.name,
        planPrice: plan.price,
        durationDays: plan.durationDays,
        currency: plan.currency,
        startDate,
        endDate,
        status: SubscriptionStatus.ACTIVE,
        notes: input.notes?.trim() || null,
      },
      include: {
        member: true,
        plan: true,
      },
    })

    return formatSubscriptionDto(newSubscription)
  })

  // Create SUBSCRIPTION_RENEWED notification after successful transaction
  await createNotificationForRecipients({
    gymId,
    type: NotificationType.SUBSCRIPTION_RENEWED,
    title: 'تجديد اشتراك',
    message: `تم تجديد اشتراك العضو "${result.member?.name || 'العضو'}" بنجاح لباقة "${result.planName}".`,
    entityType: 'SUBSCRIPTION',
    entityId: result.id,
    deduplicationBaseKey: `subscription-renewed:${result.id}`,
  })

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.SUBSCRIPTION_RENEWED,
    entityType: AUDIT_ENTITY_TYPES.SUBSCRIPTION,
    entityId: result.id,
    description: `تم تجديد اشتراك العضو (${result.member?.name || 'العضو'}) لباقة (${result.planName})`,
    afterData: result,
  })

  // Emit real-time event across the gym
  emitGymEvent(gymId, REALTIME_EVENTS.SUBSCRIPTION_RENEWED, {
    subscription: result,
    memberId: result.memberId,
  })

  return result
}

/**
 * Cancels an active or frozen subscription.
 * Only ACTIVE or FROZEN subscriptions can be cancelled.
 * EXPIRED or CANCELLED subscriptions cannot be cancelled (409 Conflict).
 * Atomic transaction ensures concurrency safety and creates audit log.
 */
export async function cancelSubscription(
  gymId: string,
  subscriptionId: string,
  input: CancelSubscriptionInput,
  actorUserId?: string,
  userRole?: Role
): Promise<SubscriptionDto> {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch current subscription
    const subscription = await tx.subscription.findFirst({
      where: { id: subscriptionId, gymId },
      include: {
        member: true,
        plan: true,
        cancelledByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    if (!subscription) {
      throw AppError.notFound('الاشتراك غير موجود / Subscription not found')
    }

    // 2. Validate current status
    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw AppError.conflict('الاشتراك ملغى بالفعل / Subscription is already cancelled')
    }

    if (subscription.status === SubscriptionStatus.EXPIRED) {
      throw AppError.conflict('لا يمكن إلغاء اشتراك منتهي / Cannot cancel expired subscription')
    }

    const effectiveStatus = getEffectiveSubscriptionStatus(subscription)
    if (effectiveStatus === SubscriptionStatus.EXPIRED) {
      throw AppError.conflict('لا يمكن إلغاء اشتراك منتهي / Cannot cancel expired subscription')
    }

    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.FROZEN
    ) {
      throw AppError.conflict(
        'يمكن إلغاء الاشتراكات النشطة أو المجمدة فقط / Only active or frozen subscriptions can be cancelled'
      )
    }

    const trimmedReason = input.reason.trim()
    const trimmedNotes = input.notes ? input.notes.trim() : null
    const cancelledAt = new Date()

    // 3. Concurrency guard using updateMany
    const updateResult = await tx.subscription.updateMany({
      where: {
        id: subscriptionId,
        gymId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.FROZEN] },
      },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt,
        cancellationReason: trimmedReason,
        cancellationNotes: trimmedNotes,
        cancelledByUserId: actorUserId ?? null,
      },
    })

    if (updateResult.count === 0) {
      throw AppError.conflict(
        'تعذر إلغاء الاشتراك نظراً لتغير حالته / Failed to cancel subscription due to state conflict'
      )
    }

    // 4. Fetch updated subscription with relations
    const updated = await tx.subscription.findFirst({
      where: { id: subscriptionId, gymId },
      include: {
        member: true,
        plan: true,
        cancelledByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    if (!updated) {
      throw AppError.notFound('الاشتراك غير موجود / Subscription not found')
    }

    // 5. Create audit log within transaction
    await createAuditLog({
      gymId,
      actorUserId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED,
      entityType: AUDIT_ENTITY_TYPES.SUBSCRIPTION,
      entityId: updated.id,
      description: `تم إلغاء اشتراك العضو (${updated.member?.name || 'العضو'}) لباقة (${updated.planName}) بسبب: ${trimmedReason}`,
      metadata: {
        reason: trimmedReason,
        notes: trimmedNotes,
        previousStatus: subscription.status,
      },
      beforeData: subscription,
      afterData: updated,
      tx,
    })

    return formatSubscriptionDto(updated, userRole)
  })

  // 6. Broadcast real-time cancellation
  emitGymEvent(gymId, REALTIME_EVENTS.SUBSCRIPTION_CANCELLED, {
    subscriptionId: result.id,
    memberId: result.memberId,
    status: result.status,
  })

  return result
}
