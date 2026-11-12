import { prisma } from '../config/database.js'
import { sanitizeAuditData } from '../utils/sanitize.util.js'
import { AppError } from '../utils/appError.util.js'
import { logger } from '../utils/logger.util.js'
import type {
  CreateAuditLogParams,
  AuditLogQueryFilter,
  AuditLogListResult,
  AuditLogResponseDto,
} from '../types/audit.types.js'

/**
 * Creates an immutable audit log entry.
 * Strips sensitive data (passwords, tokens, secrets) before persisting.
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  const {
    gymId,
    actorUserId,
    action,
    entityType,
    entityId,
    description,
    metadata,
    beforeData,
    afterData,
    tx,
  } = params

  const client = tx ?? prisma

  const sanitizedMetadata = metadata ? sanitizeAuditData(metadata) : null
  const sanitizedBefore = beforeData ? sanitizeAuditData(beforeData) : null
  const sanitizedAfter = afterData ? sanitizeAuditData(afterData) : null

  try {
    await client.auditLog.create({
      data: {
        gymId,
        actorUserId: actorUserId ?? null,
        action,
        entityType,
        entityId: entityId ?? null,
        description,
        metadata: sanitizedMetadata ?? undefined,
        beforeData: sanitizedBefore ?? undefined,
        afterData: sanitizedAfter ?? undefined,
      },
    })
  } catch (error) {
    logger.error('Failed to write audit log entry:', error)
    if (tx) {
      // If running inside a transaction, re-throw to maintain transactional integrity
      throw error
    }
  }
}

/**
 * Retrieves paginated audit logs for a gym with flexible filtering.
 */
export async function listAuditLogs(
  gymId: string,
  filter: AuditLogQueryFilter = {}
): Promise<AuditLogListResult> {
  const page = Math.max(1, filter.page ?? 1)
  const limit = Math.min(100, Math.max(1, filter.limit ?? 20))
  const skip = (page - 1) * limit

  const where: any = {
    gymId,
  }

  if (filter.actorUserId) {
    where.actorUserId = filter.actorUserId
  }

  if (filter.action) {
    where.action = filter.action
  }

  if (filter.entityType) {
    where.entityType = filter.entityType
  }

  if (filter.entityId) {
    where.entityId = filter.entityId
  }

  if (filter.search && filter.search.trim().length > 0) {
    where.description = {
      contains: filter.search.trim(),
    }
  }

  if (filter.fromDate || filter.toDate) {
    where.createdAt = {}
    if (filter.fromDate) {
      where.createdAt.gte = new Date(`${filter.fromDate}T00:00:00.000Z`)
    }
    if (filter.toDate) {
      where.createdAt.lte = new Date(`${filter.toDate}T23:59:59.999Z`)
    }
  }

  const [total, records] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    }),
  ])

  const data: AuditLogResponseDto[] = records.map((log) => ({
    id: log.id,
    gymId: log.gymId,
    actorUserId: log.actorUserId,
    actorUser: log.actorUser,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    description: log.description,
    metadata: (log.metadata as Record<string, any>) ?? null,
    beforeData: (log.beforeData as Record<string, any>) ?? null,
    afterData: (log.afterData as Record<string, any>) ?? null,
    createdAt: log.createdAt,
  }))

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

/**
 * Retrieves a single audit log entry by ID, strictly enforcing gym tenant isolation.
 */
export async function getAuditLogById(
  gymId: string,
  id: string
): Promise<AuditLogResponseDto> {
  const log = await prisma.auditLog.findFirst({
    where: {
      id,
      gymId,
    },
    include: {
      actorUser: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  })

  if (!log) {
    throw AppError.notFound('سجل العمليات غير موجود')
  }

  return {
    id: log.id,
    gymId: log.gymId,
    actorUserId: log.actorUserId,
    actorUser: log.actorUser,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    description: log.description,
    metadata: (log.metadata as Record<string, any>) ?? null,
    beforeData: (log.beforeData as Record<string, any>) ?? null,
    afterData: (log.afterData as Record<string, any>) ?? null,
    createdAt: log.createdAt,
  }
}
