import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { Role, Prisma, SubscriptionStatus, PaymentMethod } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../src/types/audit.types.js'

describe('Feature 16: Subscription Cancellation & Controlled Adjustments Integration Tests', () => {
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

  const sampleActiveSubscription = {
    id: 'sub-active-1',
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
    notes: 'اشتراك رئيسي نشط',
    cancelledAt: null,
    cancellationReason: null,
    cancellationNotes: null,
    cancelledByUserId: null,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
    member: sampleMember,
    plan: samplePlan,
    cancelledByUser: null,
  }

  const sampleFrozenSubscription = {
    id: 'sub-frozen-1',
    gymId: mockGymId,
    memberId: sampleMember.id,
    planId: samplePlan.id,
    planName: 'باقة 30 يوم',
    planPrice: new Prisma.Decimal(600.0),
    durationDays: 30,
    currency: 'EGP',
    startDate: new Date('2026-10-01T00:00:00.000Z'),
    endDate: new Date('2026-11-10T23:59:59.999Z'),
    status: SubscriptionStatus.FROZEN,
    notes: 'اشتراك مجمد مؤقتاً',
    cancelledAt: null,
    cancellationReason: null,
    cancellationNotes: null,
    cancelledByUserId: null,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
    member: sampleMember,
    plan: samplePlan,
    cancelledByUser: null,
  }

  const sampleExpiredSubscription = {
    id: 'sub-expired-1',
    gymId: mockGymId,
    memberId: sampleMember.id,
    planId: samplePlan.id,
    planName: 'باقة 30 يوم',
    planPrice: new Prisma.Decimal(600.0),
    durationDays: 30,
    currency: 'EGP',
    startDate: new Date('2026-08-01T00:00:00.000Z'),
    endDate: new Date('2026-08-31T23:59:59.999Z'),
    status: SubscriptionStatus.EXPIRED,
    notes: 'اشتراك منتهي',
    cancelledAt: null,
    cancellationReason: null,
    cancellationNotes: null,
    cancelledByUserId: null,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
    member: sampleMember,
    plan: samplePlan,
    cancelledByUser: null,
  }

  const sampleCancelledSubscription = {
    id: 'sub-cancelled-1',
    gymId: mockGymId,
    memberId: sampleMember.id,
    planId: samplePlan.id,
    planName: 'باقة 30 يوم',
    planPrice: new Prisma.Decimal(600.0),
    durationDays: 30,
    currency: 'EGP',
    startDate: new Date('2026-10-01T00:00:00.000Z'),
    endDate: new Date('2026-10-30T23:59:59.999Z'),
    status: SubscriptionStatus.CANCELLED,
    notes: 'اشتراك ملغى سلفاً',
    cancelledAt: new Date('2026-10-05T12:00:00.000Z'),
    cancellationReason: 'سفر مفاجئ خارج البلاد',
    cancellationNotes: 'تمت مراجعة الإلغاء بمعرفة الإدارة',
    cancelledByUserId: mockOwnerId,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-05T12:00:00.000Z'),
    member: sampleMember,
    plan: samplePlan,
    cancelledByUser: {
      id: mockOwnerId,
      name: 'مالك النادي',
      role: Role.OWNER,
    },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'))

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

    // Mock audit log creation
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // 1. Cancellation eligibility (ACTIVE can be cancelled)
  it('1. should allow cancelling an ACTIVE subscription', async () => {
    vi.spyOn(prisma.subscription, 'findFirst')
      .mockResolvedValueOnce(sampleActiveSubscription as any)
      .mockResolvedValueOnce({
        ...sampleActiveSubscription,
        status: SubscriptionStatus.CANCELLED,
        cancellationReason: 'طلب العضو الإلغاء لظروف خاصة',
        cancelledByUserId: mockOwnerId,
        cancelledAt: new Date(),
      } as any)

    vi.spyOn(prisma.subscription, 'updateMany').mockResolvedValue({ count: 1 })

    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleActiveSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: 'طلب العضو الإلغاء لظروف خاصة',
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.subscription.status).toBe(SubscriptionStatus.CANCELLED)
  })

  // 2. Cancellation eligibility (FROZEN can be cancelled)
  it('2. should allow cancelling a FROZEN subscription', async () => {
    vi.spyOn(prisma.subscription, 'findFirst')
      .mockResolvedValueOnce(sampleFrozenSubscription as any)
      .mockResolvedValueOnce({
        ...sampleFrozenSubscription,
        status: SubscriptionStatus.CANCELLED,
        cancellationReason: 'ظروف صحية طارئة أثناء فترة التجميد',
        cancelledByUserId: mockOwnerId,
        cancelledAt: new Date(),
      } as any)

    vi.spyOn(prisma.subscription, 'updateMany').mockResolvedValue({ count: 1 })

    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleFrozenSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: 'ظروف صحية طارئة أثناء فترة التجميد',
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.subscription.status).toBe(SubscriptionStatus.CANCELLED)
  })

  // 3. Rejection of EXPIRED cancellation (409)
  it('3. should reject cancellation of an EXPIRED subscription with 409 Conflict', async () => {
    vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleExpiredSubscription as any)

    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleExpiredSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: 'إلغاء اشتراك منتهي الصلاحية',
      })

    expect(response.status).toBe(409)
    expect(response.body.success).toBe(false)
  })

  // 4. Rejection of CANCELLED cancellation (already cancelled -> 409)
  it('4. should reject cancellation if subscription is already CANCELLED with 409 Conflict', async () => {
    vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleCancelledSubscription as any)

    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleCancelledSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: 'إلغاء اشتراك ملغى بالفعل',
      })

    expect(response.status).toBe(409)
    expect(response.body.success).toBe(false)
  })

  // 5. Effective status EXPIRED rejection (409)
  it('5. should reject cancellation if subscription has passed its end date (effective EXPIRED) with 409', async () => {
    const pastActiveSub = {
      ...sampleActiveSubscription,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-01-31T23:59:59.999Z'),
      status: SubscriptionStatus.ACTIVE,
    }
    vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(pastActiveSub as any)

    const response = await request(app)
      .post(`/api/v1/subscriptions/${pastActiveSub.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: 'محاولة إلغاء اشتراك انتهى تاريخه عملياً',
      })

    expect(response.status).toBe(409)
    expect(response.body.success).toBe(false)
  })

  // 6. Non-existent subscription 404
  it('6. should return 404 if subscription does not exist', async () => {
    vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null)

    const response = await request(app)
      .post('/api/v1/subscriptions/non-existent-id/cancel')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: 'إلغاء اشتراك غير موجود',
      })

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })

  // 7. Cross-gym isolation (cannot cancel subscription belonging to another gym -> 404)
  it('7. should return 404 when attempting to cancel a subscription from another gym', async () => {
    vi.spyOn(prisma.subscription, 'findFirst').mockImplementation(async ({ where }: any) => {
      if (where.gymId === mockGymId) return null
      return sampleActiveSubscription as any
    })

    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleActiveSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: 'محاولة إلغاء اشتراك جيم آخر',
      })

    expect(response.status).toBe(404)
  })

  // 8. RBAC: OWNER allowed (200)
  it('8. should allow OWNER to cancel a subscription', async () => {
    vi.spyOn(prisma.subscription, 'findFirst')
      .mockResolvedValueOnce(sampleActiveSubscription as any)
      .mockResolvedValueOnce({
        ...sampleActiveSubscription,
        status: SubscriptionStatus.CANCELLED,
      } as any)
    vi.spyOn(prisma.subscription, 'updateMany').mockResolvedValue({ count: 1 })

    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleActiveSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: 'إلغاء مصرح للمالك',
      })

    expect(response.status).toBe(200)
  })

  // 9. RBAC: MANAGER allowed (200)
  it('9. should allow MANAGER to cancel a subscription', async () => {
    vi.spyOn(prisma.subscription, 'findFirst')
      .mockResolvedValueOnce(sampleActiveSubscription as any)
      .mockResolvedValueOnce({
        ...sampleActiveSubscription,
        status: SubscriptionStatus.CANCELLED,
      } as any)
    vi.spyOn(prisma.subscription, 'updateMany').mockResolvedValue({ count: 1 })

    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleActiveSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
      .send({
        reason: 'إلغاء مصرح للمدير',
      })

    expect(response.status).toBe(200)
  })

  // 10. RBAC: RECEPTIONIST forbidden (403)
  it('10. should strictly forbid RECEPTIONIST from cancelling a subscription with 403', async () => {
    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleActiveSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
      .send({
        reason: 'محاولة إلغاء من موظف الاستقبال',
      })

    expect(response.status).toBe(403)
    expect(response.body.success).toBe(false)
  })

  // 11. RBAC: TRAINER forbidden (403)
  it('11. should strictly forbid TRAINER from cancelling a subscription with 403', async () => {
    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleActiveSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])
      .send({
        reason: 'محاولة إلغاء من المدرب',
      })

    expect(response.status).toBe(403)
    expect(response.body.success).toBe(false)
  })

  // 12. Validation: reason required (400)
  it('12. should reject request if cancellation reason is missing with 400', async () => {
    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleActiveSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({})

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  // 13. Validation: reason min length 3 chars (400)
  it('13. should reject request if cancellation reason is less than 3 characters with 400', async () => {
    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleActiveSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: ' لا ',
      })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  // 14. Validation: reason max length 250 chars (400)
  it('14. should reject request if cancellation reason exceeds 250 characters with 400', async () => {
    const longReason = 'أ'.repeat(251)
    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleActiveSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: longReason,
      })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  // 15. Validation: notes optional and trimmed
  it('15. should accept optional notes and trim values', async () => {
    let capturedData: any = null
    vi.spyOn(prisma.subscription, 'findFirst')
      .mockResolvedValueOnce(sampleActiveSubscription as any)
      .mockResolvedValueOnce({
        ...sampleActiveSubscription,
        status: SubscriptionStatus.CANCELLED,
        cancellationReason: 'سبب صحيح',
        cancellationNotes: 'ملاحظة مهمة',
      } as any)

    vi.spyOn(prisma.subscription, 'updateMany').mockImplementation(async (args: any) => {
      capturedData = args.data
      return { count: 1 }
    })

    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleActiveSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: '   سبب صحيح   ',
        notes: '   ملاحظة مهمة   ',
      })

    expect(response.status).toBe(200)
    expect(capturedData.cancellationReason).toBe('سبب صحيح')
    expect(capturedData.cancellationNotes).toBe('ملاحظة مهمة')
  })

  // 16. Validation: notes max length 1000 chars (400)
  it('16. should reject request if notes exceed 1000 characters with 400', async () => {
    const longNotes = 'م'.repeat(1001)
    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleActiveSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: 'سبب مقبول',
        notes: longNotes,
      })

    expect(response.status).toBe(400)
  })

  // 17. Validation: unknown fields rejected (strict schema) (400)
  it('17. should reject unrecognized extra properties with 400 due to strict schema', async () => {
    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleActiveSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: 'سبب سليم',
        refundAmount: 500, // Invalid field
      })

    expect(response.status).toBe(400)
  })

  // 18. Atomic transaction: updates status to CANCELLED, records cancelledAt, cancellationReason, cancellationNotes, cancelledByUserId
  it('18. should update status, cancelledAt, cancellationReason, cancellationNotes, and cancelledByUserId atomically', async () => {
    let updatedPayload: any = null
    vi.spyOn(prisma.subscription, 'findFirst')
      .mockResolvedValueOnce(sampleActiveSubscription as any)
      .mockResolvedValueOnce({
        ...sampleActiveSubscription,
        status: SubscriptionStatus.CANCELLED,
        cancellationReason: 'إصابة جسدية تمنع التدريب',
        cancellationNotes: 'تم تقديم التقرير الطبي',
        cancelledByUserId: mockOwnerId,
        cancelledAt: new Date(),
      } as any)

    vi.spyOn(prisma.subscription, 'updateMany').mockImplementation(async (args: any) => {
      updatedPayload = args.data
      return { count: 1 }
    })

    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleActiveSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: 'إصابة جسدية تمنع التدريب',
        notes: 'تم تقديم التقرير الطبي',
      })

    expect(response.status).toBe(200)
    expect(updatedPayload.status).toBe(SubscriptionStatus.CANCELLED)
    expect(updatedPayload.cancellationReason).toBe('إصابة جسدية تمنع التدريب')
    expect(updatedPayload.cancellationNotes).toBe('تم تقديم التقرير الطبي')
    expect(updatedPayload.cancelledByUserId).toBe(mockOwnerId)
    expect(updatedPayload.cancelledAt).toBeInstanceOf(Date)
  })

  // 19. Concurrency guard: updateMany returning count 0 returns 409 Conflict
  it('19. should return 409 Conflict if concurrent cancellation causes update count to be 0', async () => {
    vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleActiveSubscription as any)
    vi.spyOn(prisma.subscription, 'updateMany').mockResolvedValue({ count: 0 })

    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleActiveSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: 'محاولة إلغاء متزامنة',
      })

    expect(response.status).toBe(409)
    expect(response.body.message).toContain('تعذر إلغاء الاشتراك')
  })

  // 20. Audit log: created within transaction with action SUBSCRIPTION_CANCELLED, actorUserId, metadata, beforeData, afterData
  it('20. should write an immutable audit log entry for SUBSCRIPTION_CANCELLED', async () => {
    let auditLogData: any = null
    vi.spyOn(prisma.subscription, 'findFirst')
      .mockResolvedValueOnce(sampleActiveSubscription as any)
      .mockResolvedValueOnce({
        ...sampleActiveSubscription,
        status: SubscriptionStatus.CANCELLED,
        cancellationReason: 'سفر مفاجئ للعمل',
      } as any)
    vi.spyOn(prisma.subscription, 'updateMany').mockResolvedValue({ count: 1 })

    vi.spyOn(prisma.auditLog, 'create').mockImplementation(async (args: any) => {
      auditLogData = args.data
      return {} as any
    })

    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleActiveSubscription.id}/cancel`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        reason: 'سفر مفاجئ للعمل',
      })

    expect(response.status).toBe(200)
    expect(auditLogData).toBeDefined()
    expect(auditLogData.action).toBe(AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED)
    expect(auditLogData.entityType).toBe(AUDIT_ENTITY_TYPES.SUBSCRIPTION)
    expect(auditLogData.entityId).toBe(sampleActiveSubscription.id)
    expect(auditLogData.actorUserId).toBe(mockOwnerId)
    expect(auditLogData.metadata.reason).toBe('سفر مفاجئ للعمل')
  })

  // 21. Financial integrity: payments preserved on cancelled subscription
  it('21. should preserve existing payment history when fetching payments for cancelled subscription', async () => {
    const samplePayment = {
      id: 'pay-uuid-1',
      gymId: mockGymId,
      subscriptionId: sampleCancelledSubscription.id,
      memberId: sampleMember.id,
      amount: new Prisma.Decimal(300.0),
      currency: 'EGP',
      method: PaymentMethod.CASH,
      referenceNumber: null,
      notes: 'دفعة سابقة',
      createdAt: new Date('2026-10-01T11:00:00.000Z'),
      updatedAt: new Date('2026-10-01T11:00:00.000Z'),
      subscription: sampleCancelledSubscription,
      member: sampleMember,
      createdByUser: {
        id: mockOwnerId,
        name: 'مالك النادي',
        role: Role.OWNER,
      },
    }

    vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleCancelledSubscription as any)
    vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([samplePayment] as any)

    const response = await request(app)
      .get(`/api/v1/subscriptions/${sampleCancelledSubscription.id}/payments`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.payments.length).toBe(1)
    expect(response.body.data.payments[0].amount).toBe('300.00')
  })

  // 22. Financial integrity: cannot create new payment on cancelled subscription (409)
  it('22. should reject new payments for cancelled subscription with 409 Conflict', async () => {
    vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleCancelledSubscription as any)

    const response = await request(app)
      .post('/api/v1/payments')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        subscriptionId: sampleCancelledSubscription.id,
        amount: 300,
        method: PaymentMethod.CASH,
      })

    expect(response.status).toBe(409)
    expect(response.body.message).toContain('لا يمكن سداد اشتراك ملغي')
  })

  // 23. Attendance integration: check-in rejected for cancelled subscription (409)
  it('23. should reject attendance check-in for a member whose current subscription is cancelled', async () => {
    vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
    vi.spyOn(prisma.attendance, 'findFirst').mockResolvedValue(null)
    vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([sampleCancelledSubscription] as any)

    const response = await request(app)
      .post('/api/v1/attendance/check-in')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
      .send({
        memberId: sampleMember.id,
      })

    expect(response.status).toBe(409)
    expect(response.body.message).toContain('لا يوجد اشتراك نشط يسمح بتسجيل الحضور')
  })

  // 24. Freeze integration: cannot freeze cancelled subscription (409)
  it('24. should reject freeze requests for a cancelled subscription with 409 Conflict', async () => {
    vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleCancelledSubscription as any)

    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleCancelledSubscription.id}/freeze`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        days: 7,
        reason: 'محاولة تجميد اشتراك ملغى',
      })

    expect(response.status).toBe(409)
    expect(response.body.message).toContain('لا يمكن تجميد اشتراك ملغى')
  })

  // 25. Renewal integration: cannot renew cancelled subscription directly (409)
  it('25. should reject renewal requests for a cancelled subscription directly with 409 Conflict', async () => {
    vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleCancelledSubscription as any)

    const response = await request(app)
      .post(`/api/v1/subscriptions/${sampleCancelledSubscription.id}/renew`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .send({
        planId: samplePlan.id,
      })

    expect(response.status).toBe(409)
    expect(response.body.message).toContain('لا يمكن تجديد اشتراك ملغى مباشرة')
  })

  // 26. Member current subscription: cancelled subscription excluded from active/current
  it('26. should return null or exclude cancelled subscriptions when querying member current subscription', async () => {
    vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
    vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([])

    const response = await request(app)
      .get(`/api/v1/members/${sampleMember.id}/subscriptions/current`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(200)
    expect(response.body.data.subscription).toBeNull()
  })

  // 27. Privacy/RBAC: Trainer reading cancelled subscription has restricted cancellation fields masked (null)
  it('27. should mask notes, cancellationReason, cancellationNotes, and cancelledByUser for TRAINER', async () => {
    vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleCancelledSubscription as any)

    const response = await request(app)
      .get(`/api/v1/subscriptions/${sampleCancelledSubscription.id}`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])

    expect(response.status).toBe(200)
    const sub = response.body.data.subscription
    expect(sub.status).toBe(SubscriptionStatus.CANCELLED)
    expect(sub.notes).toBeNull()
    expect(sub.cancellationReason).toBeNull()
    expect(sub.cancellationNotes).toBeNull()
    expect(sub.cancelledByUserId).toBeNull()
    expect(sub.cancelledByUser).toBeNull()
  })

  // 28. Owner/Manager reading cancelled subscription sees cancellation metadata and cancelledByUser
  it('28. should reveal cancellation metadata and cancelledByUser to OWNER/MANAGER', async () => {
    vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(sampleCancelledSubscription as any)

    const response = await request(app)
      .get(`/api/v1/subscriptions/${sampleCancelledSubscription.id}`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(200)
    const sub = response.body.data.subscription
    expect(sub.status).toBe(SubscriptionStatus.CANCELLED)
    expect(sub.cancellationReason).toBe('سفر مفاجئ خارج البلاد')
    expect(sub.cancellationNotes).toBe('تمت مراجعة الإلغاء بمعرفة الإدارة')
    expect(sub.cancelledByUser).toBeDefined()
    expect(sub.cancelledByUser.id).toBe(mockOwnerId)
    expect(sub.cancelledByUser.name).toBe('مالك النادي')
  })
})
