import { Prisma } from '@prisma/client'
import type { MembershipPlan } from '@prisma/client'
import { prisma } from '../config/database.js'
import { AppError } from '../utils/appError.util.js'
import type { PlanDto, PlanListResult } from '../types/plan.types.js'
import type {
  CreatePlanInput,
  UpdatePlanInput,
  UpdatePlanStatusInput,
  PlanQueryParams,
} from '../validators/plan.validator.js'
import { createAuditLog } from './audit.service.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../types/audit.types.js'
import { emitGymEvent, REALTIME_EVENTS } from './socket.service.js'

/**
 * Formats a raw Prisma MembershipPlan record into a clean, safe DTO
 * Serializes price to stable string with 2 decimal places
 */
export function formatPlanDto(plan: MembershipPlan): PlanDto {
  const priceDecimal = Number(plan.price)
  const formattedPrice = isNaN(priceDecimal) ? '0.00' : priceDecimal.toFixed(2)

  return {
    id: plan.id,
    gymId: plan.gymId,
    name: plan.name,
    description: plan.description ?? null,
    durationDays: plan.durationDays,
    price: formattedPrice,
    currency: plan.currency,
    isActive: plan.isActive,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  }
}

/**
 * Creates a new membership plan for the authenticated gym
 */
export async function createPlan(
  gymId: string,
  input: CreatePlanInput,
  actorUserId?: string
): Promise<PlanDto> {
  // 1. Check for duplicate plan name in the same gym
  const existingPlan = await prisma.membershipPlan.findUnique({
    where: {
      gymId_name: {
        gymId,
        name: input.name,
      },
    },
  })

  if (existingPlan) {
    throw AppError.conflict(
      'اسم الباقة مستخدم بالفعل داخل هذا الجيم / Plan name already exists in this gym'
    )
  }

  const plan = await prisma.membershipPlan.create({
    data: {
      gymId,
      name: input.name,
      description: input.description ?? null,
      durationDays: input.durationDays,
      price: new Prisma.Decimal(input.price),
      currency: 'EGP',
      isActive: true,
    },
  })

  const dto = formatPlanDto(plan)

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.PLAN_CREATED,
    entityType: AUDIT_ENTITY_TYPES.PLAN,
    entityId: plan.id,
    description: `تم إنشاء باقة اشتراك جديدة (${plan.name}) بسعر (${dto.price} ${dto.currency})`,
    afterData: dto,
  })

  emitGymEvent(gymId, REALTIME_EVENTS.SYSTEM_SYNC, { entity: 'plans', action: 'created', planId: plan.id })

  return dto
}

/**
 * Retrieves a paginated list of membership plans for the gym with filtering & search
 */
export async function getPlans(
  gymId: string,
  query: PlanQueryParams
): Promise<PlanListResult> {
  const page = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(1, query.limit || 20))
  const skip = (page - 1) * limit

  const where: Prisma.MembershipPlanWhereInput = {
    gymId,
  }

  // Filter by status: active (default), inactive, or all
  if (query.status === 'active') {
    where.isActive = true
  } else if (query.status === 'inactive') {
    where.isActive = false
  }

  // Search across name, description
  if (query.search && query.search.trim().length > 0) {
    const term = query.search.trim()
    where.OR = [
      { name: { contains: term } },
      { description: { contains: term } },
    ]
  }

  const [plans, total] = await Promise.all([
    prisma.membershipPlan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.membershipPlan.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit) || 0

  return {
    plans: plans.map(formatPlanDto),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  }
}

/**
 * Retrieves a single membership plan by ID ensuring gym isolation
 */
export async function getPlanById(
  gymId: string,
  planId: string
): Promise<PlanDto> {
  const plan = await prisma.membershipPlan.findFirst({
    where: {
      id: planId,
      gymId,
    },
  })

  if (!plan) {
    throw AppError.notFound('الباقة غير موجودة / Plan not found')
  }

  return formatPlanDto(plan)
}

/**
 * Updates an existing membership plan definition (Historical subscriptions remain untouched)
 */
export async function updatePlan(
  gymId: string,
  planId: string,
  input: UpdatePlanInput,
  actorUserId?: string
): Promise<PlanDto> {
  const existingPlan = await prisma.membershipPlan.findFirst({
    where: {
      id: planId,
      gymId,
    },
  })

  if (!existingPlan) {
    throw AppError.notFound('الباقة غير موجودة / Plan not found')
  }

  // If name is changing, check for duplicates in the same gym
  if (input.name && input.name !== existingPlan.name) {
    const duplicatePlan = await prisma.membershipPlan.findUnique({
      where: {
        gymId_name: {
          gymId,
          name: input.name,
        },
      },
    })

    if (duplicatePlan) {
      throw AppError.conflict(
        'اسم الباقة مستخدم بالفعل داخل هذا الجيم / Plan name already exists in this gym'
      )
    }
  }

  const updateData: Prisma.MembershipPlanUpdateInput = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description ?? null
  if (input.durationDays !== undefined) updateData.durationDays = input.durationDays
  if (input.price !== undefined) updateData.price = new Prisma.Decimal(input.price)

  const updatedPlan = await prisma.membershipPlan.update({
    where: { id: planId },
    data: updateData,
  })

  const dto = formatPlanDto(updatedPlan)

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.PLAN_UPDATED,
    entityType: AUDIT_ENTITY_TYPES.PLAN,
    entityId: updatedPlan.id,
    description: `تم تعديل باقة الاشتراك (${updatedPlan.name})`,
    beforeData: formatPlanDto(existingPlan),
    afterData: dto,
  })

  emitGymEvent(gymId, REALTIME_EVENTS.SYSTEM_SYNC, { entity: 'plans', action: 'updated', planId: updatedPlan.id })

  return dto
}

/**
 * Activates or disables a membership plan
 */
export async function updatePlanStatus(
  gymId: string,
  planId: string,
  input: UpdatePlanStatusInput,
  actorUserId?: string
): Promise<PlanDto> {
  const existingPlan = await prisma.membershipPlan.findFirst({
    where: {
      id: planId,
      gymId,
    },
  })

  if (!existingPlan) {
    throw AppError.notFound('الباقة غير موجودة / Plan not found')
  }

  const updatedPlan = await prisma.membershipPlan.update({
    where: { id: planId },
    data: {
      isActive: input.isActive,
    },
  })

  const dto = formatPlanDto(updatedPlan)

  await createAuditLog({
    gymId,
    actorUserId,
    action: input.isActive ? AUDIT_ACTIONS.PLAN_ACTIVATED : AUDIT_ACTIONS.PLAN_DEACTIVATED,
    entityType: AUDIT_ENTITY_TYPES.PLAN,
    entityId: updatedPlan.id,
    description: input.isActive
      ? `تم تفعيل باقة الاشتراك (${updatedPlan.name})`
      : `تم تعطيل باقة الاشتراك (${updatedPlan.name})`,
    beforeData: { isActive: existingPlan.isActive },
    afterData: { isActive: updatedPlan.isActive },
  })

  emitGymEvent(gymId, REALTIME_EVENTS.SYSTEM_SYNC, { entity: 'plans', action: 'status_changed', planId: updatedPlan.id })

  return dto
}

/**
 * Helper assertion for future Subscription feature (Feature 7)
 * Ensures plan exists, belongs to authenticated gym, and is currently active
 */
export async function assertPlanAvailableForNewSubscription(
  planId: string,
  gymId: string
): Promise<MembershipPlan> {
  const plan = await prisma.membershipPlan.findFirst({
    where: {
      id: planId,
      gymId,
    },
  })

  if (!plan) {
    throw AppError.notFound('الباقة غير موجودة / Plan not found')
  }

  if (!plan.isActive) {
    throw AppError.badRequest(
      'لا يمكن استخدام باقة معطلة لإنشاء اشتراك جديد / Cannot use disabled plan for new subscription'
    )
  }

  return plan
}

/**
 * Deletes a membership plan if it has no associated subscriptions
 */
export async function deletePlan(
  gymId: string,
  planId: string,
  actorUserId?: string
): Promise<void> {
  const existingPlan = await prisma.membershipPlan.findFirst({
    where: { id: planId, gymId },
    include: { _count: { select: { subscriptions: true } } },
  })

  if (!existingPlan) {
    throw AppError.notFound('الباقة غير موجودة / Plan not found')
  }

  if (existingPlan._count.subscriptions > 0) {
    throw AppError.conflict(
      'لا يمكن حذف هذه الباقة نظراً لوجود اشتراكات مرتبطة بها. يمكنك تعطيل الباقة بدلاً من ذلك.'
    )
  }

  await prisma.membershipPlan.delete({
    where: { id: planId },
  })

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.PLAN_DELETED,
    entityType: AUDIT_ENTITY_TYPES.PLAN,
    entityId: planId,
    description: `تم حذف باقة الاشتراك (${existingPlan.name}) نهائياً`,
    beforeData: formatPlanDto(existingPlan),
  })

  emitGymEvent(gymId, REALTIME_EVENTS.SYSTEM_SYNC, { entity: 'plans', action: 'deleted', planId })
}

