import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { Role, Prisma, SubscriptionStatus, PaymentMethod } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'

describe('Feature 13: Dashboard & Reports Integration Tests', () => {
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

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock user lookup for auth middleware
    prisma.user.findUnique = vi.fn().mockImplementation(({ where }) => {
      let role = Role.OWNER
      if (where.id === mockManagerId) role = Role.MANAGER
      if (where.id === mockReceptionistId) role = Role.RECEPTIONIST
      if (where.id === mockTrainerId) role = Role.TRAINER

      return Promise.resolve({
        id: where.id,
        gymId: mockGymId,
        name: 'موظف تجريبي',
        role,
        isActive: true,
        gym: { id: mockGymId, isActive: true },
      })
    })
  })

  // =========================================================================
  // 1. GET /api/v1/dashboard/overview
  // =========================================================================
  describe('GET /api/v1/dashboard/overview', () => {
    it('1. OWNER receives full dashboard with real metrics and financial totals', async () => {
      // Mock counts
      prisma.member.count = vi.fn().mockResolvedValue(100)
      prisma.subscription.count = vi.fn().mockResolvedValue(40)
      prisma.subscription.findMany = vi.fn().mockImplementation(({ where }) => {
        if (where?.status?.in) {
          // active subscriptions for outstanding balance
          return Promise.resolve([
            {
              id: 'sub-1',
              planPrice: new Prisma.Decimal(1000),
              payments: [{ amount: new Prisma.Decimal(600) }],
            },
          ])
        }
        return Promise.resolve([])
      })
      prisma.attendance.findMany = vi.fn().mockResolvedValue([{ memberId: 'm-1' }, { memberId: 'm-2' }])
      prisma.attendance.count = vi.fn().mockResolvedValue(15)
      prisma.payment.findMany = vi.fn().mockResolvedValue([
        { amount: new Prisma.Decimal(500), method: PaymentMethod.CASH, createdAt: new Date() },
      ])
      prisma.trainer.count = vi.fn().mockResolvedValue(4)
      prisma.member.findMany = vi.fn().mockResolvedValue([
        { id: 'm-1', name: 'أحمد', memberCode: 'M-1', createdAt: new Date() },
      ])

      const res = await request(app)
        .get('/api/v1/dashboard/overview')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.members.total).toBe(100)
      expect(res.body.data.payments).toBeDefined()
      expect(res.body.data.payments.collectedToday).toBe('500.00')
      expect(res.body.data.payments.outstandingAmount).toBe('400.00')
      expect(res.body.data.charts.monthlyPayments).toBeDefined()
      expect(res.body.data.charts.dailyAttendance).toHaveLength(7)
    })

    it('2. RECEPTIONIST receives operational metrics but NO financial totals or financial charts', async () => {
      prisma.member.count = vi.fn().mockResolvedValue(50)
      prisma.subscription.count = vi.fn().mockResolvedValue(25)
      prisma.subscription.findMany = vi.fn().mockResolvedValue([])
      prisma.attendance.findMany = vi.fn().mockResolvedValue([])
      prisma.attendance.count = vi.fn().mockResolvedValue(8)
      prisma.trainer.count = vi.fn().mockResolvedValue(2)
      prisma.member.findMany = vi.fn().mockResolvedValue([])

      const res = await request(app)
        .get('/api/v1/dashboard/overview')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.members.total).toBe(50)
      expect(res.body.data.attendance.checkInsToday).toBe(8)
      expect(res.body.data.payments).toBeUndefined()
      expect(res.body.data.charts.monthlyPayments).toBeUndefined()
    })

    it('3. TRAINER receives no financial summary', async () => {
      prisma.member.count = vi.fn().mockResolvedValue(30)
      prisma.subscription.count = vi.fn().mockResolvedValue(10)
      prisma.subscription.findMany = vi.fn().mockResolvedValue([])
      prisma.attendance.findMany = vi.fn().mockResolvedValue([])
      prisma.attendance.count = vi.fn().mockResolvedValue(3)
      prisma.trainer.count = vi.fn().mockResolvedValue(2)
      prisma.member.findMany = vi.fn().mockResolvedValue([])

      const res = await request(app)
        .get('/api/v1/dashboard/overview')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.payments).toBeUndefined()
      expect(res.body.data.charts.monthlyPayments).toBeUndefined()
    })
  })

  // =========================================================================
  // 2. GET /api/v1/reports/summary
  // =========================================================================
  describe('GET /api/v1/reports/summary', () => {
    it('4. should return operational summary for valid date filter', async () => {
      prisma.member.count = vi.fn().mockResolvedValue(10)
      prisma.subscription.count = vi.fn().mockResolvedValue(5)
      prisma.attendance.count = vi.fn().mockResolvedValue(20)
      prisma.attendance.findMany = vi.fn().mockResolvedValue([{ memberId: 'm-1' }, { memberId: 'm-2' }])
      prisma.payment.findMany = vi.fn().mockResolvedValue([
        { amount: new Prisma.Decimal(300), method: PaymentMethod.CASH },
      ])
      prisma.subscription.findMany = vi.fn().mockResolvedValue([])

      const res = await request(app)
        .get('/api/v1/reports/summary?from=2026-10-01&to=2026-10-09')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.dateRange.from).toBe('2026-10-01')
      expect(res.body.data.dateRange.to).toBe('2026-10-09')
      expect(res.body.data.members.totalCreated).toBe(10)
      expect(res.body.data.payments?.totalCollected).toBe('300.00')
    })

    it('5. should reject invalid date range where from > to with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/v1/reports/summary?from=2026-10-15&to=2026-10-01')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })

  // =========================================================================
  // 3. Category Reports
  // =========================================================================
  describe('Category Reports Endpoints', () => {
    it('6. GET /api/v1/reports/members should return member breakdown', async () => {
      prisma.member.count = vi.fn().mockResolvedValue(5)
      prisma.member.findMany = vi.fn().mockResolvedValue([
        { createdAt: new Date('2026-10-02T10:00:00.000Z') },
        { createdAt: new Date('2026-10-02T12:00:00.000Z') },
      ])

      const res = await request(app)
        .get('/api/v1/reports/members?from=2026-10-01&to=2026-10-09')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.data.totalCreated).toBe(5)
      expect(res.body.data.breakdown).toHaveLength(1)
      expect(res.body.data.breakdown[0].count).toBe(2)
    })

    it('7. GET /api/v1/reports/payments allows OWNER and MANAGER', async () => {
      prisma.payment.findMany = vi.fn().mockResolvedValue([
        { amount: new Prisma.Decimal(500), method: PaymentMethod.CASH, createdAt: new Date('2026-10-05T10:00:00.000Z') },
        { amount: new Prisma.Decimal(250), method: PaymentMethod.WALLET, createdAt: new Date('2026-10-05T11:00:00.000Z') },
      ])
      prisma.subscription.findMany = vi.fn().mockResolvedValue([])

      const res = await request(app)
        .get('/api/v1/reports/payments?from=2026-10-01&to=2026-10-09')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.data.totalCollected).toBe('750.00')
      expect(res.body.data.byMethod.cash).toBe('500.00')
      expect(res.body.data.byMethod.wallet).toBe('250.00')
    })

    it('8. GET /api/v1/reports/payments denies RECEPTIONIST and TRAINER with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/reports/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })
  })
})
