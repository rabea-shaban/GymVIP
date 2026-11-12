import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { Role, Prisma, SubscriptionStatus } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'
import {
  calculateSubscriptionEndDate,
  getEffectiveSubscriptionStatus,
  parseDate,
} from '../src/utils/date.util.js'

describe('Feature 7: Subscriptions Management Integration Tests', () => {
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
    name: 'أحمد محمد',
    phone: '01012345678',
    email: 'ahmed@test.com',
    isActive: true,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
  }

  const samplePlan = {
    id: 'plan-uuid-1',
    gymId: mockGymId,
    name: 'اشتراك شهري',
    durationDays: 30,
    price: new Prisma.Decimal(500.0),
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
    planName: 'اشتراك شهري',
    planPrice: new Prisma.Decimal(500.0),
    durationDays: 30,
    currency: 'EGP',
    startDate: new Date('2026-10-10T00:00:00.000Z'),
    endDate: new Date('2026-11-08T23:59:59.999Z'),
    status: SubscriptionStatus.ACTIVE,
    notes: 'تم الدفع كاش',
    createdAt: new Date('2026-10-10T10:00:00.000Z'),
    updatedAt: new Date('2026-10-10T10:00:00.000Z'),
    member: sampleMember,
    plan: samplePlan,
  }

  beforeEach(() => {
    vi.restoreAllMocks()

    // Mock authenticated user lookup for auth middleware
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      let role = Role.OWNER
      if (where.id === mockManagerId) role = Role.MANAGER
      if (where.id === mockReceptionistId) role = Role.RECEPTIONIST
      if (where.id === mockTrainerId) role = Role.TRAINER

      return {
        id: where.id,
        gymId: mockGymId,
        name: 'موظف النظام',
        email: 'staff@gymvip.eg',
        role,
        isActive: true,
        gym: { id: mockGymId, isActive: true },
      } as any
    })
  })

  // -------------------------------------------------------------
  // 1. CREATE SUBSCRIPTION & RBAC (Tests 1 - 4)
  // -------------------------------------------------------------
  describe('POST /api/v1/subscriptions (Create Subscription & RBAC)', () => {
    it('1. OWNER can create subscription', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.subscription, 'create').mockResolvedValue(sampleSubscription as any)

      const response = await request(app)
        .post('/api/v1/subscriptions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          memberId: sampleMember.id,
          planId: samplePlan.id,
          startDate: '2026-10-10',
          notes: 'تم الدفع كاش',
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.subscription.planName).toBe('اشتراك شهري')
      expect(response.body.data.subscription.planPrice).toBe('500.00')
      expect(response.body.data.subscription.status).toBe('ACTIVE')
    })

    it('2. MANAGER can create subscription', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.subscription, 'create').mockResolvedValue(sampleSubscription as any)

      const response = await request(app)
        .post('/api/v1/subscriptions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({
          memberId: sampleMember.id,
          planId: samplePlan.id,
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('3. RECEPTIONIST can create subscription', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.subscription, 'create').mockResolvedValue(sampleSubscription as any)

      const response = await request(app)
        .post('/api/v1/subscriptions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({
          memberId: sampleMember.id,
          planId: samplePlan.id,
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('4. TRAINER cannot create subscription (403 Forbidden)', async () => {
      const response = await request(app)
        .post('/api/v1/subscriptions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])
        .send({
          memberId: sampleMember.id,
          planId: samplePlan.id,
        })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })
  })

  // -------------------------------------------------------------
  // 2. GYM ISOLATION & VALIDATIONS (Tests 5 - 11)
  // -------------------------------------------------------------
  describe('Subscription Validations & Isolation', () => {
    it('5. Member must belong to same gym (404 Not Found if member of another gym)', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(null)

      const response = await request(app)
        .post('/api/v1/subscriptions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          memberId: 'foreign-member-id',
          planId: samplePlan.id,
        })

      expect(response.status).toBe(404)
      expect(response.body.message).toContain('العضو غير موجود')
    })

    it('6. Plan must belong to same gym (404 Not Found if plan of another gym)', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(null)

      const response = await request(app)
        .post('/api/v1/subscriptions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          memberId: sampleMember.id,
          planId: 'foreign-plan-id',
        })

      expect(response.status).toBe(404)
      expect(response.body.message).toContain('باقة الاشتراك غير موجودة')
    })

    it('7. Inactive member rejected with 409 Conflict', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue({
        ...sampleMember,
        isActive: false,
      } as any)

      const response = await request(app)
        .post('/api/v1/subscriptions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          memberId: sampleMember.id,
          planId: samplePlan.id,
        })

      expect(response.status).toBe(409)
      expect(response.body.message).toContain('لا يمكن إنشاء اشتراك لعضو غير نشط')
    })

    it('8. Inactive plan rejected with 409 Conflict', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue({
        ...samplePlan,
        isActive: false,
      } as any)

      const response = await request(app)
        .post('/api/v1/subscriptions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          memberId: sampleMember.id,
          planId: samplePlan.id,
        })

      expect(response.status).toBe(409)
      expect(response.body.message).toContain('لا يمكن إنشاء اشتراك باستخدام باقة غير نشطة')
    })

    it('9. Active subscription prevents another subscription (409 Conflict)', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([
        {
          ...sampleSubscription,
          status: SubscriptionStatus.ACTIVE,
          endDate: new Date(Date.now() + 864000000), // in future
        } as any,
      ])

      const response = await request(app)
        .post('/api/v1/subscriptions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          memberId: sampleMember.id,
          planId: samplePlan.id,
        })

      expect(response.status).toBe(409)
      expect(response.body.message).toBe('العضو لديه اشتراك حالي بالفعل')
    })

    it('10. Frozen subscription prevents another subscription (409 Conflict)', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([
        {
          ...sampleSubscription,
          status: SubscriptionStatus.FROZEN,
          endDate: new Date(Date.now() + 864000000),
        } as any,
      ])

      const response = await request(app)
        .post('/api/v1/subscriptions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          memberId: sampleMember.id,
          planId: samplePlan.id,
        })

      expect(response.status).toBe(409)
      expect(response.body.message).toBe('العضو لديه اشتراك حالي بالفعل')
    })

    it('11. Expired subscription allows a new subscription', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      // Existing subscription is past its end date
      vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([
        {
          ...sampleSubscription,
          status: SubscriptionStatus.ACTIVE,
          endDate: new Date('2020-01-01T00:00:00.000Z'),
        } as any,
      ])
      vi.spyOn(prisma.subscription, 'create').mockResolvedValue(sampleSubscription as any)

      const response = await request(app)
        .post('/api/v1/subscriptions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          memberId: sampleMember.id,
          planId: samplePlan.id,
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })
  })

  // -------------------------------------------------------------
  // 3. SNAPSHOT & HISTORICAL PRICE PROTECTION (Tests 12 - 15)
  // -------------------------------------------------------------
  describe('Historical Plan Snapshots & Price Protection', () => {
    it('12, 13, 14. Plan price, plan name, and duration are snapshotted', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([])

      const createSpy = vi.spyOn(prisma.subscription, 'create').mockResolvedValue(sampleSubscription as any)

      await request(app)
        .post('/api/v1/subscriptions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          memberId: sampleMember.id,
          planId: samplePlan.id,
        })

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            planName: 'اشتراك شهري',
            planPrice: samplePlan.price,
            durationDays: 30,
            currency: 'EGP',
          }),
        })
      )
    })

    it('15. Changing plan price does not change old subscription price', async () => {
      // Historical subscription created when plan was 500
      const oldSubscription = {
        ...sampleSubscription,
        planPrice: new Prisma.Decimal(500.0),
        plan: {
          ...samplePlan,
          price: new Prisma.Decimal(600.0), // Plan price updated later to 600
        },
      }

      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(oldSubscription as any)

      const response = await request(app)
        .get(`/api/v1/subscriptions/${oldSubscription.id}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(200)
      expect(response.body.data.subscription.planPrice).toBe('500.00')
      expect(response.body.data.subscription.plan.price).toBe('600.00')
    })
  })

  // -------------------------------------------------------------
  // 4. IMMUTABILITY & ENDPOINTS SAFETY (Tests 16 - 18)
  // -------------------------------------------------------------
  describe('Subscription Immutability & Security', () => {
    it('16. Subscription cannot be deleted (404/Method not allowed)', async () => {
      const response = await request(app)
        .delete('/api/v1/subscriptions/sub-123')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(404)
    })

    it('17. Subscription cannot be arbitrarily edited via PATCH (404/Method not allowed)', async () => {
      const response = await request(app)
        .patch('/api/v1/subscriptions/sub-123')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ planPrice: 100 })

      expect(response.status).toBe(404)
    })

    it('18. Cross-gym subscription access returns 404', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null)

      const response = await request(app)
        .get('/api/v1/subscriptions/foreign-sub-id')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(404)
      expect(response.body.message).toContain('الاشتراك غير موجود')
    })
  })

  // -------------------------------------------------------------
  // 5. MEMBER SUBSCRIPTIONS & CURRENT ENDPOINT (Tests 19 - 22)
  // -------------------------------------------------------------
  describe('Member Subscription History & Current Status', () => {
    it('19. Member subscription history endpoint works', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([
        sampleSubscription as any,
      ])

      const response = await request(app)
        .get(`/api/v1/members/${sampleMember.id}/subscriptions`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(response.status).toBe(200)
      expect(response.body.data.subscriptions).toHaveLength(1)
      expect(response.body.data.subscriptions[0].planName).toBe('اشتراك شهري')
    })

    it('20. Current subscription endpoint returns active subscription', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([
        {
          ...sampleSubscription,
          endDate: new Date(Date.now() + 864000000), // in future
        } as any,
      ])

      const response = await request(app)
        .get(`/api/v1/members/${sampleMember.id}/subscriptions/current`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])

      expect(response.status).toBe(200)
      expect(response.body.data.subscription).not.toBeNull()
      expect(response.body.data.subscription.planName).toBe('اشتراك شهري')
    })

    it('21. Current subscription endpoint returns null when all subscriptions expired', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([
        {
          ...sampleSubscription,
          endDate: new Date('2020-01-01T00:00:00.000Z'),
        } as any,
      ])

      const response = await request(app)
        .get(`/api/v1/members/${sampleMember.id}/subscriptions/current`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])

      expect(response.status).toBe(200)
      expect(response.body.data.subscription).toBeNull()
    })

    it('22. Cairo business date and calculateSubscriptionEndDate are handled correctly', () => {
      const startDate = '2026-10-10'
      const endDate = calculateSubscriptionEndDate(startDate, 30)

      expect(endDate.getUTCFullYear()).toBe(2026)
      expect(endDate.getUTCMonth()).toBe(10) // 0-indexed: 10 = November
      expect(endDate.getUTCDate()).toBe(8) // 2026-11-08

      const effectiveStatusExpired = getEffectiveSubscriptionStatus({
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date('2020-01-01T00:00:00.000Z'),
      })
      expect(effectiveStatusExpired).toBe(SubscriptionStatus.EXPIRED)

      const effectiveStatusFrozen = getEffectiveSubscriptionStatus({
        status: SubscriptionStatus.FROZEN,
        endDate: new Date('2020-01-01T00:00:00.000Z'),
      })
      expect(effectiveStatusFrozen).toBe(SubscriptionStatus.FROZEN)
    })
  })

  // -------------------------------------------------------------
  // 6. CLIENT OVERRIDES REJECTION & SECURITY (Tests 23 - 27)
  // -------------------------------------------------------------
  describe('Security & Overrides Rejection', () => {
    it('23. Invalid memberId is rejected', async () => {
      const response = await request(app)
        .post('/api/v1/subscriptions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          memberId: '',
          planId: samplePlan.id,
        })

      expect(response.status).toBe(400)
    })

    it('24. Invalid planId is rejected', async () => {
      const response = await request(app)
        .post('/api/v1/subscriptions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          memberId: sampleMember.id,
          planId: '',
        })

      expect(response.status).toBe(400)
    })

    it('25, 26, 27. Client cannot override price, duration, or gymId', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([])

      const createSpy = vi.spyOn(prisma.subscription, 'create').mockResolvedValue(sampleSubscription as any)

      // Client attempts to sneak in custom price 10 EGP, 365 days duration, and foreign gymId
      await request(app)
        .post('/api/v1/subscriptions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          memberId: sampleMember.id,
          planId: samplePlan.id,
          planPrice: 10,
          price: 10,
          durationDays: 365,
          planName: 'باقة مجانية مزورة',
          gymId: 'hacked-gym-id',
        })

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gymId: mockGymId, // uses authenticated gymId
            planName: 'اشتراك شهري', // uses DB plan name
            planPrice: samplePlan.price, // uses DB plan price 500
            durationDays: 30, // uses DB duration 30
          }),
        })
      )
    })
  })
})
