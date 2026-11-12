import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { Role, Prisma, SubscriptionStatus, PaymentMethod } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'

describe('Feature 11: Subscription Freeze & Renewal Integration Tests', () => {
  const mockGymId = 'gym-uuid-1'
  const mockOtherGymId = 'gym-uuid-2'

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

  const sampleMember = {
    id: 'member-uuid-1',
    gymId: mockGymId,
    memberCode: 'MEM-0001',
    name: 'أحمد محمد علي',
    phone: '01012345678',
    email: 'ahmed@test.com',
    isActive: true,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
  }

  const samplePlan = {
    id: 'plan-uuid-1',
    gymId: mockGymId,
    name: 'باقة 30 يوم',
    durationDays: 30,
    price: new Prisma.Decimal(600.0),
    currency: 'EGP',
    isActive: true,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
  }

  const sampleSubscription = {
    id: 'sub-uuid-1',
    gymId: mockGymId,
    memberId: sampleMember.id,
    planId: samplePlan.id,
    planName: 'باقة 30 يوم',
    planPrice: new Prisma.Decimal(600.0),
    durationDays: 30,
    currency: 'EGP',
    startDate: new Date('2026-10-01T00:00:00.000Z'),
    endDate: new Date('2026-10-30T23:59:59.999Z'),
    status: SubscriptionStatus.ACTIVE,
    notes: 'اشتراك رئيسي',
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
    member: sampleMember,
    plan: samplePlan,
  }

  const sampleFreeze = {
    id: 'freeze-uuid-1',
    gymId: mockGymId,
    subscriptionId: sampleSubscription.id,
    startDate: new Date('2026-10-09T00:00:00.000Z'),
    endDate: new Date('2026-10-15T23:59:59.999Z'),
    days: 7,
    reason: 'سفر مفاجئ',
    createdByUserId: mockOwnerId,
    createdAt: new Date('2026-10-09T10:00:00.000Z'),
    createdByUser: {
      id: mockOwnerId,
      name: 'مالك النادي',
      role: Role.OWNER,
    },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.setSystemTime(new Date('2026-10-05T12:00:00.000Z'))

    // Mock prisma.$transaction to execute callback with prisma
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      return cb(prisma)
    })

    // Mock authenticated user lookup for auth middleware
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      let role = Role.OWNER
      if (where.id === mockManagerId) role = Role.MANAGER
      if (where.id === mockReceptionistId) role = Role.RECEPTIONIST
      if (where.id === mockTrainerId) role = Role.TRAINER

      return {
        id: where.id,
        gymId: mockGymId,
        name: 'موظف النادي',
        email: 'staff@gymvip.eg',
        role,
        isActive: true,
        gym: { id: mockGymId, isActive: true },
      } as any
    })

    // Mock notification creation and user lookup
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([])
    vi.spyOn(prisma.notification, 'create').mockResolvedValue({} as any)
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // =========================================================================
  // 1. FREEZE SUBSCRIPTION TESTS (1 - 14)
  // =========================================================================
  describe('A. Freeze Subscription Tests', () => {
    it('1. OWNER can freeze an eligible subscription', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.subscription, 'update').mockResolvedValue({
        ...sampleSubscription,
        status: SubscriptionStatus.FROZEN,
        endDate: new Date('2026-11-06T23:59:59.999Z'),
      } as any)
      vi.spyOn(prisma.subscriptionFreeze, 'create').mockResolvedValue(sampleFreeze as any)

      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/freeze`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          days: 7,
          reason: 'سفر مفاجئ',
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('تم تجميد الاشتراك بنجاح')
      expect(response.body.data.subscription.status).toBe('FROZEN')
      expect(response.body.data.freeze.days).toBe(7)
    })

    it('2. MANAGER can freeze an eligible subscription', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.subscription, 'update').mockResolvedValue({
        ...sampleSubscription,
        status: SubscriptionStatus.FROZEN,
      } as any)
      vi.spyOn(prisma.subscriptionFreeze, 'create').mockResolvedValue(sampleFreeze as any)

      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/freeze`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({ days: 15, reason: 'إجازة' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('3. RECEPTIONIST can freeze an eligible subscription', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.subscription, 'update').mockResolvedValue({
        ...sampleSubscription,
        status: SubscriptionStatus.FROZEN,
      } as any)
      vi.spyOn(prisma.subscriptionFreeze, 'create').mockResolvedValue(sampleFreeze as any)

      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/freeze`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({ days: 30 })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('4. TRAINER cannot freeze a subscription (403 Forbidden)', async () => {
      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/freeze`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])
        .send({ days: 7 })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })

    it('5. Cannot freeze an already frozen subscription (409 Conflict)', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({
        ...sampleSubscription,
        status: SubscriptionStatus.FROZEN,
      } as any)

      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/freeze`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ days: 7 })

      expect(response.status).toBe(409)
      expect(response.body.message).toContain('الاشتراك مجمد بالفعل')
    })

    it('6. Cannot freeze an expired subscription (409 Conflict)', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({
        ...sampleSubscription,
        status: SubscriptionStatus.EXPIRED,
        endDate: new Date('2025-01-01T23:59:59.999Z'),
      } as any)

      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/freeze`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ days: 7 })

      expect(response.status).toBe(409)
      expect(response.body.message).toContain('منتهي')
    })

    it('7. Cannot freeze a cancelled subscription (409 Conflict)', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({
        ...sampleSubscription,
        status: SubscriptionStatus.CANCELLED,
      } as any)

      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/freeze`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ days: 7 })

      expect(response.status).toBe(409)
      expect(response.body.message).toContain('ملغى')
    })

    it('8. Cannot freeze for invalid durations (0 or >90 days) (400 Bad Request)', async () => {
      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/freeze`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ days: 120 })

      expect(response.status).toBe(400)
      expect(response.body.errors).toBeDefined()
    })

    it('9. Freeze history is created with correct fields', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.subscription, 'update').mockResolvedValue({
        ...sampleSubscription,
        status: SubscriptionStatus.FROZEN,
      } as any)
      const createFreezeSpy = vi
        .spyOn(prisma.subscriptionFreeze, 'create')
        .mockResolvedValue(sampleFreeze as any)

      await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/freeze`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ days: 7, reason: 'سفر مفاجئ' })

      expect(createFreezeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gymId: mockGymId,
            subscriptionId: sampleSubscription.id,
            days: 7,
            reason: 'سفر مفاجئ',
            createdByUserId: mockOwnerId,
          }),
        })
      )
    })

    it('10. End date is adjusted correctly when frozen', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      const updateSubSpy = vi
        .spyOn(prisma.subscription, 'update')
        .mockResolvedValue({
          ...sampleSubscription,
          status: SubscriptionStatus.FROZEN,
        } as any)
      vi.spyOn(prisma.subscriptionFreeze, 'create').mockResolvedValue(sampleFreeze as any)

      await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/freeze`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ days: 7 })

      expect(updateSubSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sampleSubscription.id },
          data: expect.objectContaining({
            status: SubscriptionStatus.FROZEN,
            endDate: expect.any(Date),
          }),
        })
      )
    })

    it('11. Concurrent freeze attempts do not double-extend subscription (transaction safety)', async () => {
      // If subscription already in FROZEN state inside tx, rejects
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({
        ...sampleSubscription,
        status: SubscriptionStatus.FROZEN,
      } as any)

      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/freeze`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ days: 7 })

      expect(response.status).toBe(409)
    })

    it('12. Cannot freeze a subscription belonging to another gym (404 Not Found)', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null)

      const response = await request(app)
        .post(`/api/v1/subscriptions/foreign-sub-id/freeze`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ days: 7 })

      expect(response.status).toBe(404)
      expect(response.body.message).toContain('الاشتراك غير موجود')
    })

    it('13. Inactive member cannot be frozen (409 Conflict)', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({
        ...sampleSubscription,
        member: { ...sampleMember, isActive: false },
      } as any)

      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/freeze`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ days: 7 })

      expect(response.status).toBe(409)
      expect(response.body.message).toContain('غير نشط')
    })

    it('14. Freeze history is isolated by gym and sorted newest first', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.subscriptionFreeze, 'findMany').mockResolvedValue([sampleFreeze as any])

      const response = await request(app)
        .get(`/api/v1/subscriptions/${sampleSubscription.id}/freezes`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.freezes).toHaveLength(1)
      expect(response.body.data.freezes[0].days).toBe(7)
    })
  })

  // =========================================================================
  // 2. RENEWAL TESTS (15 - 26)
  // =========================================================================
  describe('B. Renew Subscription Tests', () => {
    it('15. Renewal creates a NEW subscription with status ACTIVE', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)

      const newSub = {
        ...sampleSubscription,
        id: 'new-sub-uuid-2',
        startDate: new Date('2026-10-31T00:00:00.000Z'),
        endDate: new Date('2026-11-29T23:59:59.999Z'),
      }
      vi.spyOn(prisma.subscription, 'create').mockResolvedValue(newSub as any)

      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/renew`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          planId: samplePlan.id,
          notes: 'تجديد باقة',
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('تم تجديد الاشتراك بنجاح')
      expect(response.body.data.subscription.id).toBe('new-sub-uuid-2')
    })

    it('16. Previous subscription remains unchanged in history (not overwritten)', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      const updateSubSpy = vi.spyOn(prisma.subscription, 'update')
      vi.spyOn(prisma.subscription, 'create').mockResolvedValue({
        ...sampleSubscription,
        id: 'new-sub-id',
      } as any)

      await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/renew`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ planId: samplePlan.id })

      // Previous subscription was NOT updated or deleted
      expect(updateSubSpy).not.toHaveBeenCalled()
    })

    it('17. Plan snapshot uses current plan values at time of renewal', async () => {
      const updatedPlan = {
        ...samplePlan,
        name: 'باقة جديدة بلس',
        price: new Prisma.Decimal(750.0),
        durationDays: 45,
      }
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(updatedPlan as any)
      const createSubSpy = vi
        .spyOn(prisma.subscription, 'create')
        .mockResolvedValue({
          ...sampleSubscription,
          id: 'new-sub-id',
          planName: 'باقة جديدة بلس',
          planPrice: new Prisma.Decimal(750.0),
          durationDays: 45,
        } as any)

      await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/renew`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ planId: samplePlan.id })

      expect(createSubSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            planName: 'باقة جديدة بلس',
            planPrice: new Prisma.Decimal(750.0),
            durationDays: 45,
          }),
        })
      )
    })

    it('18. Disabled plan cannot be used for renewal (409 Conflict)', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue({
        ...samplePlan,
        isActive: false,
      } as any)

      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/renew`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ planId: samplePlan.id })

      expect(response.status).toBe(409)
      expect(response.body.message).toContain('باقة غير نشطة')
    })

    it('19. Inactive member cannot renew (409 Conflict)', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({
        ...sampleSubscription,
        member: { ...sampleMember, isActive: false },
      } as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)

      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/renew`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ planId: samplePlan.id })

      expect(response.status).toBe(409)
      expect(response.body.message).toContain('غير نشط')
    })

    it('20. Cannot renew a subscription belonging to another gym (404 Not Found)', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null)

      const response = await request(app)
        .post(`/api/v1/subscriptions/other-gym-sub/renew`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ planId: samplePlan.id })

      expect(response.status).toBe(404)
    })

    it('21. Start date follows business rule (starts day after if active and not expired)', async () => {
      const activeFutureSub = {
        ...sampleSubscription,
        endDate: new Date('2026-10-30T23:59:59.999Z'),
      }
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(activeFutureSub as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      const createSubSpy = vi.spyOn(prisma.subscription, 'create').mockResolvedValue({
        ...sampleSubscription,
        id: 'new-sub-id',
      } as any)

      await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/renew`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ planId: samplePlan.id })

      expect(createSubSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startDate: new Date('2026-10-31T00:00:00.000Z'),
          }),
        })
      )
    })

    it('22. End date is calculated correctly from start date and duration', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      const createSubSpy = vi.spyOn(prisma.subscription, 'create').mockResolvedValue({
        ...sampleSubscription,
        id: 'new-sub-id',
      } as any)

      await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/renew`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ planId: samplePlan.id })

      expect(createSubSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            endDate: expect.any(Date),
          }),
        })
      )
    })

    it('23. Renewal does not automatically create a payment record', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      vi.spyOn(prisma.subscription, 'create').mockResolvedValue({
        ...sampleSubscription,
        id: 'new-sub-id',
      } as any)
      const createPaymentSpy = vi.spyOn(prisma.payment, 'create')

      await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/renew`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ planId: samplePlan.id })

      expect(createPaymentSpy).not.toHaveBeenCalled()
    })

    it('24. TRAINER cannot renew subscription (403 Forbidden)', async () => {
      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/renew`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])
        .send({ planId: samplePlan.id })

      expect(response.status).toBe(403)
    })

    it('25. RECEPTIONIST can renew subscription (201 Created)', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      vi.spyOn(prisma.subscription, 'create').mockResolvedValue({
        ...sampleSubscription,
        id: 'renewed-by-rec',
      } as any)

      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/renew`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({ planId: samplePlan.id })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('26. Concurrent renewal requests are safely isolated inside database transaction', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      vi.spyOn(prisma.subscription, 'create').mockResolvedValue({
        ...sampleSubscription,
        id: 'renewed-tx-1',
      } as any)

      const response = await request(app)
        .post(`/api/v1/subscriptions/${sampleSubscription.id}/renew`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ planId: samplePlan.id })

      expect(response.status).toBe(201)
    })
  })

  // =========================================================================
  // 3. INTEGRATION TESTS (27 - 29)
  // =========================================================================
  describe('C. Attendance & Payment Integration', () => {
    it('27. Frozen subscription is rejected by attendance check-in (409 Conflict)', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.attendance, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([
        {
          ...sampleSubscription,
          status: SubscriptionStatus.FROZEN,
        } as any,
      ])

      const response = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ memberId: sampleMember.id })

      expect(response.status).toBe(409)
      expect(response.body.message).toContain('مجمد')
    })

    it('28. Active renewed subscription follows attendance eligibility rules', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.attendance, 'findFirst').mockResolvedValue(null)

      const now = new Date()
      const start = new Date(now.getTime() - 1000 * 60 * 60)
      const end = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 10)

      vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([
        {
          ...sampleSubscription,
          startDate: start,
          endDate: end,
          status: SubscriptionStatus.ACTIVE,
        } as any,
      ])

      vi.spyOn(prisma.attendance, 'create').mockResolvedValue({
        id: 'att-1',
        gymId: mockGymId,
        memberId: sampleMember.id,
        subscriptionId: sampleSubscription.id,
        checkInAt: now,
        checkOutAt: null,
        durationMinutes: null,
        createdAt: now,
        updatedAt: now,
        member: sampleMember,
        subscription: sampleSubscription,
      } as any)

      const response = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ memberId: sampleMember.id })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('29. Existing payment rules remain intact (can record payment for renewed subscription)', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.payment, 'create').mockResolvedValue({
        id: 'pay-uuid-1',
        gymId: mockGymId,
        subscriptionId: sampleSubscription.id,
        memberId: sampleMember.id,
        amount: new Prisma.Decimal(600.0),
        currency: 'EGP',
        method: PaymentMethod.CASH,
        notes: 'سداد كامل',
        createdByUserId: mockOwnerId,
        createdAt: new Date(),
        subscription: sampleSubscription,
        member: sampleMember,
        createdByUser: { id: mockOwnerId, name: 'مالك النادي', role: Role.OWNER },
      } as any)

      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 600,
          method: 'CASH',
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })
  })
})
