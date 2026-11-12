import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { Role, Prisma, SubscriptionStatus, PaymentMethod } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'
import { env } from '../src/config/env.js'
import { sanitizeFormulaInjection } from '../src/utils/export.util.js'

describe('Feature 18: Security Hardening & Production Readiness Tests', () => {
  const gymAId = 'gym-aaa-111'
  const gymBId = 'gym-bbb-222'

  const ownerAId = 'user-owner-a'
  const trainerAId = 'user-trainer-a'

  const ownerAToken = generateAuthToken({
    sub: ownerAId,
    gymId: gymAId,
    role: Role.OWNER,
  })

  const trainerAToken = generateAuthToken({
    sub: trainerAId,
    gymId: gymAId,
    role: Role.TRAINER,
  })

  beforeEach(() => {
    vi.restoreAllMocks()

    // Default mock user for Owner A
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async (args: any) => {
      if (args.where?.id === ownerAId) {
        return {
          id: ownerAId,
          gymId: gymAId,
          name: 'مالك جيم أ',
          email: 'owner@gyma.com',
          role: Role.OWNER,
          isActive: true,
          gym: { id: gymAId, isActive: true },
        } as any
      }
      if (args.where?.id === trainerAId) {
        return {
          id: trainerAId,
          gymId: gymAId,
          name: 'مدرب جيم أ',
          email: 'trainer@gyma.com',
          role: Role.TRAINER,
          isActive: true,
          gym: { id: gymAId, isActive: true },
        } as any
      }
      return null
    })
  })

  // 1. Invalid JWT is rejected
  it('1. should reject invalid JWT signature or format with 401', async () => {
    const res = await request(app)
      .get('/api/v1/members')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=invalid.jwt.token`])

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  // 2. Expired JWT is rejected
  it('2. should reject expired JWT with 401', async () => {
    const expiredToken = jwt.sign(
      { sub: ownerAId, gymId: gymAId, role: Role.OWNER },
      env.JWT_SECRET,
      { expiresIn: '-1s' }
    )

    const res = await request(app)
      .get('/api/v1/members')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${expiredToken}`])

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  // 3. Inactive users cannot access protected endpoints
  it('3. should reject inactive user with 403', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
      id: ownerAId,
      gymId: gymAId,
      name: 'معطل',
      email: 'owner@gyma.com',
      role: Role.OWNER,
      isActive: false, // inactive!
      gym: { id: gymAId, isActive: true },
    } as any)

    const res = await request(app)
      .get('/api/v1/members')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  // 4. Inactive gyms cannot access protected endpoints
  it('4. should reject user whose gym is inactive with 403', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
      id: ownerAId,
      gymId: gymAId,
      name: 'مالك',
      email: 'owner@gyma.com',
      role: Role.OWNER,
      isActive: true,
      gym: { id: gymAId, isActive: false }, // gym inactive!
    } as any)

    const res = await request(app)
      .get('/api/v1/members')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  // 5. Cross-gym member access is rejected
  it('5. should reject cross-gym member access (Member belongs to Gym B, actor in Gym A) with 404', async () => {
    vi.spyOn(prisma.member, 'findFirst').mockResolvedValueOnce(null)

    const res = await request(app)
      .get('/api/v1/members/member-of-gym-b')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  // 6. Cross-gym subscription access is rejected
  it('6. should reject cross-gym subscription access with 404', async () => {
    vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValueOnce(null)

    const res = await request(app)
      .get('/api/v1/subscriptions/sub-of-gym-b')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  // 7. Cross-gym payment access is rejected
  it('7. should reject cross-gym payment access with 404', async () => {
    vi.spyOn(prisma.payment, 'findFirst').mockResolvedValueOnce(null)

    const res = await request(app)
      .get('/api/v1/payments/payment-of-gym-b')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  // 8. Cross-gym attendance access is rejected
  it('8. should reject cross-gym attendance query with 404 or isolation', async () => {
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      const mockTx = {
        member: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      }
      return callback(mockTx)
    })

    const res = await request(app)
      .post('/api/v1/attendance/check-in')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])
      .send({ memberId: 'member-of-gym-b' })

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  // 9. Cross-gym export access is strictly isolated
  it('9. should strictly query export data scoped to actor gymId only', async () => {
    const countSpy = vi.spyOn(prisma.member, 'count').mockResolvedValueOnce(1)
    const findManySpy = vi.spyOn(prisma.member, 'findMany').mockResolvedValueOnce([
      {
        id: 'mem-1',
        gymId: gymAId,
        memberCode: 'MEM-001',
        name: 'عضو جيم أ',
        phone: '01011111111',
        email: null,
        gender: 'MALE',
        dateOfBirth: null,
        createdAt: new Date(),
        isActive: true,
        notes: null,
      } as any,
    ])
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValueOnce({} as any)

    const res = await request(app)
      .get('/api/v1/exports/members?format=csv')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])

    expect(res.status).toBe(200)
    expect(countSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ gymId: gymAId }),
      })
    )
    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ gymId: gymAId }),
      })
    )
  })

  // 10. Unauthorized financial report access is rejected (TRAINER trying to access financial payments)
  it('10. should forbid TRAINER from accessing payments report with 403', async () => {
    const res = await request(app)
      .get('/api/v1/reports/payments')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerAToken}`])

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  // 11. Mass-assignment attempts on registration are rejected or ignored
  it('11. should ignore or reject untrusted mass-assignment fields (e.g. role: OWNER, isActive: true injected in member)', async () => {
    vi.spyOn(prisma.member, 'findUnique').mockResolvedValueOnce(null)
    vi.spyOn(prisma.member, 'findFirst').mockResolvedValueOnce(null)
    const createSpy = vi.spyOn(prisma.member, 'create').mockResolvedValueOnce({
      id: 'mem-new',
      gymId: gymAId,
      memberCode: 'GYM-000001',
      name: 'عضو جديد',
      phone: '01012345678',
      email: null,
      gender: null,
      dateOfBirth: null,
      address: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      notes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValueOnce({} as any)

    const res = await request(app)
      .post('/api/v1/members')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])
      .send({
        name: 'عضو جديد',
        phone: '01012345678',
        role: 'SUPERADMIN', // Mass assignment attack
        gymId: 'fake-gym-id', // Tenant escape attempt
      })

    expect(res.status).toBe(201)
    // Verify create was called strictly with actor gymId, not fake-gym-id
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gymId: gymAId,
        }),
      })
    )
  })

  // 12. Invalid query parameters are rejected by validation middleware
  it('12. should reject invalid pagination query params with 400', async () => {
    const res = await request(app)
      .get('/api/v1/members?page=-5')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  // 13. Overpayment is rejected
  it('13. should reject overpayment beyond remaining subscription balance with 409', async () => {
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      const mockTx = {
        subscription: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'sub-1',
            gymId: gymAId,
            planPrice: new Prisma.Decimal(1000),
            currency: 'EGP',
            status: 'ACTIVE',
            memberId: 'mem-1',
          }),
        },
        payment: {
          findMany: vi.fn().mockResolvedValue([
            { amount: new Prisma.Decimal(800) },
          ]),
        },
      }
      return callback(mockTx)
    })

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])
      .send({
        subscriptionId: 'sub-1',
        amount: 300, // Remaining is 200 (1000 - 800); 300 should fail
        method: 'CASH',
      })

    expect(res.status).toBe(409)
    expect(res.body.message).toContain('المبلغ المدفوع أكبر من المبلغ المستحق')
  })

  // 14. Duplicate open check-in is rejected
  it('14. should reject duplicate open check-in for member already inside gym with 409', async () => {
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      const mockTx = {
        member: {
          findFirst: vi.fn().mockResolvedValue({ id: 'mem-1', gymId: gymAId, isActive: true }),
        },
        attendance: {
          findFirst: vi.fn().mockResolvedValue({ id: 'open-att-1', checkOutAt: null }),
        },
      }
      return callback(mockTx)
    })

    const res = await request(app)
      .post('/api/v1/attendance/check-in')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])
      .send({ memberId: 'mem-1' })

    expect(res.status).toBe(409)
    expect(res.body.message).toContain('العضو مسجل حضور بالفعل')
  })

  // 15. Frozen subscription cannot check in
  it('15. should prevent frozen subscription from checking in with 409', async () => {
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      const mockTx = {
        member: {
          findFirst: vi.fn().mockResolvedValue({ id: 'mem-1', gymId: gymAId, isActive: true }),
        },
        attendance: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        subscription: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'sub-frozen',
              gymId: gymAId,
              memberId: 'mem-1',
              status: SubscriptionStatus.FROZEN,
              startDate: new Date('2026-01-01'),
              endDate: new Date('2026-12-31'),
            },
          ]),
        },
      }
      return callback(mockTx)
    })

    const res = await request(app)
      .post('/api/v1/attendance/check-in')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])
      .send({ memberId: 'mem-1' })

    expect(res.status).toBe(409)
    expect(res.body.message).toContain('مجمد')
  })

  // 16. Expired subscription cannot check in
  it('16. should prevent expired subscription from checking in with 409', async () => {
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      const mockTx = {
        member: {
          findFirst: vi.fn().mockResolvedValue({ id: 'mem-1', gymId: gymAId, isActive: true }),
        },
        attendance: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        subscription: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'sub-expired',
              gymId: gymAId,
              memberId: 'mem-1',
              status: SubscriptionStatus.EXPIRED,
              startDate: new Date('2025-01-01'),
              endDate: new Date('2025-02-01'),
            },
          ]),
        },
      }
      return callback(mockTx)
    })

    const res = await request(app)
      .post('/api/v1/attendance/check-in')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])
      .send({ memberId: 'mem-1' })

    expect(res.status).toBe(409)
    expect(res.body.message).toContain('منتهي')
  })

  // 17. Cancelled subscription cannot be renewed directly
  it('17. should reject renewing a cancelled subscription with 409 or 400', async () => {
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      const mockTx = {
        subscription: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'sub-cancelled',
            gymId: gymAId,
            status: SubscriptionStatus.CANCELLED,
            member: { id: 'mem-1', isActive: true },
          }),
        },
      }
      return callback(mockTx)
    })

    const res = await request(app)
      .post('/api/v1/subscriptions/sub-cancelled/renew')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])
      .send({ planId: 'plan-1' })

    expect([400, 409]).toContain(res.status)
    expect(res.body.success).toBe(false)
  })

  // 18. Formula injection prevention
  it('18. should sanitize dangerous formula characters with leading quote', () => {
    expect(sanitizeFormulaInjection('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
    expect(sanitizeFormulaInjection('+cmd|/c calc')).toBe("'+cmd|/c calc")
    expect(sanitizeFormulaInjection('-10')).toBe("'-10")
    expect(sanitizeFormulaInjection('@dangerous')).toBe("'@dangerous")
    expect(sanitizeFormulaInjection('Normal Text')).toBe('Normal Text')
  })

  // 19. Public health check does not expose credentials
  it('19. should return safe health check without leaking DATABASE_URL or secrets', async () => {
    const res = await request(app).get('/api/v1/health')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.text).not.toContain('mysql://')
    expect(res.text).not.toContain(env.JWT_SECRET)
  })

  // 20. Public database health check works safely
  it('20. should check database connectivity safely without exposing credentials', async () => {
    vi.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([{ 1: 1 }])

    const res = await request(app).get('/api/v1/health/database')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.text).not.toContain('password')
    expect(res.text).not.toContain('root')
  })

  // 21. Notification access is isolated by recipient and gym
  it('21. should prevent user from marking another user\'s notification as read with 403 or 404', async () => {
    vi.spyOn(prisma.notification, 'findUnique').mockResolvedValueOnce({
      id: 'notif-other',
      gymId: gymAId,
      recipientUserId: 'someone-else-id',
      isRead: false,
    } as any)

    const res = await request(app)
      .patch('/api/v1/notifications/notif-other/read')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  // 22. Inactive account login attempt returns 403
  it('22. should reject login for deactivated user with 403', async () => {
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValueOnce({
      id: 'deactivated-user',
      gymId: gymAId,
      name: 'معطل',
      email: 'deactivated@gymvip.eg',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuu',
      isActive: false,
      gym: { id: gymAId, isActive: true },
    } as any)

    const bcrypt = await import('bcrypt')
    vi.spyOn(bcrypt.default, 'compare').mockResolvedValueOnce(true as never)

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'deactivated@gymvip.eg',
        password: 'Password123',
      })

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  // 23. Inactive gym login attempt returns 403
  it('23. should reject login for active user in deactivated gym with 403', async () => {
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValueOnce({
      id: 'active-user',
      gymId: gymAId,
      name: 'نشط',
      email: 'active@gymvip.eg',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuu',
      isActive: true,
      gym: { id: gymAId, isActive: false }, // Inactive Gym
    } as any)

    const bcrypt = await import('bcrypt')
    vi.spyOn(bcrypt.default, 'compare').mockResolvedValueOnce(true as never)

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'active@gymvip.eg',
        password: 'Password123',
      })

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  // 24. Audit records remain protected against mutation
  it('24. should not expose any PUT/DELETE routes on /activity-logs', async () => {
    const res = await request(app)
      .delete('/api/v1/activity-logs/log-1')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])

    expect(res.status).toBe(404)
  })

  // 25. Checkout requires an existing open attendance record
  it('25. should verify that checkout requires an existing open attendance record', async () => {
    vi.spyOn(prisma.attendance, 'findFirst').mockResolvedValueOnce(null)

    const res = await request(app)
      .post('/api/v1/attendance/non-existent-attendance-id/check-out')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerAToken}`])

    expect(res.status).toBe(404)
    expect(res.body.message).toContain('سجل الحضور غير موجود')
  })
})
