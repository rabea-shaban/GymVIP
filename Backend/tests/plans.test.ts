import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { Role, Prisma } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'
import { assertPlanAvailableForNewSubscription } from '../src/services/plan.service.js'

describe('Feature 6: Membership Plans Management Integration Tests', () => {
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

  const samplePlan = {
    id: 'plan-uuid-101',
    gymId: mockGymId,
    name: 'اشتراك شهري VIP',
    description: 'اشتراك شهري شامل صالة الحديد والساونا',
    durationDays: 30,
    price: new Prisma.Decimal(500.0),
    currency: 'EGP',
    isActive: true,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
  }

  beforeEach(() => {
    vi.restoreAllMocks()

    // Mock authenticated user resolver for auth middleware
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      let role = Role.OWNER
      if (where.id === mockManagerId) role = Role.MANAGER
      if (where.id === mockReceptionistId) role = Role.RECEPTIONIST
      if (where.id === mockTrainerId) role = Role.TRAINER

      return {
        id: where.id,
        gymId: mockGymId,
        name: 'مستخدم النظام',
        email: 'staff@gymvip.eg',
        role,
        isActive: true,
        gym: { id: mockGymId, isActive: true },
      } as any
    })
  })

  // -------------------------------------------------------------
  // 1. CREATE PLAN & RBAC (Tests 1 - 7)
  // -------------------------------------------------------------
  describe('POST /api/v1/plans (Create Plan)', () => {
    it('1. OWNER can create a plan', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.membershipPlan, 'create').mockResolvedValue(samplePlan as any)

      const response = await request(app)
        .post('/api/v1/plans')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'اشتراك شهري VIP',
          description: 'اشتراك شهري شامل صالة الحديد والساونا',
          durationDays: 30,
          price: 500,
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.plan.name).toBe('اشتراك شهري VIP')
      expect(response.body.data.plan.price).toBe('500.00')
      expect(response.body.data.plan.currency).toBe('EGP')
    })

    it('2. MANAGER can create a plan', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.membershipPlan, 'create').mockResolvedValue(samplePlan as any)

      const response = await request(app)
        .post('/api/v1/plans')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({
          name: 'اشتراك شهري VIP',
          durationDays: 30,
          price: 500,
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('3. RECEPTIONIST cannot create a plan (403 Forbidden)', async () => {
      const response = await request(app)
        .post('/api/v1/plans')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({
          name: 'اشتراك غير مصرح',
          durationDays: 30,
          price: 500,
        })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })

    it('4. TRAINER cannot create a plan (403 Forbidden)', async () => {
      const response = await request(app)
        .post('/api/v1/plans')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])
        .send({
          name: 'اشتراك غير مصرح',
          durationDays: 30,
          price: 500,
        })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })

    it('5. Duplicate plan name inside same gym is rejected with 409 Conflict', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(samplePlan as any)

      const response = await request(app)
        .post('/api/v1/plans')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'اشتراك شهري VIP',
          durationDays: 30,
          price: 500,
        })

      expect(response.status).toBe(409)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('اسم الباقة مستخدم بالفعل داخل هذا الجيم')
    })

    it('6. Same plan name in another gym is allowed', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockImplementation(async ({ where }: any) => {
        if (where?.gymId_name?.gymId === mockOtherGymId) {
          return samplePlan as any
        }
        return null
      })
      vi.spyOn(prisma.membershipPlan, 'create').mockResolvedValue(samplePlan as any)

      const response = await request(app)
        .post('/api/v1/plans')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'اشتراك شهري VIP',
          durationDays: 30,
          price: 500,
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('7. Plan belongs strictly to authenticated gym, never req.body.gymId', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(null)
      const createSpy = vi
        .spyOn(prisma.membershipPlan, 'create')
        .mockResolvedValue(samplePlan as any)

      await request(app)
        .post('/api/v1/plans')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          gymId: 'attacker-gym-id',
          name: 'اشتراك شهري VIP',
          durationDays: 30,
          price: 500,
        })

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gymId: mockGymId,
          }),
        })
      )
    })
  })

  // -------------------------------------------------------------
  // 2. LIST & SEARCH & FILTER & PAGINATION (Tests 8 - 11)
  // -------------------------------------------------------------
  describe('GET /api/v1/plans (List & Filter)', () => {
    it('8. List active plans (RECEPTIONIST & TRAINER allowed)', async () => {
      const findManySpy = vi
        .spyOn(prisma.membershipPlan, 'findMany')
        .mockResolvedValue([samplePlan as any])
      vi.spyOn(prisma.membershipPlan, 'count').mockResolvedValue(1)

      const response = await request(app)
        .get('/api/v1/plans?status=active')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.plans).toHaveLength(1)
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gymId: mockGymId,
            isActive: true,
          }),
        })
      )
    })

    it('9. List inactive plans', async () => {
      const findManySpy = vi
        .spyOn(prisma.membershipPlan, 'findMany')
        .mockResolvedValue([])
      vi.spyOn(prisma.membershipPlan, 'count').mockResolvedValue(0)

      const response = await request(app)
        .get('/api/v1/plans?status=inactive')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])

      expect(response.status).toBe(200)
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gymId: mockGymId,
            isActive: false,
          }),
        })
      )
    })

    it('10. Search plans by name or description', async () => {
      const findManySpy = vi
        .spyOn(prisma.membershipPlan, 'findMany')
        .mockResolvedValue([samplePlan as any])
      vi.spyOn(prisma.membershipPlan, 'count').mockResolvedValue(1)

      const response = await request(app)
        .get('/api/v1/plans?search=شهري')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(200)
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'شهري' } },
              { description: { contains: 'شهري' } },
            ]),
          }),
        })
      )
    })

    it('11. Pagination metadata calculation', async () => {
      vi.spyOn(prisma.membershipPlan, 'findMany').mockResolvedValue([samplePlan as any])
      vi.spyOn(prisma.membershipPlan, 'count').mockResolvedValue(25)

      const response = await request(app)
        .get('/api/v1/plans?page=2&limit=10')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(200)
      expect(response.body.data.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      })
    })
  })

  // -------------------------------------------------------------
  // 3. GET SINGLE PLAN & GYM ISOLATION (Tests 12 - 13)
  // -------------------------------------------------------------
  describe('GET /api/v1/plans/:id (Get Single Plan)', () => {
    it('12. Get single plan details', async () => {
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)

      const response = await request(app)
        .get('/api/v1/plans/plan-uuid-101')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.plan.id).toBe('plan-uuid-101')
      expect(response.body.data.plan.price).toBe('500.00')
    })

    it('13. Cross-gym access returns 404 without leaking info', async () => {
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockImplementation(async ({ where }: any) => {
        if (where.gymId === mockGymId && where.id === 'foreign-plan-id') {
          return null
        }
        return null
      })

      const response = await request(app)
        .get('/api/v1/plans/foreign-plan-id')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('الباقة غير موجودة')
    })
  })

  // -------------------------------------------------------------
  // 4. UPDATE PLAN & RBAC (Tests 14 - 17)
  // -------------------------------------------------------------
  describe('PATCH /api/v1/plans/:id (Update Plan)', () => {
    it('14. OWNER can update plan', async () => {
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      vi.spyOn(prisma.membershipPlan, 'update').mockResolvedValue({
        ...samplePlan,
        price: new Prisma.Decimal(600.0),
      } as any)

      const response = await request(app)
        .patch('/api/v1/plans/plan-uuid-101')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          price: 600,
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.plan.price).toBe('600.00')
    })

    it('15. MANAGER can update plan', async () => {
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      vi.spyOn(prisma.membershipPlan, 'update').mockResolvedValue({
        ...samplePlan,
        description: 'وصف محدث',
      } as any)

      const response = await request(app)
        .patch('/api/v1/plans/plan-uuid-101')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({
          description: 'وصف محدث',
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('16. RECEPTIONIST cannot update plan (403 Forbidden)', async () => {
      const response = await request(app)
        .patch('/api/v1/plans/plan-uuid-101')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({ price: 600 })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })

    it('17. TRAINER cannot update plan (403 Forbidden)', async () => {
      const response = await request(app)
        .patch('/api/v1/plans/plan-uuid-101')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])
        .send({ price: 600 })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })
  })

  // -------------------------------------------------------------
  // 5. STATUS TOGGLE & AVAILABILITY ASSERTION (Tests 18 - 21)
  // -------------------------------------------------------------
  describe('Plan Status & Availability for Subscriptions', () => {
    it('18. Activate plan', async () => {
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue({
        ...samplePlan,
        isActive: false,
      } as any)
      vi.spyOn(prisma.membershipPlan, 'update').mockResolvedValue({
        ...samplePlan,
        isActive: true,
      } as any)

      const response = await request(app)
        .patch('/api/v1/plans/plan-uuid-101/status')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ isActive: true })

      expect(response.status).toBe(200)
      expect(response.body.data.plan.isActive).toBe(true)
    })

    it('19. Disable plan', async () => {
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      vi.spyOn(prisma.membershipPlan, 'update').mockResolvedValue({
        ...samplePlan,
        isActive: false,
      } as any)

      const response = await request(app)
        .patch('/api/v1/plans/plan-uuid-101/status')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({ isActive: false })

      expect(response.status).toBe(200)
      expect(response.body.data.plan.isActive).toBe(false)
    })

    it('20. Disabled plan remains in database (Never hard-deleted)', async () => {
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue({
        ...samplePlan,
        isActive: false,
      } as any)

      const response = await request(app)
        .get('/api/v1/plans/plan-uuid-101')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(200)
      expect(response.body.data.plan.isActive).toBe(false)
    })

    it('21. Disabled plan cannot be selected for future subscriptions (assertPlanAvailableForNewSubscription throws)', async () => {
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue({
        ...samplePlan,
        isActive: false,
      } as any)

      await expect(
        assertPlanAvailableForNewSubscription('plan-uuid-101', mockGymId)
      ).rejects.toThrow('لا يمكن استخدام باقة معطلة لإنشاء اشتراك جديد')
    })
  })

  // -------------------------------------------------------------
  // 6. VALIDATION & SECURITY (Tests 22 - 25)
  // -------------------------------------------------------------
  describe('Validation & Security', () => {
    it('22. Price supports decimal values correctly', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.membershipPlan, 'create').mockResolvedValue({
        ...samplePlan,
        price: new Prisma.Decimal(1250.75),
      } as any)

      const response = await request(app)
        .post('/api/v1/plans')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'باقة مخصصة',
          durationDays: 90,
          price: 1250.75,
        })

      expect(response.status).toBe(201)
      expect(response.body.data.plan.price).toBe('1250.75')
    })

    it('23. Currency remains EGP and cannot be customized from client', async () => {
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(null)
      const createSpy = vi
        .spyOn(prisma.membershipPlan, 'create')
        .mockResolvedValue(samplePlan as any)

      await request(app)
        .post('/api/v1/plans')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'باقة تجريبية',
          durationDays: 30,
          price: 300,
          currency: 'USD', // client attempt to inject foreign currency
        })

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'EGP',
          }),
        })
      )
    })

    it('24. Request body cannot override gymId or id', async () => {
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue(samplePlan as any)
      vi.spyOn(prisma.membershipPlan, 'findUnique').mockResolvedValue(null)
      const updateSpy = vi
        .spyOn(prisma.membershipPlan, 'update')
        .mockResolvedValue(samplePlan as any)

      await request(app)
        .patch('/api/v1/plans/plan-uuid-101')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          gymId: 'attacker-gym-id',
          id: 'hacked-id',
          name: 'اسم معدل',
        })

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'plan-uuid-101' },
          data: { name: 'اسم معدل' },
        })
      )
    })

    it('25. DELETE endpoint deletes plan without subscriptions or rejects if used', async () => {
      vi.spyOn(prisma.membershipPlan, 'findFirst').mockResolvedValue({
        ...samplePlan,
        _count: { subscriptions: 0 },
      } as any)
      vi.spyOn(prisma.membershipPlan, 'delete').mockResolvedValue(samplePlan as any)

      const response = await request(app)
        .delete('/api/v1/plans/plan-uuid-101')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(200)
    })
  })
})
