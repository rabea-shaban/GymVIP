import { Role, NotificationType, Prisma } from '@prisma/client'
import { prisma } from '../config/database.js'
import { AppError } from '../utils/appError.util.js'
import { logger } from '../utils/logger.util.js'
import { getCurrentCairoDate, getEffectiveSubscriptionStatus } from '../utils/date.util.js'
import type {
  NotificationDto,
  NotificationFilterParams,
  NotificationListResult,
} from '../types/notification.types.js'

export const formatNotificationDto = (notification: {
  id: string
  gymId: string
  recipientUserId: string
  type: NotificationType
  title: string
  message: string
  entityType: string | null
  entityId: string | null
  isRead: boolean
  readAt: Date | null
  deduplicationKey: string | null
  createdAt: Date
}): NotificationDto => ({
  id: notification.id,
  gymId: notification.gymId,
  recipientUserId: notification.recipientUserId,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  entityType: notification.entityType,
  entityId: notification.entityId,
  isRead: notification.isRead,
  readAt: notification.readAt,
  deduplicationKey: notification.deduplicationKey,
  createdAt: notification.createdAt,
})

/**
 * Resolves active staff recipients in the gym (excludes TRAINER by default, or specific excluded roles)
 */
export const getEligibleRecipients = async (
  gymId: string,
  excludeRoles: Role[] = [Role.TRAINER]
): Promise<{ id: string; role: Role }[]> => {
  try {
    return await prisma.user.findMany({
      where: {
        gymId,
        isActive: true,
        role: { notIn: excludeRoles },
      },
      select: {
        id: true,
        role: true,
      },
    })
  } catch (err) {
    logger.warn('Failed to fetch eligible recipients for notification:', err)
    return []
  }
}

/**
 * Creates notifications for all eligible recipients in the given gym
 * Idempotent via deduplicationKey per recipient
 */
export const createNotificationForRecipients = async (params: {
  gymId: string
  type: NotificationType
  title: string
  message: string
  entityType?: string | null
  entityId?: string | null
  deduplicationBaseKey?: string | null
  excludeRoles?: Role[]
}): Promise<void> => {
  try {
    const {
      gymId,
      type,
      title,
      message,
      entityType = null,
      entityId = null,
      deduplicationBaseKey = null,
      excludeRoles = [Role.TRAINER],
    } = params

    const recipients = await getEligibleRecipients(gymId, excludeRoles)
    if (recipients.length === 0) {
      return
    }

    // Insert notification for each recipient with safe duplicate handling
    await Promise.all(
      recipients.map(async (recipient) => {
        try {
          await prisma.notification.create({
            data: {
              gymId,
              recipientUserId: recipient.id,
              type,
              title,
              message,
              entityType,
              entityId,
              deduplicationKey: deduplicationBaseKey,
            },
          })
        } catch (err: unknown) {
          // If Prisma unique constraint violation (P2002), skip duplicate gracefully
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ) {
            return
          }
          logger.warn(`Failed to create notification for user ${recipient.id}:`, err)
        }
      })
    )
  } catch (error) {
    logger.error('Error in createNotificationForRecipients:', error)
  }
}

/**
 * Lists notifications for a specific user within their gym
 */
export const listNotifications = async (
  gymId: string,
  recipientUserId: string,
  filters: NotificationFilterParams = {}
): Promise<NotificationListResult> => {
  const page = Math.max(1, filters.page ?? 1)
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20))
  const skip = (page - 1) * limit

  const where: Prisma.NotificationWhereInput = {
    gymId,
    recipientUserId,
    ...(filters.isRead !== undefined ? { isRead: filters.isRead } : {}),
    ...(filters.type ? { type: filters.type } : {}),
  }

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ])

  return {
    notifications: notifications.map(formatNotificationDto),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

/**
 * Gets count of unread notifications for a specific user
 */
export const getUnreadCount = async (
  gymId: string,
  recipientUserId: string
): Promise<{ unreadCount: number }> => {
  const unreadCount = await prisma.notification.count({
    where: {
      gymId,
      recipientUserId,
      isRead: false,
    },
  })

  return { unreadCount }
}

/**
 * Marks a single notification as read by its recipient
 */
export const markAsRead = async (
  gymId: string,
  recipientUserId: string,
  notificationId: string
): Promise<NotificationDto> => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  })

  if (!notification || notification.gymId !== gymId) {
    throw AppError.notFound('الإشعار غير موجود / Notification not found')
  }

  if (notification.recipientUserId !== recipientUserId) {
    throw AppError.forbidden('ليس لديك صلاحية للوصول إلى هذا الإشعار / Forbidden')
  }

  if (notification.isRead) {
    return formatNotificationDto(notification)
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })

  return formatNotificationDto(updated)
}

/**
 * Marks all notifications as read for a specific user in their gym
 */
export const markAllAsRead = async (
  gymId: string,
  recipientUserId: string
): Promise<{ updatedCount: number }> => {
  const result = await prisma.notification.updateMany({
    where: {
      gymId,
      recipientUserId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })

  return { updatedCount: result.count }
}

/**
 * Background job processor for subscription expiration alerts:
 * 1. 3 days before expiration (SUBSCRIPTION_EXPIRING)
 * 2. 1 day before expiration (SUBSCRIPTION_EXPIRING)
 * 3. Expired subscriptions (SUBSCRIPTION_EXPIRED)
 */
export const processSubscriptionExpirationReminders = async (): Promise<{
  expiringProcessed: number
  expiredProcessed: number
}> => {
  let expiringProcessed = 0
  let expiredProcessed = 0

  try {
    const todayCairo = getCurrentCairoDate()
    const todayMs = todayCairo.getTime()

    // Fetch all active or frozen subscriptions for active gyms
    const subscriptions = await prisma.subscription.findMany({
      where: {
        gym: { isActive: true },
        member: { isActive: true },
        status: { in: ['ACTIVE', 'FROZEN', 'EXPIRED'] },
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
            subscriptionReminderEnabled: true,
            subscriptionReminderDays: true,
          },
        },
        member: { select: { id: true, name: true, memberCode: true, isActive: true } },
      },
    })

    for (const sub of subscriptions) {
      if (!sub.member.isActive) continue
      if (sub.status === 'CANCELLED') continue

      // Effective status check
      const effectiveStatus = getEffectiveSubscriptionStatus(sub)
      if (effectiveStatus === 'CANCELLED' || effectiveStatus === 'FROZEN' || sub.status === 'FROZEN') {
        continue
      }

      // Check if this member has a newer active/future renewed subscription
      const newerRenewal = await prisma.subscription.findFirst({
        where: {
          gymId: sub.gymId,
          memberId: sub.memberId,
          status: { in: ['ACTIVE', 'FROZEN'] },
          startDate: { gt: sub.startDate },
        },
      })

      if (newerRenewal) {
        continue
      }

      // Calculate days difference between sub endDate and today in Cairo calendar days
      const endCairoDate = new Date(sub.endDate)
      const endCairoDay = new Date(
        Date.UTC(
          endCairoDate.getUTCFullYear(),
          endCairoDate.getUTCMonth(),
          endCairoDate.getUTCDate(),
          0,
          0,
          0,
          0
        )
      )
      const diffMs = endCairoDay.getTime() - todayMs
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
      const formattedEndDate = sub.endDate.toISOString().split('T')[0]

      // Check gym-specific reminder preferences
      const reminderEnabled = sub.gym.subscriptionReminderEnabled ?? true
      const configuredReminderDays: number[] = reminderEnabled
        ? (Array.isArray(sub.gym.subscriptionReminderDays)
            ? (sub.gym.subscriptionReminderDays as number[])
            : [3, 1])
        : []

      // Generate expiring reminder if enabled and matches configured offset
      if (reminderEnabled && effectiveStatus === 'ACTIVE' && configuredReminderDays.includes(diffDays)) {
        let daysText = `${diffDays} أيام`
        if (diffDays === 1) daysText = 'غداً'
        else if (diffDays === 3) daysText = 'خلال 3 أيام'
        else if (diffDays === 7) daysText = 'خلال 7 أيام'

        const title =
          diffDays === 1
            ? 'اشتراك على وشك الانتهاء (غداً)'
            : `اشتراك على وشك الانتهاء (${daysText})`

        const message =
          diffDays === 1
            ? `اشتراك العضو "${sub.member.name}" (${sub.planName}) سينتهي غداً بتاريخ ${formattedEndDate}.`
            : `اشتراك العضو "${sub.member.name}" (${sub.planName}) سينتهي ${daysText} بتاريخ ${formattedEndDate}.`

        await createNotificationForRecipients({
          gymId: sub.gymId,
          type: NotificationType.SUBSCRIPTION_EXPIRING,
          title,
          message,
          entityType: 'SUBSCRIPTION',
          entityId: sub.id,
          deduplicationBaseKey: `subscription-expiring:${sub.id}:${diffDays}d`,
        })
        expiringProcessed++
      }

      // 3. Check for expired subscriptions
      if (diffDays <= 0 || effectiveStatus === 'EXPIRED') {
        await createNotificationForRecipients({
          gymId: sub.gymId,
          type: NotificationType.SUBSCRIPTION_EXPIRED,
          title: 'انتهاء اشتراك',
          message: `انتهى اشتراك العضو "${sub.member.name}" (${sub.planName}) بتاريخ ${formattedEndDate}.`,
          entityType: 'SUBSCRIPTION',
          entityId: sub.id,
          deduplicationBaseKey: `subscription-expired:${sub.id}`,
        })
        expiredProcessed++
      }
    }
  } catch (err) {
    logger.error('Error during processSubscriptionExpirationReminders:', err)
  }

  return { expiringProcessed, expiredProcessed }
}
