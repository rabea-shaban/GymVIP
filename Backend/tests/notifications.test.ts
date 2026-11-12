import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { Role, Prisma, NotificationType, SubscriptionStatus, PaymentMethod } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'
import {
  processSubscriptionExpirationReminders,
  createNotificationForRecipients,
} from '../src/services/notification.service.js'
import { getCurrentCairoDate } from '../src/utils/date.util.js'
import { runDailySubscriptionRemindersJob } from '../src/jobs/scheduler.job.js'

describe('Feature 12: Notifications & Alerts Integration Tests', () => {
  const mockGymId = 'gym-uuid-1'
  const mockOtherGymId = 'gym-uuid-2'

  const mockOwnerId = 'owner-uuid-1'
  const mockManagerId = 'manager-uuid-1'
  const mockReceptionistId = 'receptionist-uuid-1'
  const mockTrainerId = 'trainer-uuid-1'
  const mockOtherGymUserId = 'other-user-uuid-1'

  const ownerToken = generateAuthToken({
    sub: mockOwnerId,
    gymId: mockGymId,
    role: Role.OWNER,
  })

  const managerToken = generateAuthToken({
    sub: mockManagerId,
    gymId: mockGymId,
    role: Role.MANAGER,
  })

  const trainerToken = generateAuthToken({
    sub: mockTrainerId,
    gymId: mockGymId,
    role: Role.TRAINER,
  })

  const otherGymToken = generateAuthToken({
    sub: mockOtherGymUserId,
    gymId: mockOtherGymId,
    role: Role.OWNER,
  })

  const sampleNotifications = [
    {
      id: 'notif-1',
      gymId: mockGymId,
      recipientUserId: mockOwnerId,
      type: NotificationType.SUBSCRIPTION_EXPIRING,
      title: 'اشتراك على وشك الانتهاء',
      message: 'سينتهي اشتراك العضو أحمد قريباً',
      entityType: 'SUBSCRIPTION',
      entityId: 'sub-uuid-1',
      isRead: false,
      readAt: null,
      deduplicationKey: 'subscription-expiring:sub-uuid-1:3d',
      createdAt: new Date('2026-10-09T10:00:00.000Z'),
    },
    {
      id: 'notif-2',
      gymId: mockGymId,
      recipientUserId: mockOwnerId,
      type: NotificationType.PAYMENT_RECEIVED,
      title: 'تسجيل دفعة جديدة',
      message: 'تم استلام دفعة بقيمة 500 ج.م',
      entityType: 'PAYMENT',
      entityId: 'pay-uuid-1',
      isRead: true,
      readAt: new Date('2026-10-09T11:00:00.000Z'),
      deduplicationKey: 'payment-received:pay-uuid-1',
      createdAt: new Date('2026-10-09T09:00:00.000Z'),
    },
    {
      id: 'notif-3',
      gymId: mockGymId,
      recipientUserId: mockManagerId,
      type: NotificationType.SUBSCRIPTION_FROZEN,
      title: 'تجميد اشتراك',
      message: 'تم تجميد اشتراك العضو خالد',
      entityType: 'SUBSCRIPTION',
      entityId: 'sub-uuid-2',
      isRead: false,
      readAt: null,
      deduplicationKey: 'subscription-frozen:freeze-uuid-1',
      createdAt: new Date('2026-10-09T08:00:00.000Z'),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock user finds for auth middleware
    prisma.user.findUnique = vi.fn().mockImplementation(({ where }) => {
      if (where.id === mockOwnerId) {
        return Promise.resolve({
          id: mockOwnerId,
          gymId: mockGymId,
          role: Role.OWNER,
          isActive: true,
          gym: { id: mockGymId, isActive: true },
        })
      }
      if (where.id === mockManagerId) {
        return Promise.resolve({
          id: mockManagerId,
          gymId: mockGymId,
          role: Role.MANAGER,
          isActive: true,
          gym: { id: mockGymId, isActive: true },
        })
      }
      if (where.id === mockTrainerId) {
        return Promise.resolve({
          id: mockTrainerId,
          gymId: mockGymId,
          role: Role.TRAINER,
          isActive: true,
          gym: { id: mockGymId, isActive: true },
        })
      }
      if (where.id === mockOtherGymUserId) {
        return Promise.resolve({
          id: mockOtherGymUserId,
          gymId: mockOtherGymId,
          role: Role.OWNER,
          isActive: true,
          gym: { id: mockOtherGymId, isActive: true },
        })
      }
      return Promise.resolve(null)
    })
  })

  // =========================================================================
  // 1. GET /api/v1/notifications
  // =========================================================================
  describe('GET /api/v1/notifications', () => {
    it('1. should list notifications for authenticated user with pagination', async () => {
      prisma.notification.count = vi.fn().mockResolvedValue(2)
      prisma.notification.findMany = vi.fn().mockResolvedValue([
        sampleNotifications[0],
        sampleNotifications[1],
      ])

      const res = await request(app)
        .get('/api/v1/notifications?page=1&limit=10')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.notifications).toHaveLength(2)
      expect(res.body.data.pagination.total).toBe(2)
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gymId: mockGymId,
            recipientUserId: mockOwnerId,
          }),
        })
      )
    })

    it('2. should filter notifications by isRead=false', async () => {
      prisma.notification.count = vi.fn().mockResolvedValue(1)
      prisma.notification.findMany = vi.fn().mockResolvedValue([sampleNotifications[0]])

      const res = await request(app)
        .get('/api/v1/notifications?isRead=false')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isRead: false,
          }),
        })
      )
    })

    it('3. should filter notifications by type=PAYMENT_RECEIVED', async () => {
      prisma.notification.count = vi.fn().mockResolvedValue(1)
      prisma.notification.findMany = vi.fn().mockResolvedValue([sampleNotifications[1]])

      const res = await request(app)
        .get('/api/v1/notifications?type=PAYMENT_RECEIVED')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: NotificationType.PAYMENT_RECEIVED,
          }),
        })
      )
    })

    it('4. should require authentication (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/v1/notifications')
      expect(res.status).toBe(401)
    })
  })

  // =========================================================================
  // 2. GET /api/v1/notifications/unread-count
  // =========================================================================
  describe('GET /api/v1/notifications/unread-count', () => {
    it('5. should return correct unread count for authenticated user', async () => {
      prisma.notification.count = vi.fn().mockResolvedValue(5)

      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.unreadCount).toBe(5)
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          gymId: mockGymId,
          recipientUserId: mockOwnerId,
          isRead: false,
        },
      })
    })
  })

  // =========================================================================
  // 3. PATCH /api/v1/notifications/:id/read
  // =========================================================================
  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('6. should mark user own notification as read', async () => {
      prisma.notification.findUnique = vi.fn().mockResolvedValue(sampleNotifications[0])
      prisma.notification.update = vi.fn().mockResolvedValue({
        ...sampleNotifications[0],
        isRead: true,
        readAt: new Date(),
      })

      const res = await request(app)
        .patch('/api/v1/notifications/notif-1/read')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.notification.isRead).toBe(true)
    })

    it('7. should forbid user from marking another user notification as read (403 Forbidden)', async () => {
      // notif-3 belongs to manager, owner tries to mark it
      prisma.notification.findUnique = vi.fn().mockResolvedValue(sampleNotifications[2])

      const res = await request(app)
        .patch('/api/v1/notifications/notif-3/read')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it('8. should return 404 if notification belongs to another gym', async () => {
      prisma.notification.findUnique = vi.fn().mockResolvedValue({
        ...sampleNotifications[0],
        gymId: mockOtherGymId,
      })

      const res = await request(app)
        .patch('/api/v1/notifications/notif-1/read')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(404)
    })
  })

  // =========================================================================
  // 4. PATCH /api/v1/notifications/read-all
  // =========================================================================
  describe('PATCH /api/v1/notifications/read-all', () => {
    it('9. should mark all notifications for authenticated user as read', async () => {
      prisma.notification.updateMany = vi.fn().mockResolvedValue({ count: 4 })

      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.updatedCount).toBe(4)
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          gymId: mockGymId,
          recipientUserId: mockOwnerId,
          isRead: false,
        },
        data: expect.objectContaining({
          isRead: true,
        }),
      })
    })
  })

  // =========================================================================
  // 5. Subscription Expiration Reminders & Background Job
  // =========================================================================
  describe('Subscription Expiration Reminders & Scheduler Job', () => {
    it('10. should create 3-day reminder for active subscription approaching end date', async () => {
      const today = getCurrentCairoDate()
      const endIn3Days = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 3, 23, 59, 59, 999))

      prisma.subscription.findMany = vi.fn().mockResolvedValue([
        {
          id: 'sub-exp-3d',
          gymId: mockGymId,
          memberId: 'member-1',
          planName: 'باقة 30 يوم',
          startDate: new Date('2026-09-13T00:00:00.000Z'),
          endDate: endIn3Days,
          status: SubscriptionStatus.ACTIVE,
          gym: { id: mockGymId, name: 'جيم VIP' },
          member: { id: 'member-1', name: 'أحمد محمود', memberCode: 'M-1', isActive: true },
        },
      ])

      prisma.subscription.findFirst = vi.fn().mockResolvedValue(null) // no newer renewal
      prisma.user.findMany = vi.fn().mockResolvedValue([
        { id: mockOwnerId, role: Role.OWNER },
        { id: mockManagerId, role: Role.MANAGER },
      ])
      prisma.notification.create = vi.fn().mockResolvedValue({})

      const result = await processSubscriptionExpirationReminders()

      expect(result.expiringProcessed).toBeGreaterThanOrEqual(1)
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gymId: mockGymId,
            type: NotificationType.SUBSCRIPTION_EXPIRING,
            entityType: 'SUBSCRIPTION',
            entityId: 'sub-exp-3d',
            deduplicationKey: 'subscription-expiring:sub-exp-3d:3d',
          }),
        })
      )
    })

    it('11. should not create reminder for FROZEN subscriptions', async () => {
      const endIn3Days = new Date('2026-10-12T23:59:59.999Z')

      prisma.subscription.findMany = vi.fn().mockResolvedValue([
        {
          id: 'sub-frozen',
          gymId: mockGymId,
          memberId: 'member-1',
          planName: 'باقة 30 يوم',
          startDate: new Date('2026-09-13T00:00:00.000Z'),
          endDate: endIn3Days,
          status: SubscriptionStatus.FROZEN,
          gym: { id: mockGymId, name: 'جيم VIP' },
          member: { id: 'member-1', name: 'أحمد محمود', memberCode: 'M-1', isActive: true },
        },
      ])

      prisma.subscription.findFirst = vi.fn().mockResolvedValue(null)
      prisma.notification.create = vi.fn()

      const result = await processSubscriptionExpirationReminders()
      expect(result.expiringProcessed).toBe(0)
      expect(prisma.notification.create).not.toHaveBeenCalled()
    })

    it('12. should not create reminder for CANCELLED subscriptions', async () => {
      const endIn3Days = new Date('2026-10-12T23:59:59.999Z')

      prisma.subscription.findMany = vi.fn().mockResolvedValue([
        {
          id: 'sub-cancelled',
          gymId: mockGymId,
          memberId: 'member-1',
          planName: 'باقة 30 يوم',
          startDate: new Date('2026-09-13T00:00:00.000Z'),
          endDate: endIn3Days,
          status: SubscriptionStatus.CANCELLED,
          gym: { id: mockGymId, name: 'جيم VIP' },
          member: { id: 'member-1', name: 'أحمد محمود', memberCode: 'M-1', isActive: true },
        },
      ])

      prisma.subscription.findFirst = vi.fn().mockResolvedValue(null)
      prisma.notification.create = vi.fn()

      const result = await processSubscriptionExpirationReminders()
      expect(result.expiringProcessed).toBe(0)
      expect(prisma.notification.create).not.toHaveBeenCalled()
    })

    it('13. should not create reminder for inactive members', async () => {
      const endIn3Days = new Date('2026-10-12T23:59:59.999Z')

      prisma.subscription.findMany = vi.fn().mockResolvedValue([
        {
          id: 'sub-inactive-member',
          gymId: mockGymId,
          memberId: 'member-1',
          planName: 'باقة 30 يوم',
          startDate: new Date('2026-09-13T00:00:00.000Z'),
          endDate: endIn3Days,
          status: SubscriptionStatus.ACTIVE,
          gym: { id: mockGymId, name: 'جيم VIP' },
          member: { id: 'member-1', name: 'أحمد محمود', memberCode: 'M-1', isActive: false },
        },
      ])

      prisma.subscription.findFirst = vi.fn().mockResolvedValue(null)
      prisma.notification.create = vi.fn()

      const result = await processSubscriptionExpirationReminders()
      expect(result.expiringProcessed).toBe(0)
      expect(prisma.notification.create).not.toHaveBeenCalled()
    })

    it('14. should not create reminder if subscription is already renewed with future active sub', async () => {
      const endIn3Days = new Date('2026-10-12T23:59:59.999Z')

      prisma.subscription.findMany = vi.fn().mockResolvedValue([
        {
          id: 'sub-old',
          gymId: mockGymId,
          memberId: 'member-1',
          planName: 'باقة 30 يوم',
          startDate: new Date('2026-09-13T00:00:00.000Z'),
          endDate: endIn3Days,
          status: SubscriptionStatus.ACTIVE,
          gym: { id: mockGymId, name: 'جيم VIP' },
          member: { id: 'member-1', name: 'أحمد محمود', memberCode: 'M-1', isActive: true },
        },
      ])

      // Already has a newer renewal
      prisma.subscription.findFirst = vi.fn().mockResolvedValue({
        id: 'sub-newer',
        startDate: new Date('2026-10-13T00:00:00.000Z'),
      })
      prisma.notification.create = vi.fn()

      const result = await processSubscriptionExpirationReminders()
      expect(result.expiringProcessed).toBe(0)
      expect(prisma.notification.create).not.toHaveBeenCalled()
    })

    it('15. should create EXPIRED notification for past subscription', async () => {
      const pastEndDate = new Date('2026-10-01T23:59:59.999Z')

      prisma.subscription.findMany = vi.fn().mockResolvedValue([
        {
          id: 'sub-expired-1',
          gymId: mockGymId,
          memberId: 'member-1',
          planName: 'باقة 30 يوم',
          startDate: new Date('2026-09-01T00:00:00.000Z'),
          endDate: pastEndDate,
          status: SubscriptionStatus.ACTIVE,
          gym: { id: mockGymId, name: 'جيم VIP' },
          member: { id: 'member-1', name: 'أحمد محمود', memberCode: 'M-1', isActive: true },
        },
      ])

      prisma.subscription.findFirst = vi.fn().mockResolvedValue(null)
      prisma.user.findMany = vi.fn().mockResolvedValue([
        { id: mockOwnerId, role: Role.OWNER },
      ])
      prisma.notification.create = vi.fn().mockResolvedValue({})

      const result = await processSubscriptionExpirationReminders()

      expect(result.expiredProcessed).toBeGreaterThanOrEqual(1)
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: NotificationType.SUBSCRIPTION_EXPIRED,
            entityId: 'sub-expired-1',
            deduplicationKey: 'subscription-expired:sub-expired-1',
          }),
        })
      )
    })

    it('16. scheduler job executes safely and returns success', async () => {
      prisma.subscription.findMany = vi.fn().mockResolvedValue([])
      const jobResult = await runDailySubscriptionRemindersJob()
      expect(jobResult.success).toBe(true)
    })
  })

  // =========================================================================
  // 6. Recipient Policy & Multi-tenant Scoping
  // =========================================================================
  describe('Recipient Scoping & Multi-tenancy', () => {
    it('17. should never send PAYMENT_RECEIVED notification to TRAINER', async () => {
      prisma.user.findMany = vi.fn().mockImplementation(({ where }) => {
        // Excludes TRAINER
        if (where.role && where.role.notIn) {
          return Promise.resolve([
            { id: mockOwnerId, role: Role.OWNER },
            { id: mockManagerId, role: Role.MANAGER },
          ])
        }
        return Promise.resolve([])
      })

      prisma.notification.create = vi.fn().mockResolvedValue({})

      await createNotificationForRecipients({
        gymId: mockGymId,
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'تسجيل دفعة',
        message: 'تم استلام دفعة',
        entityType: 'PAYMENT',
        entityId: 'pay-1',
        excludeRoles: [Role.TRAINER],
      })

      expect(prisma.notification.create).toHaveBeenCalledTimes(2)
      expect(prisma.notification.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientUserId: mockTrainerId,
          }),
        })
      )
    })

    it('18. should gracefully ignore unique constraint duplication without throwing', async () => {
      prisma.user.findMany = vi.fn().mockResolvedValue([{ id: mockOwnerId, role: Role.OWNER }])
      prisma.notification.create = vi.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        })
      )

      await expect(
        createNotificationForRecipients({
          gymId: mockGymId,
          type: NotificationType.SUBSCRIPTION_EXPIRING,
          title: 'تنبيه',
          message: 'تنبيه انتهاء',
          deduplicationBaseKey: 'dup-key-1',
        })
      ).resolves.not.toThrow()
    })
  })
})
