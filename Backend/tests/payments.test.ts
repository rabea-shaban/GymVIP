import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { Role, Prisma, PaymentMethod, WalletProvider, SubscriptionStatus } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'
import { getSubscriptionPaymentSummary } from '../src/services/payment.service.js'

describe('Feature 8: Payments & Financial Transactions Integration Tests', () => {
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

  const sampleSubscription = {
    id: 'sub-uuid-1',
    gymId: mockGymId,
    memberId: sampleMember.id,
    planId: 'plan-uuid-1',
    planName: 'اشتراك شهري',
    planPrice: new Prisma.Decimal(500.0),
    durationDays: 30,
    currency: 'EGP',
    startDate: new Date('2026-10-10T00:00:00.000Z'),
    endDate: new Date('2026-11-08T23:59:59.999Z'),
    status: SubscriptionStatus.ACTIVE,
    notes: '',
    createdAt: new Date('2026-10-10T10:00:00.000Z'),
    updatedAt: new Date('2026-10-10T10:00:00.000Z'),
    member: sampleMember,
    gym: { name: 'GymVIP Hub', phone: '0100000000', address: 'Cairo' },
  }

  const samplePayment = {
    id: 'payment-uuid-1',
    gymId: mockGymId,
    subscriptionId: sampleSubscription.id,
    memberId: sampleMember.id,
    amount: new Prisma.Decimal(200.0),
    currency: 'EGP',
    method: PaymentMethod.CASH,
    walletProvider: null,
    transactionReference: null,
    notes: 'دفعة أولى كاش',
    createdByUserId: mockOwnerId,
    createdAt: new Date('2026-10-10T10:05:00.000Z'),
    member: sampleMember,
    subscription: sampleSubscription,
    createdByUser: { id: mockOwnerId, name: 'مالك النادي', role: Role.OWNER },
    gym: { name: 'GymVIP Hub', phone: '0100000000', address: 'Cairo' },
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
        name: 'موظف النظام',
        email: 'staff@gymvip.eg',
        role,
        isActive: true,
        gym: { id: mockGymId, isActive: true },
      } as any
    })

    // Mock transaction to execute callback with prisma
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      return callback(prisma)
    })

    // Mock notification creation and user lookup
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([])
    vi.spyOn(prisma.notification, 'create').mockResolvedValue({} as any)
  })

  // -------------------------------------------------------------
  // 1. CREATE PAYMENT & RBAC (Tests 1 - 4)
  // -------------------------------------------------------------
  describe('POST /api/v1/payments (Create Payment & RBAC)', () => {
    it('1. OWNER can create cash payment', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.payment, 'create').mockResolvedValue(samplePayment as any)

      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 200,
          method: 'CASH',
          notes: 'دفعة أولى كاش',
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.payment.amount).toBe('200.00')
      expect(response.body.data.payment.method).toBe('CASH')
    })

    it('2. MANAGER can create cash payment', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.payment, 'create').mockResolvedValue({
        ...samplePayment,
        createdByUserId: mockManagerId,
      } as any)

      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 200,
          method: 'CASH',
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('3. RECEPTIONIST can create cash payment', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.payment, 'create').mockResolvedValue({
        ...samplePayment,
        createdByUserId: mockReceptionistId,
      } as any)

      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 200,
          method: 'CASH',
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('4. TRAINER cannot create payment (403 Forbidden)', async () => {
      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 200,
          method: 'CASH',
        })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })
  })

  // -------------------------------------------------------------
  // 2. PAYMENT METHODS & VALIDATIONS (Tests 5 - 7)
  // -------------------------------------------------------------
  describe('Payment Methods & Provider Validations', () => {
    it('5. Wallet payment works with valid provider and reference', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.payment, 'create').mockResolvedValue({
        ...samplePayment,
        method: PaymentMethod.WALLET,
        walletProvider: WalletProvider.VODAFONE_CASH,
        transactionReference: 'VC-998877',
      } as any)

      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 300,
          method: 'WALLET',
          walletProvider: 'VODAFONE_CASH',
          transactionReference: 'VC-998877',
        })

      expect(response.status).toBe(201)
      expect(response.body.data.payment.method).toBe('WALLET')
      expect(response.body.data.payment.walletProvider).toBe('VODAFONE_CASH')
    })

    it('6. Wallet provider is required when method is WALLET', async () => {
      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 300,
          method: 'WALLET',
        })

      expect(response.status).toBe(400)
    })

    it('7. Cash payment rejects walletProvider if provided', async () => {
      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 200,
          method: 'CASH',
          walletProvider: 'VODAFONE_CASH',
        })

      expect(response.status).toBe(400)
    })
  })

  // -------------------------------------------------------------
  // 3. FINANCIAL CALCULATIONS & OVERPAYMENT PREVENTION (Tests 8 - 15)
  // -------------------------------------------------------------
  describe('Financial Calculations & Overpayment Safety', () => {
    it('8. Partial payment calculates outstanding balance correctly', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.payment, 'create').mockResolvedValue(samplePayment as any)

      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 200,
          method: 'CASH',
        })

      expect(response.status).toBe(201)
      expect(response.body.data.payment.financialSummary.totalAmount).toBe('500.00')
      expect(response.body.data.payment.financialSummary.paidAmount).toBe('200.00')
      expect(response.body.data.payment.financialSummary.outstandingAmount).toBe('300.00')
      expect(response.body.data.payment.financialSummary.isPaid).toBe(false)
    })

    it('9. Multiple payments for same subscription work properly', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      // Already paid 200
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([
        {
          ...samplePayment,
          amount: new Prisma.Decimal(200.0),
        } as any,
      ])
      vi.spyOn(prisma.payment, 'create').mockResolvedValue({
        ...samplePayment,
        id: 'payment-uuid-2',
        amount: new Prisma.Decimal(150.0),
      } as any)

      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 150,
          method: 'CASH',
        })

      expect(response.status).toBe(201)
      expect(response.body.data.payment.financialSummary.paidAmount).toBe('350.00')
      expect(response.body.data.payment.financialSummary.outstandingAmount).toBe('150.00')
      expect(response.body.data.payment.financialSummary.isPaid).toBe(false)
    })

    it('10. Full payment marks subscription as fully paid', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.payment, 'create').mockResolvedValue({
        ...samplePayment,
        amount: new Prisma.Decimal(500.0),
      } as any)

      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 500,
          method: 'CASH',
        })

      expect(response.status).toBe(201)
      expect(response.body.data.payment.financialSummary.paidAmount).toBe('500.00')
      expect(response.body.data.payment.financialSummary.outstandingAmount).toBe('0.00')
      expect(response.body.data.payment.financialSummary.isPaid).toBe(true)
    })

    it('11. Service getSubscriptionPaymentSummary works correctly', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([
        { amount: new Prisma.Decimal(100.0) } as any,
        { amount: new Prisma.Decimal(150.0) } as any,
      ])

      const summary = await getSubscriptionPaymentSummary(sampleSubscription.id, mockGymId)
      expect(summary.totalAmount).toBe('500.00')
      expect(summary.paidAmount).toBe('250.00')
      expect(summary.outstandingAmount).toBe('250.00')
      expect(summary.isPaid).toBe(false)
      expect(summary.paymentCount).toBe(2)
    })

    it('12. Cannot pay more than outstanding balance (409 Conflict)', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      // Already paid 400 of 500
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([
        { amount: new Prisma.Decimal(400.0) } as any,
      ])

      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 200, // 200 > remaining 100
          method: 'CASH',
        })

      expect(response.status).toBe(409)
      expect(response.body.message).toBe('المبلغ المدفوع أكبر من المبلغ المستحق')
    })

    it('13. Cannot pay zero amount (400 Bad Request)', async () => {
      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 0,
          method: 'CASH',
        })

      expect(response.status).toBe(400)
    })

    it('14. Cannot pay negative amount (400 Bad Request)', async () => {
      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: -50,
          method: 'CASH',
        })

      expect(response.status).toBe(400)
    })

    it('15. Decimal amounts work accurately', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.payment, 'create').mockResolvedValue({
        ...samplePayment,
        amount: new Prisma.Decimal(125.75),
      } as any)

      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 125.75,
          method: 'CASH',
        })

      expect(response.status).toBe(201)
      expect(response.body.data.payment.amount).toBe('125.75')
    })
  })

  // -------------------------------------------------------------
  // 4. HISTORY, ACCESS & ISOLATION (Tests 16 - 20)
  // -------------------------------------------------------------
  describe('Payment History & Gym Isolation', () => {
    it('16. Payment list history works', async () => {
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([samplePayment as any])
      vi.spyOn(prisma.payment, 'count').mockResolvedValue(1)

      const response = await request(app)
        .get('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(200)
      expect(response.body.data.payments).toHaveLength(1)
      expect(response.body.data.pagination.total).toBe(1)
    })

    it('17. Subscription payments history works', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([samplePayment as any])

      const response = await request(app)
        .get(`/api/v1/subscriptions/${sampleSubscription.id}/payments`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(response.status).toBe(200)
      expect(response.body.data.payments).toHaveLength(1)
      expect(response.body.data.financialSummary.paidAmount).toBe('200.00')
    })

    it('18. Member payments history works', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([samplePayment as any])

      const response = await request(app)
        .get(`/api/v1/members/${sampleMember.id}/payments`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])

      expect(response.status).toBe(200)
      expect(response.body.data.payments).toHaveLength(1)
    })

    it('19. Cross-gym payment access returns 404', async () => {
      vi.spyOn(prisma.payment, 'findFirst').mockResolvedValue(null)

      const response = await request(app)
        .get('/api/v1/payments/foreign-payment-id')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(404)
      expect(response.body.message).toContain('العملية غير موجودة')
    })

    it('20. Cross-gym subscription payment access returns 404', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null)

      const response = await request(app)
        .get('/api/v1/subscriptions/foreign-sub-id/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(404)
      expect(response.body.message).toContain('الاشتراك غير موجود')
    })
  })

  // -------------------------------------------------------------
  // 5. IMMUTABILITY & RECEIPT INTEGRITY (Tests 21 - 29)
  // -------------------------------------------------------------
  describe('Immutability, Receipt Data & Security', () => {
    it('21. Payment cannot be edited (404 Not Found)', async () => {
      const response = await request(app)
        .patch('/api/v1/payments/pay-123')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ amount: 100 })

      expect(response.status).toBe(404)
    })

    it('22. Payment cannot be deleted (404 Not Found)', async () => {
      const response = await request(app)
        .delete('/api/v1/payments/pay-123')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(404)
    })

    it('23. Payment details endpoint includes receipt metadata', async () => {
      vi.spyOn(prisma.payment, 'findFirst').mockResolvedValue(samplePayment as any)
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([samplePayment as any])

      const response = await request(app)
        .get(`/api/v1/payments/${samplePayment.id}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(200)
      expect(response.body.data.payment.gym.name).toBe('GymVIP Hub')
      expect(response.body.data.payment.member.name).toBe('أحمد محمد')
      expect(response.body.data.payment.createdByUser.name).toBe('مالك النادي')
    })

    it('24. Concurrent payments transaction checks remaining balance inside tx', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      // Already fully paid 500
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([
        { amount: new Prisma.Decimal(500.0) } as any,
      ])

      const response = await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 50,
          method: 'CASH',
        })

      expect(response.status).toBe(409)
      expect(response.body.message).toBe('المبلغ المدفوع أكبر من المبلغ المستحق')
    })

    it('25. Currency is set to EGP by default', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([])
      const createSpy = vi.spyOn(prisma.payment, 'create').mockResolvedValue(samplePayment as any)

      await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 200,
          method: 'CASH',
        })

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'EGP',
          }),
        })
      )
    })

    it('26. Payment creator ID is saved', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([])
      const createSpy = vi.spyOn(prisma.payment, 'create').mockResolvedValue(samplePayment as any)

      await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 200,
          method: 'CASH',
        })

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdByUserId: mockOwnerId,
          }),
        })
      )
    })

    it('27, 28, 29. Client cannot override memberId, gymId, or subscriptionPrice', async () => {
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleSubscription as any)
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([])
      const createSpy = vi.spyOn(prisma.payment, 'create').mockResolvedValue(samplePayment as any)

      await request(app)
        .post('/api/v1/payments')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          subscriptionId: sampleSubscription.id,
          amount: 200,
          method: 'CASH',
          memberId: 'foreign-member-id',
          gymId: 'foreign-gym-id',
          subscriptionPrice: 10,
        })

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gymId: mockGymId, // Authoritative gymId
            memberId: sampleMember.id, // Derived from subscription in DB
          }),
        })
      )
    })
  })
})
