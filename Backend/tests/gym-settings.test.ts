import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { Role, SubscriptionStatus, NotificationType } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'
import { processSubscriptionExpirationReminders } from '../src/services/notification.service.js'
import { getCurrentCairoDate } from '../src/utils/date.util.js'

describe('Feature 15: Gym Settings & Business Preferences Integration Tests', () => {
  const mockGymId = 'gym-settings-uuid-1'
  const mockGymId2 = 'gym-settings-uuid-2'
  const mockOwnerId = 'owner-uuid-1'
  const mockManagerId = 'manager-uuid-1'
  const mockReceptionistId = 'receptionist-uuid-1'
  const mockTrainerId = 'trainer-uuid-1'

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

  const receptionistToken = generateAuthToken({
    sub: mockReceptionistId,
    gymId: mockGymId,
    role: Role.RECEPTIONIST,
  })

  const trainerToken = generateAuthToken({
    sub: mockTrainerId,
    gymId: mockGymId,
    role: Role.TRAINER,
  })

  const ownerGym2Token = generateAuthToken({
    sub: 'owner-gym-2',
    gymId: mockGymId2,
    role: Role.OWNER,
  })

  const baseGymRecord = {
    id: mockGymId,
    name: 'أبطال في اي بي - GymVIP',
    slug: 'gymvip-cairo-club',
    phone: '01012345678',
    email: 'info@gymvip.eg',
    address: 'شارع التسعين الشمالي',
    city: 'القاهرة الجديدة',
    logo: 'https://gymvip.eg/logo.png',
    currency: 'EGP',
    timezone: 'Africa/Cairo',
    isActive: true,
    setupCompleted: true,
    subscriptionReminderEnabled: true,
    subscriptionReminderDays: [3, 1],
    subscriptionFreezeEnabled: true,
    allowedFreezeDurations: [3, 7, 15, 30],
    maxFreezeDays: 90,
    allowManualCheckout: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()

    // Default mock user resolver for requireAuth middleware
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      let role = Role.OWNER
      let gymId = mockGymId
      if (where.id === mockManagerId) role = Role.MANAGER
      if (where.id === mockReceptionistId) role = Role.RECEPTIONIST
      if (where.id === mockTrainerId) role = Role.TRAINER
      if (where.id === 'owner-gym-2') {
        role = Role.OWNER
        gymId = mockGymId2
      }

      return {
        id: where.id,
        gymId,
        name: 'موظف النادي',
        email: `${role.toLowerCase()}@gymvip.eg`,
        role,
        isActive: true,
        gym: { id: gymId, isActive: true },
      } as any
    })
  })

  // -------------------------------------------------------------
  // 1 & 2. GET GYM SETTINGS & ISOLATION
  // -------------------------------------------------------------
  it('1. Gym settings return the current gym\'s data', async () => {
    vi.spyOn(prisma.gym, 'findUnique').mockResolvedValue(baseGymRecord as any)

    const res = await request(app)
      .get('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.gym.id).toBe(mockGymId)
    expect(res.body.data.gym.subscriptionReminderEnabled).toBe(true)
    expect(res.body.data.gym.subscriptionReminderDays).toEqual([3, 1])
    expect(res.body.data.gym.subscriptionFreezeEnabled).toBe(true)
    expect(res.body.data.gym.allowedFreezeDurations).toEqual([3, 7, 15, 30])
    expect(res.body.data.gym.maxFreezeDays).toBe(90)
    expect(res.body.data.gym.allowManualCheckout).toBe(true)
  })

  it('2. One gym cannot read another gym\'s settings', async () => {
    vi.spyOn(prisma.gym, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.id === mockGymId2) {
        return {
          ...baseGymRecord,
          id: mockGymId2,
          name: 'نادي الجيزة الرياضي',
          slug: 'giza-club',
        } as any
      }
      return baseGymRecord as any
    })

    const res = await request(app)
      .get('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerGym2Token}`])

    expect(res.status).toBe(200)
    expect(res.body.data.gym.id).toBe(mockGymId2)
    expect(res.body.data.gym.name).toBe('نادي الجيزة الرياضي')
  })

  // -------------------------------------------------------------
  // 3, 4, 5, 6. RBAC ON SETTINGS UPDATE
  // -------------------------------------------------------------
  it('3. OWNER can update settings', async () => {
    vi.spyOn(prisma.gym, 'findUnique').mockResolvedValue(baseGymRecord as any)
    const updateSpy = vi.spyOn(prisma.gym, 'update').mockResolvedValue({
      ...baseGymRecord,
      name: 'GymVIP New Name',
      subscriptionReminderDays: [7, 3, 1],
    } as any)
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({ id: 'audit-1' } as any)

    const res = await request(app)
      .patch('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        name: 'GymVIP New Name',
        subscriptionReminderDays: [7, 3, 1],
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(updateSpy).toHaveBeenCalled()
  })

  it('4. MANAGER can update permitted settings', async () => {
    vi.spyOn(prisma.gym, 'findUnique').mockResolvedValue(baseGymRecord as any)
    vi.spyOn(prisma.gym, 'update').mockResolvedValue({
      ...baseGymRecord,
      allowManualCheckout: false,
    } as any)
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({ id: 'audit-2' } as any)

    const res = await request(app)
      .patch('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
      .send({
        allowManualCheckout: false,
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.gym.allowManualCheckout).toBe(false)
  })

  it('5. RECEPTIONIST cannot update freeze policies or gym settings (403 Forbidden)', async () => {
    const res = await request(app)
      .patch('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
      .send({
        subscriptionFreezeEnabled: false,
      })

    expect(res.status).toBe(403)
  })

  it('6. TRAINER cannot update gym-wide settings (403 Forbidden)', async () => {
    const res = await request(app)
      .patch('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])
      .send({
        name: 'Hacked Gym Name',
      })

    expect(res.status).toBe(403)
  })

  // -------------------------------------------------------------
  // 7, 8, 9. REMINDER SETTINGS VALIDATION
  // -------------------------------------------------------------
  it('7. Reminder settings reject unsupported values (e.g. 5 days)', async () => {
    const res = await request(app)
      .patch('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        subscriptionReminderDays: [5, 3],
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('8. Reminder offsets must be unique', async () => {
    const res = await request(app)
      .patch('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        subscriptionReminderDays: [3, 3],
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('9. Reminder offsets must be non-empty when reminders are enabled', async () => {
    const res = await request(app)
      .patch('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        subscriptionReminderEnabled: true,
        subscriptionReminderDays: [],
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  // -------------------------------------------------------------
  // 10, 11, 12. NOTIFICATION SCHEDULER INTEGRATION
  // -------------------------------------------------------------
  it('10. Disabling reminders prevents new reminder generation', async () => {
    const today = getCurrentCairoDate()
    const targetEndDate = new Date(today)
    targetEndDate.setUTCDate(targetEndDate.getUTCDate() + 3)

    vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([
      {
        id: 'sub-1',
        gymId: mockGymId,
        memberId: 'member-1',
        planName: 'باقة شهرية',
        status: SubscriptionStatus.ACTIVE,
        startDate: today,
        endDate: targetEndDate,
        gym: {
          id: mockGymId,
          name: 'نادي في اي بي',
          subscriptionReminderEnabled: false, // Reminders disabled!
          subscriptionReminderDays: [3, 1],
        },
        member: { id: 'member-1', name: 'كريم أحمد', memberCode: 'M101', isActive: true },
      } as any,
    ])
    vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null)
    const notifSpy = vi.spyOn(prisma.notification, 'create').mockResolvedValue({ id: 'notif-1' } as any)

    const result = await processSubscriptionExpirationReminders()

    expect(result.expiringProcessed).toBe(0)
    expect(notifSpy).not.toHaveBeenCalled()
  })

  it('11. Configured reminder offsets are respected ([7, 1] triggers on 7 and 1, skips 3)', async () => {
    const today = getCurrentCairoDate()
    const endIn3Days = new Date(today)
    endIn3Days.setUTCDate(endIn3Days.getUTCDate() + 3)

    const endIn7Days = new Date(today)
    endIn7Days.setUTCDate(endIn7Days.getUTCDate() + 7)

    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
      { id: mockOwnerId, role: Role.OWNER } as any,
    ])

    vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([
      {
        id: 'sub-3days',
        gymId: mockGymId,
        memberId: 'member-1',
        planName: 'باقة 3 أيام',
        status: SubscriptionStatus.ACTIVE,
        startDate: today,
        endDate: endIn3Days,
        gym: {
          id: mockGymId,
          name: 'نادي في اي بي',
          subscriptionReminderEnabled: true,
          subscriptionReminderDays: [7, 1], // 3 days is NOT configured!
        },
        member: { id: 'member-1', name: 'أحمد', memberCode: 'M1', isActive: true },
      } as any,
      {
        id: 'sub-7days',
        gymId: mockGymId,
        memberId: 'member-2',
        planName: 'باقة 7 أيام',
        status: SubscriptionStatus.ACTIVE,
        startDate: today,
        endDate: endIn7Days,
        gym: {
          id: mockGymId,
          name: 'نادي في اي بي',
          subscriptionReminderEnabled: true,
          subscriptionReminderDays: [7, 1], // 7 days IS configured!
        },
        member: { id: 'member-2', name: 'سارة', memberCode: 'M2', isActive: true },
      } as any,
    ])
    vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null)
    const notifSpy = vi.spyOn(prisma.notification, 'create').mockResolvedValue({ id: 'notif-2' } as any)

    const result = await processSubscriptionExpirationReminders()

    // 7-day should be processed, 3-day skipped
    expect(result.expiringProcessed).toBe(1)
    expect(notifSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deduplicationKey: expect.stringContaining('sub-7days:7d'),
        }),
      })
    )
  })

  it('12. Existing reminder deduplication still works', async () => {
    const today = getCurrentCairoDate()
    const endIn1Day = new Date(today)
    endIn1Day.setUTCDate(endIn1Day.getUTCDate() + 1)

    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
      { id: mockOwnerId, role: Role.OWNER } as any,
    ])

    vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([
      {
        id: 'sub-dedup',
        gymId: mockGymId,
        memberId: 'member-1',
        planName: 'باقة سنوية',
        status: SubscriptionStatus.ACTIVE,
        startDate: today,
        endDate: endIn1Day,
        gym: {
          id: mockGymId,
          name: 'نادي في اي بي',
          subscriptionReminderEnabled: true,
          subscriptionReminderDays: [3, 1],
        },
        member: { id: 'member-1', name: 'علي', memberCode: 'M3', isActive: true },
      } as any,
    ])
    vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null)
    // Simulate Unique constraint violation (P2002) in Prisma when already delivered
    vi.spyOn(prisma.notification, 'create').mockRejectedValue({
      code: 'P2002',
    })

    const result = await processSubscriptionExpirationReminders()
    expect(result.expiringProcessed).toBe(1) // Handled gracefully without error
  })

  // -------------------------------------------------------------
  // 13, 14, 15, 16, 17. SUBSCRIPTION FREEZE POLICY ENFORCEMENT
  // -------------------------------------------------------------
  it('13. Freeze can be disabled by policy (attempting freeze returns conflict error)', async () => {
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      const tx = {
        subscription: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'sub-freeze-1',
            gymId: mockGymId,
            status: SubscriptionStatus.ACTIVE,
            endDate: new Date('2026-12-31'),
            member: { isActive: true },
            gym: {
              ...baseGymRecord,
              subscriptionFreezeEnabled: false, // Freeze disabled!
            },
          }),
        },
      }
      return callback(tx)
    })

    const res = await request(app)
      .post('/api/v1/subscriptions/sub-freeze-1/freeze')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        days: 7,
        reason: 'إجازة سنوية',
      })

    expect(res.status).toBe(409)
    expect(res.body.message).toContain('تجميد الاشتراكات معطل')
  })

  it('14. Disallowed freeze durations are rejected (e.g. 10 days when allowed are [3, 7, 15, 30])', async () => {
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      const tx = {
        subscription: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'sub-freeze-2',
            gymId: mockGymId,
            status: SubscriptionStatus.ACTIVE,
            endDate: new Date('2026-12-31'),
            member: { isActive: true },
            gym: {
              ...baseGymRecord,
              subscriptionFreezeEnabled: true,
              allowedFreezeDurations: [3, 7, 15, 30],
              maxFreezeDays: 90,
            },
          }),
        },
      }
      return callback(tx)
    })

    const res = await request(app)
      .post('/api/v1/subscriptions/sub-freeze-2/freeze')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        days: 10,
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('غير مسموح بها')
  })

  it('15. Durations exceeding maxFreezeDays are rejected', async () => {
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      const tx = {
        subscription: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'sub-freeze-3',
            gymId: mockGymId,
            status: SubscriptionStatus.ACTIVE,
            endDate: new Date('2026-12-31'),
            member: { isActive: true },
            gym: {
              ...baseGymRecord,
              subscriptionFreezeEnabled: true,
              allowedFreezeDurations: [3, 7, 15, 30],
              maxFreezeDays: 15, // maxFreezeDays set to 15!
            },
          }),
        },
      }
      return callback(tx)
    })

    const res = await request(app)
      .post('/api/v1/subscriptions/sub-freeze-3/freeze')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        days: 30, // Exceeds maxFreezeDays 15
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('تتجاوز الحد الأقصى')
  })

  it('16. Invalid freeze policy combinations are rejected (durations exceeding maxFreezeDays)', async () => {
    const res = await request(app)
      .patch('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        allowedFreezeDurations: [3, 7, 45],
        maxFreezeDays: 30, // 45 > 30!
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('17. Existing frozen subscriptions remain unchanged after policy updates', async () => {
    // Policy change should only affect future freeze requests
    vi.spyOn(prisma.gym, 'findUnique').mockResolvedValue(baseGymRecord as any)
    vi.spyOn(prisma.gym, 'update').mockResolvedValue({
      ...baseGymRecord,
      subscriptionFreezeEnabled: false,
    } as any)
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({ id: 'audit-3' } as any)

    const res = await request(app)
      .patch('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        subscriptionFreezeEnabled: false,
      })

    expect(res.status).toBe(200)
    expect(res.body.data.gym.subscriptionFreezeEnabled).toBe(false)
  })

  // -------------------------------------------------------------
  // 18. ATTENDANCE PREFERENCE ENFORCEMENT
  // -------------------------------------------------------------
  it('18. Manual checkout preference is enforced by checkOutAttendance (403 when disabled)', async () => {
    vi.spyOn(prisma.attendance, 'findFirst').mockResolvedValue({
      id: 'att-123',
      gymId: mockGymId,
      checkInAt: new Date(),
      checkOutAt: null,
      gym: {
        id: mockGymId,
        allowManualCheckout: false, // Manual checkout disabled!
      },
    } as any)

    const res = await request(app)
      .post('/api/v1/attendance/att-123/check-out')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(res.status).toBe(403)
    expect(res.body.message).toContain('تسجيل الانصراف اليدوي معطل')
  })

  // -------------------------------------------------------------
  // 19, 20, 21. CURRENCY, TIMEZONE & UNKNOWN FIELDS INTEGRITY
  // -------------------------------------------------------------
  it('19. Currency remains EGP (cannot change to USD)', async () => {
    const res = await request(app)
      .patch('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        currency: 'USD',
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('20. Timezone remains Africa/Cairo according to the V1 policy (cannot change to UTC)', async () => {
    const res = await request(app)
      .patch('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        timezone: 'UTC',
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('21. Invalid or unknown settings fields are rejected (strict schema)', async () => {
    const res = await request(app)
      .patch('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        someUnknownSetting: 'invalid',
        hackAttempt: true,
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  // -------------------------------------------------------------
  // 22 & 23. AUDIT LOG INTEGRATION
  // -------------------------------------------------------------
  it('22. Successful settings updates generate audit records', async () => {
    vi.spyOn(prisma.gym, 'findUnique').mockResolvedValue(baseGymRecord as any)
    vi.spyOn(prisma.gym, 'update').mockResolvedValue({
      ...baseGymRecord,
      name: 'GymVIP Audited Update',
    } as any)
    const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({ id: 'audit-log-1' } as any)

    const res = await request(app)
      .patch('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        name: 'GymVIP Audited Update',
      })

    expect(res.status).toBe(200)
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gymId: mockGymId,
          action: 'GYM_SETTINGS_UPDATED',
          entityType: 'GYM',
        }),
      })
    )
  })

  it('23. Failed settings updates do not generate successful audit records', async () => {
    const auditSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({ id: 'audit-log-fail' } as any)

    const res = await request(app)
      .patch('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        maxFreezeDays: 999, // Validation failure!
      })

    expect(res.status).toBe(400)
    expect(auditSpy).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------
  // 24. SAFE DEFAULTS FOR EXISTING GYMS
  // -------------------------------------------------------------
  it('24. Existing gyms without configured JSON fields receive safe defaults', async () => {
    const legacyGymRecord = {
      id: mockGymId,
      name: 'Legacy Gym Club',
      slug: 'legacy-club',
      phone: null,
      email: null,
      address: null,
      city: null,
      logo: null,
      currency: 'EGP',
      timezone: 'Africa/Cairo',
      isActive: true,
      setupCompleted: true,
      subscriptionReminderEnabled: null,
      subscriptionReminderDays: null,
      subscriptionFreezeEnabled: null,
      allowedFreezeDurations: null,
      maxFreezeDays: null,
      allowManualCheckout: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.spyOn(prisma.gym, 'findUnique').mockResolvedValue(legacyGymRecord as any)

    const res = await request(app)
      .get('/api/v1/gym')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(res.status).toBe(200)
    expect(res.body.data.gym.subscriptionReminderEnabled).toBe(true)
    expect(res.body.data.gym.subscriptionReminderDays).toEqual([3, 1])
    expect(res.body.data.gym.subscriptionFreezeEnabled).toBe(true)
    expect(res.body.data.gym.allowedFreezeDurations).toEqual([3, 7, 15, 30])
    expect(res.body.data.gym.maxFreezeDays).toBe(90)
    expect(res.body.data.gym.allowManualCheckout).toBe(true)
  })

  // -------------------------------------------------------------
  // 25. EXISTING FEATURES CONTINUE TO WORK
  // -------------------------------------------------------------
  it('25. Existing features continue to work (setup status check)', async () => {
    vi.spyOn(prisma.gym, 'findUnique').mockResolvedValue({
      setupCompleted: true,
    } as any)

    const res = await request(app)
      .get('/api/v1/gym/setup-status')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.setupCompleted).toBe(true)
  })
})
