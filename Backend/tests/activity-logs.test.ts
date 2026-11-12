import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { Role } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'
import { sanitizeAuditData } from '../src/utils/sanitize.util.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../src/types/audit.types.js'

describe('Feature 14: Activity Log & Audit Trail Integration Tests', () => {
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

  const mockLogs = [
    {
      id: 'log-1',
      gymId: mockGymId,
      actorUserId: mockOwnerId,
      action: AUDIT_ACTIONS.MEMBER_CREATED,
      entityType: AUDIT_ENTITY_TYPES.MEMBER,
      entityId: 'member-1',
      description: 'تم تسجيل عضو جديد (محمد علي) بكود (GYM-000001)',
      metadata: null,
      beforeData: null,
      afterData: { id: 'member-1', name: 'محمد علي' },
      createdAt: new Date('2026-10-10T12:00:00.000Z'),
      actorUser: {
        id: mockOwnerId,
        name: 'أحمد محمود',
        role: Role.OWNER,
      },
    },
    {
      id: 'log-2',
      gymId: mockGymId,
      actorUserId: mockManagerId,
      action: AUDIT_ACTIONS.PAYMENT_RECEIVED,
      entityType: AUDIT_ENTITY_TYPES.PAYMENT,
      entityId: 'pay-1',
      description: 'تم تسجيل دفعة مالية بقيمة (500 EGP) للعضو (محمد علي)',
      metadata: { method: 'CASH' },
      beforeData: null,
      afterData: { amount: '500.00' },
      createdAt: new Date('2026-10-10T14:00:00.000Z'),
      actorUser: {
        id: mockManagerId,
        name: 'مدير النادي',
        role: Role.MANAGER,
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    prisma.gym.findUnique = vi.fn().mockResolvedValue({
      id: mockGymId,
      isActive: true,
    })
    prisma.user.findUnique = vi.fn().mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === mockManagerId) {
        return Promise.resolve({
          id: mockManagerId,
          gymId: mockGymId,
          name: 'مدير النادي',
          role: Role.MANAGER,
          isActive: true,
          gym: { id: mockGymId, isActive: true },
        })
      }
      if (where.id === mockReceptionistId) {
        return Promise.resolve({
          id: mockReceptionistId,
          gymId: mockGymId,
          name: 'موظف الاستقبال',
          role: Role.RECEPTIONIST,
          isActive: true,
          gym: { id: mockGymId, isActive: true },
        })
      }
      if (where.id === mockTrainerId) {
        return Promise.resolve({
          id: mockTrainerId,
          gymId: mockGymId,
          name: 'المدرب',
          role: Role.TRAINER,
          isActive: true,
          gym: { id: mockGymId, isActive: true },
        })
      }
      if (where.id === 'other-owner-uuid') {
        return Promise.resolve({
          id: 'other-owner-uuid',
          gymId: mockOtherGymId,
          name: 'مالك آخر',
          role: Role.OWNER,
          isActive: true,
          gym: { id: mockOtherGymId, isActive: true },
        })
      }
      return Promise.resolve({
        id: mockOwnerId,
        gymId: mockGymId,
        name: 'أحمد محمود',
        role: Role.OWNER,
        isActive: true,
        gym: { id: mockGymId, isActive: true },
      })
    })
  })

  // =========================================================================
  // 1. RBAC & Access Control
  // =========================================================================
  describe('RBAC & Access Control', () => {
    it('1. OWNER can access activity logs (200 OK)', async () => {
      prisma.auditLog.count = vi.fn().mockResolvedValue(2)
      prisma.auditLog.findMany = vi.fn().mockResolvedValue(mockLogs)

      const res = await request(app)
        .get('/api/v1/activity-logs')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.meta.total).toBe(2)
    })

    it('2. MANAGER can access activity logs (200 OK)', async () => {
      prisma.auditLog.count = vi.fn().mockResolvedValue(2)
      prisma.auditLog.findMany = vi.fn().mockResolvedValue(mockLogs)

      const res = await request(app)
        .get('/api/v1/activity-logs')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('3. RECEPTIONIST is forbidden from accessing activity logs (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/activity-logs')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it('4. TRAINER is forbidden from accessing activity logs (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/activity-logs')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it('5. Unauthenticated request is rejected (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/v1/activity-logs')

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })
  })

  // =========================================================================
  // 2. Multi-tenant Gym Isolation
  // =========================================================================
  describe('Multi-tenant Gym Isolation', () => {
    it('6. Queries are strictly scoped to authenticated gymId', async () => {
      prisma.auditLog.count = vi.fn().mockResolvedValue(0)
      prisma.auditLog.findMany = vi.fn().mockResolvedValue([])

      await request(app)
        .get('/api/v1/activity-logs')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(prisma.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ gymId: mockGymId }),
        })
      )
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ gymId: mockGymId }),
        })
      )
    })

    it('7. Cannot view activity log belonging to another gym (404 Not Found)', async () => {
      prisma.auditLog.findFirst = vi.fn().mockResolvedValue(null) // Gym mismatch returns null

      const res = await request(app)
        .get('/api/v1/activity-logs/log-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${otherGymOwnerToken}`])

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  // =========================================================================
  // 3. Immutability & Append-Only Enforcement
  // =========================================================================
  describe('Immutability & Append-Only Enforcement', () => {
    it('8. POST /api/v1/activity-logs does not exist (404 Not Found)', async () => {
      const res = await request(app)
        .post('/api/v1/activity-logs')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ action: 'FAKE' })

      expect(res.status).toBe(404)
    })

    it('9. PATCH /api/v1/activity-logs/:id does not exist (404 Not Found)', async () => {
      const res = await request(app)
        .patch('/api/v1/activity-logs/log-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ description: 'Hacked' })

      expect(res.status).toBe(404)
    })

    it('10. PUT /api/v1/activity-logs/:id does not exist (404 Not Found)', async () => {
      const res = await request(app)
        .put('/api/v1/activity-logs/log-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ description: 'Hacked' })

      expect(res.status).toBe(404)
    })

    it('11. DELETE /api/v1/activity-logs/:id does not exist (404 Not Found)', async () => {
      const res = await request(app)
        .delete('/api/v1/activity-logs/log-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(404)
    })
  })

  // =========================================================================
  // 4. Filtering & Pagination
  // =========================================================================
  describe('Filtering & Pagination', () => {
    it('12. Supports filtering by action, entityType, and actorUserId', async () => {
      prisma.auditLog.count = vi.fn().mockResolvedValue(1)
      prisma.auditLog.findMany = vi.fn().mockResolvedValue([mockLogs[0]])

      const res = await request(app)
        .get(
          `/api/v1/activity-logs?action=${AUDIT_ACTIONS.MEMBER_CREATED}&entityType=MEMBER&actorUserId=${mockOwnerId}`
        )
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gymId: mockGymId,
            action: AUDIT_ACTIONS.MEMBER_CREATED,
            entityType: 'MEMBER',
            actorUserId: mockOwnerId,
          }),
        })
      )
    })

    it('13. Supports search by keyword in description', async () => {
      prisma.auditLog.count = vi.fn().mockResolvedValue(1)
      prisma.auditLog.findMany = vi.fn().mockResolvedValue([mockLogs[0]])

      const res = await request(app)
        .get('/api/v1/activity-logs?search=محمد')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gymId: mockGymId,
            description: { contains: 'محمد' },
          }),
        })
      )
    })

    it('14. Supports date range filtering', async () => {
      prisma.auditLog.count = vi.fn().mockResolvedValue(1)
      prisma.auditLog.findMany = vi.fn().mockResolvedValue([mockLogs[0]])

      const res = await request(app)
        .get('/api/v1/activity-logs?fromDate=2026-10-01&toDate=2026-10-15')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gymId: mockGymId,
            createdAt: expect.objectContaining({
              gte: new Date('2026-10-01T00:00:00.000Z'),
              lte: new Date('2026-10-15T23:59:59.999Z'),
            }),
          }),
        })
      )
    })

    it('15. Rejects invalid date format (400 Bad Request)', async () => {
      const res = await request(app)
        .get('/api/v1/activity-logs?fromDate=invalid-date')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('16. Validates pagination bounds (page 1, limit 20 by default)', async () => {
      prisma.auditLog.count = vi.fn().mockResolvedValue(45)
      prisma.auditLog.findMany = vi.fn().mockResolvedValue(mockLogs)

      const res = await request(app)
        .get('/api/v1/activity-logs?page=2&limit=10')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.meta.page).toBe(2)
      expect(res.body.meta.limit).toBe(10)
      expect(res.body.meta.total).toBe(45)
      expect(res.body.meta.totalPages).toBe(5)
    })
  })

  // =========================================================================
  // 5. Sanitization & Single Log Details
  // =========================================================================
  describe('Sanitization & Details View', () => {
    it('17. Sanitizes passwords, password hashes, and tokens from audit objects', () => {
      const rawData = {
        name: 'كابتن رامي',
        email: 'ramy@gymvip.com',
        password: 'PlainSecretPassword123!',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
        token: 'eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        nested: {
          refreshToken: 'refresh-secret-token',
          safeField: 'قيمة آمنة',
        },
      }

      const sanitized = sanitizeAuditData(rawData)

      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.passwordHash).toBe('[REDACTED]')
      expect(sanitized.token).toBe('[REDACTED]')
      expect(sanitized.nested.refreshToken).toBe('[REDACTED]')
      expect(sanitized.nested.safeField).toBe('قيمة آمنة')
      expect(sanitized.name).toBe('كابتن رامي')
    })

    it('18. GET /api/v1/activity-logs/:id returns single audit log detail', async () => {
      prisma.auditLog.findFirst = vi.fn().mockResolvedValue(mockLogs[0])

      const res = await request(app)
        .get('/api/v1/activity-logs/log-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.auditLog.id).toBe('log-1')
      expect(res.body.data.auditLog.actorUser.name).toBe('أحمد محمود')
      expect(res.body.data.auditLog.action).toBe(AUDIT_ACTIONS.MEMBER_CREATED)
    })
  })
})
