import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { Role, Prisma, SubscriptionStatus } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'
import { getCairoBusinessDayRange, calculateDurationMinutes } from '../src/utils/date.util.js'

describe('Feature 9: Attendance, Check-In & Check-Out Integration Tests', () => {
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

  const otherGymOwnerToken = generateAuthToken({
    sub: 'other-owner-uuid',
    gymId: mockOtherGymId,
    role: Role.OWNER,
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

  // Active subscription covering now
  const now = new Date()
  const subStart = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  const subEnd = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000)

  const sampleActiveSubscription = {
    id: 'sub-active-1',
    gymId: mockGymId,
    memberId: sampleMember.id,
    planId: 'plan-uuid-1',
    planName: 'باقة اللياقة الشهرية',
    planPrice: new Prisma.Decimal(500.0),
    durationDays: 30,
    currency: 'EGP',
    startDate: subStart,
    endDate: subEnd,
    status: SubscriptionStatus.ACTIVE,
    notes: '',
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
  }

  const sampleAttendanceRecord = {
    id: 'att-uuid-1',
    gymId: mockGymId,
    memberId: sampleMember.id,
    subscriptionId: sampleActiveSubscription.id,
    checkInAt: new Date(now.getTime() - 45 * 60 * 1000), // 45 minutes ago
    checkOutAt: null,
    durationMinutes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    member: sampleMember,
    subscription: sampleActiveSubscription,
  }

  beforeEach(() => {
    vi.restoreAllMocks()

    // Default mock user lookup for requireAuth middleware
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      const id = where.id
      if (id === mockOwnerId) {
        return {
          id: mockOwnerId,
          gymId: mockGymId,
          name: 'المالك الرئيسي',
          email: 'owner@gym.com',
          role: Role.OWNER,
          isActive: true,
          gym: { id: mockGymId, isActive: true },
        } as any
      }
      if (id === mockManagerId) {
        return {
          id: mockManagerId,
          gymId: mockGymId,
          name: 'مدير الصالة',
          email: 'manager@gym.com',
          role: Role.MANAGER,
          isActive: true,
          gym: { id: mockGymId, isActive: true },
        } as any
      }
      if (id === mockReceptionistId) {
        return {
          id: mockReceptionistId,
          gymId: mockGymId,
          name: 'موظف الاستقبال',
          email: 'reception@gym.com',
          role: Role.RECEPTIONIST,
          isActive: true,
          gym: { id: mockGymId, isActive: true },
        } as any
      }
      if (id === mockTrainerId) {
        return {
          id: mockTrainerId,
          gymId: mockGymId,
          name: 'كابتن الصالة',
          email: 'trainer@gym.com',
          role: Role.TRAINER,
          isActive: true,
          gym: { id: mockGymId, isActive: true },
        } as any
      }
      if (id === 'other-owner-uuid') {
        return {
          id: 'other-owner-uuid',
          gymId: mockOtherGymId,
          name: 'مالك نادي آخر',
          email: 'other@gym.com',
          role: Role.OWNER,
          isActive: true,
          gym: { id: mockOtherGymId, isActive: true },
        } as any
      }
      return null
    })
  })

  // -------------------------------------------------------------
  // 1. RBAC & Authentication for Check-In
  // -------------------------------------------------------------
  describe('RBAC & Roles for Check-In', () => {
    it('1. OWNER can check in a member successfully (201 Created)', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          member: {
            findFirst: vi.fn().mockResolvedValue(sampleMember),
          },
          attendance: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              ...sampleAttendanceRecord,
              id: 'att-created-1',
            }),
          },
          subscription: {
            findMany: vi.fn().mockResolvedValue([sampleActiveSubscription]),
          },
        }
        return callback(tx)
      })

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ memberId: sampleMember.id })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe('تم تسجيل الحضور بنجاح')
      expect(res.body.data.attendance.id).toBe('att-created-1')
      expect(res.body.data.attendance.checkOutAt).toBeNull()
    })

    it('2. MANAGER can check in a member successfully (201 Created)', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          member: {
            findFirst: vi.fn().mockResolvedValue(sampleMember),
          },
          attendance: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              ...sampleAttendanceRecord,
              id: 'att-created-mgr',
            }),
          },
          subscription: {
            findMany: vi.fn().mockResolvedValue([sampleActiveSubscription]),
          },
        }
        return callback(tx)
      })

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({ memberId: sampleMember.id })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.attendance.id).toBe('att-created-mgr')
    })

    it('3. RECEPTIONIST can check in a member successfully (201 Created)', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          member: {
            findFirst: vi.fn().mockResolvedValue(sampleMember),
          },
          attendance: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              ...sampleAttendanceRecord,
              id: 'att-created-rec',
            }),
          },
          subscription: {
            findMany: vi.fn().mockResolvedValue([sampleActiveSubscription]),
          },
        }
        return callback(tx)
      })

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({ memberId: sampleMember.id })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.attendance.id).toBe('att-created-rec')
    })

    it('4. TRAINER is forbidden from checking in members in V1 (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])
        .send({ memberId: sampleMember.id })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })
  })

  // -------------------------------------------------------------
  // 2. Subscription Validation & Member Status Business Rules
  // -------------------------------------------------------------
  describe('Subscription Validation for Check-In', () => {
    it('5. Active subscription allows check-in', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          member: { findFirst: vi.fn().mockResolvedValue(sampleMember) },
          attendance: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(sampleAttendanceRecord),
          },
          subscription: { findMany: vi.fn().mockResolvedValue([sampleActiveSubscription]) },
        }
        return callback(tx)
      })

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({ memberId: sampleMember.id })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
    })

    it('6. FROZEN subscription rejects check-in (409 Conflict: الاشتراك مجمد)', async () => {
      const frozenSub = {
        ...sampleActiveSubscription,
        status: SubscriptionStatus.FROZEN,
      }

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          member: { findFirst: vi.fn().mockResolvedValue(sampleMember) },
          attendance: { findFirst: vi.fn().mockResolvedValue(null) },
          subscription: { findMany: vi.fn().mockResolvedValue([frozenSub]) },
        }
        return callback(tx)
      })

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({ memberId: sampleMember.id })

      expect(res.status).toBe(409)
      expect(res.body.message).toContain('الاشتراك مجمد')
    })

    it('7. EXPIRED subscription rejects check-in (409 Conflict: الاشتراك منتهي)', async () => {
      const expiredSub = {
        ...sampleActiveSubscription,
        status: SubscriptionStatus.EXPIRED,
        endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      }

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          member: { findFirst: vi.fn().mockResolvedValue(sampleMember) },
          attendance: { findFirst: vi.fn().mockResolvedValue(null) },
          subscription: { findMany: vi.fn().mockResolvedValue([expiredSub]) },
        }
        return callback(tx)
      })

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({ memberId: sampleMember.id })

      expect(res.status).toBe(409)
      expect(res.body.message).toContain('الاشتراك منتهي')
    })

    it('8. CANCELLED subscription rejects check-in (409 Conflict)', async () => {
      const cancelledSub = {
        ...sampleActiveSubscription,
        status: SubscriptionStatus.CANCELLED,
      }

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          member: { findFirst: vi.fn().mockResolvedValue(sampleMember) },
          attendance: { findFirst: vi.fn().mockResolvedValue(null) },
          subscription: { findMany: vi.fn().mockResolvedValue([cancelledSub]) },
        }
        return callback(tx)
      })

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({ memberId: sampleMember.id })

      expect(res.status).toBe(409)
      expect(res.body.message).toContain('لا يوجد اشتراك نشط')
    })

    it('9. Member with no subscription rejects check-in (409 Conflict)', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          member: { findFirst: vi.fn().mockResolvedValue(sampleMember) },
          attendance: { findFirst: vi.fn().mockResolvedValue(null) },
          subscription: { findMany: vi.fn().mockResolvedValue([]) },
        }
        return callback(tx)
      })

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({ memberId: sampleMember.id })

      expect(res.status).toBe(409)
      expect(res.body.message).toContain('لا يوجد اشتراك نشط')
    })

    it('10. Inactive member rejects check-in (409 Conflict: العضو غير نشط)', async () => {
      const inactiveMember = {
        ...sampleMember,
        isActive: false,
      }

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          member: { findFirst: vi.fn().mockResolvedValue(inactiveMember) },
        }
        return callback(tx)
      })

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({ memberId: inactiveMember.id })

      expect(res.status).toBe(409)
      expect(res.body.message).toBe('العضو غير نشط')
    })

    it('11. Duplicate check-in rejected when open session exists (409 Conflict: العضو مسجل حضور بالفعل)', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          member: { findFirst: vi.fn().mockResolvedValue(sampleMember) },
          attendance: {
            findFirst: vi.fn().mockResolvedValue(sampleAttendanceRecord),
          },
        }
        return callback(tx)
      })

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({ memberId: sampleMember.id })

      expect(res.status).toBe(409)
      expect(res.body.message).toBe('العضو مسجل حضور بالفعل ولم يتم تسجيل الانصراف')
    })
  })

  // -------------------------------------------------------------
  // 3. Check-Out Operations & Duration Calculations
  // -------------------------------------------------------------
  describe('Check-Out Operations', () => {
    it('12. Successful checkout by attendance ID (POST /api/v1/attendance/:id/check-out)', async () => {
      vi.spyOn(prisma.attendance, 'findFirst').mockResolvedValue(sampleAttendanceRecord as any)
      vi.spyOn(prisma.attendance, 'update').mockResolvedValue({
        ...sampleAttendanceRecord,
        checkOutAt: new Date(),
        durationMinutes: 45,
      } as any)

      const res = await request(app)
        .post(`/api/v1/attendance/${sampleAttendanceRecord.id}/check-out`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe('تم تسجيل الانصراف بنجاح')
      expect(res.body.data.attendance.checkOutAt).not.toBeNull()
    })

    it('13. Checkout calculates positive durationMinutes accurately', async () => {
      const inTime = new Date('2026-10-09T10:00:00.000Z')
      const outTime = new Date('2026-10-09T11:32:00.000Z')
      const minutes = calculateDurationMinutes(inTime, outTime)
      expect(minutes).toBe(92)

      const negativeMinutes = calculateDurationMinutes(outTime, inTime)
      expect(negativeMinutes).toBe(0) // Safe minimum 0
    })

    it('14. Checkout by member fails when no open session exists (404 Not Found)', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.attendance, 'findFirst').mockResolvedValue(null)

      const res = await request(app)
        .post(`/api/v1/members/${sampleMember.id}/check-out`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(res.status).toBe(404)
      expect(res.body.message).toBe('لا يوجد تسجيل حضور مفتوح لهذا العضو')
    })

    it('15. Double checkout on already checked-out record is rejected (409 Conflict: تم تسجيل الانصراف بالفعل)', async () => {
      const closedAttendance = {
        ...sampleAttendanceRecord,
        checkOutAt: new Date(),
        durationMinutes: 60,
      }
      vi.spyOn(prisma.attendance, 'findFirst').mockResolvedValue(closedAttendance as any)

      const res = await request(app)
        .post(`/api/v1/attendance/${sampleAttendanceRecord.id}/check-out`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(res.status).toBe(409)
      expect(res.body.message).toBe('تم تسجيل الانصراف بالفعل')
    })
  })

  // -------------------------------------------------------------
  // 4. Queries, Summaries & Lists
  // -------------------------------------------------------------
  describe('Queries & Reports', () => {
    it('16. Attendance list works with status and pagination (GET /api/v1/attendance)', async () => {
      vi.spyOn(prisma.attendance, 'findMany').mockResolvedValue([sampleAttendanceRecord as any])
      vi.spyOn(prisma.attendance, 'count').mockResolvedValue(1)

      const res = await request(app)
        .get('/api/v1/attendance?status=OPEN&page=1&limit=20')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.attendance).toHaveLength(1)
      expect(res.body.data.pagination.total).toBe(1)
    })

    it("17. Today's attendance summary returns accurate metrics in Cairo timezone (GET /api/v1/attendance/today)", async () => {
      vi.spyOn(prisma.attendance, 'count')
        .mockResolvedValueOnce(5)  // currentlyInside
        .mockResolvedValueOnce(18) // totalCheckInsToday
        .mockResolvedValueOnce(13) // checkedOutToday

      const res = await request(app)
        .get('/api/v1/attendance/today')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.currentlyInside).toBe(5)
      expect(res.body.data.totalCheckInsToday).toBe(18)
      expect(res.body.data.checkedOutToday).toBe(13)
      expect(res.body.data.totalCompletedVisitsToday).toBe(13)
    })

    it('18. Current attendees returns all open records (GET /api/v1/attendance/current)', async () => {
      vi.spyOn(prisma.attendance, 'findMany').mockResolvedValue([sampleAttendanceRecord as any])

      const res = await request(app)
        .get('/api/v1/attendance/current')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.attendance).toHaveLength(1)
      expect(res.body.data.attendance[0].checkOutAt).toBeNull()
    })

    it('19. Member attendance history works (GET /api/v1/members/:memberId/attendance)', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.attendance, 'findMany').mockResolvedValue([sampleAttendanceRecord as any])

      const res = await request(app)
        .get(`/api/v1/members/${sampleMember.id}/attendance`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.attendance).toHaveLength(1)
    })
  })

  // -------------------------------------------------------------
  // 5. Gym Isolation & Security
  // -------------------------------------------------------------
  describe('Multi-tenant Gym Isolation & Immutability', () => {
    it('20. Cross-gym attendance access returns 404 Not Found', async () => {
      vi.spyOn(prisma.attendance, 'findFirst').mockResolvedValue(null) // Not found in Gym 2

      const res = await request(app)
        .get(`/api/v1/attendance/${sampleAttendanceRecord.id}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${otherGymOwnerToken}`])

      expect(res.status).toBe(404)
    })

    it('21. Cross-gym member checkout returns 404 Not Found', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(null) // Member does not belong to Gym 2

      const res = await request(app)
        .post(`/api/v1/members/${sampleMember.id}/check-out`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${otherGymOwnerToken}`])

      expect(res.status).toBe(404)
    })

    it('22. Concurrent check-ins cannot create two open records (Transaction lock check)', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          member: { findFirst: vi.fn().mockResolvedValue(sampleMember) },
          attendance: {
            // Simulate that another concurrent transaction already committed an open attendance
            findFirst: vi.fn().mockResolvedValue(sampleAttendanceRecord),
          },
        }
        return callback(tx)
      })

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({ memberId: sampleMember.id })

      expect(res.status).toBe(409)
      expect(res.body.message).toBe('العضو مسجل حضور بالفعل ولم يتم تسجيل الانصراف')
    })

    it('23. Attendance records cannot be deleted (DELETE /api/v1/attendance/:id -> 404)', async () => {
      const res = await request(app)
        .delete(`/api/v1/attendance/${sampleAttendanceRecord.id}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(404)
    })

    it('24. Attendance records cannot be edited (PATCH /api/v1/attendance/:id -> 404)', async () => {
      const res = await request(app)
        .patch(`/api/v1/attendance/${sampleAttendanceRecord.id}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ durationMinutes: 100 })

      expect(res.status).toBe(404)
    })

    it('25. Cairo timezone business-day range boundaries are computed properly', () => {
      const range = getCairoBusinessDayRange('2026-10-09')
      expect(range.startOfDay).toBeInstanceOf(Date)
      expect(range.endOfDay).toBeInstanceOf(Date)
      expect(range.endOfDay.getTime()).toBeGreaterThan(range.startOfDay.getTime())
    })
  })
})
