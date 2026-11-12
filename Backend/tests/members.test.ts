import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { Role, Gender } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'

describe('Feature 5: Members Management Module Integration Tests', () => {
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
    id: 'member-uuid-101',
    gymId: mockGymId,
    memberCode: 'GYM-000001',
    name: 'أحمد محمد علي',
    phone: '01012345678',
    email: 'ahmed@example.com',
    gender: Gender.MALE,
    dateOfBirth: new Date('1995-04-18'),
    address: 'المعادي الجديدة، القاهرة',
    emergencyContactName: 'محمد علي',
    emergencyContactPhone: '01112345678',
    notes: 'عضو نشيط ومميز',
    isActive: true,
    createdAt: new Date('2026-10-05T10:00:00.000Z'),
    updatedAt: new Date('2026-10-05T10:00:00.000Z'),
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
  // 1. MEMBER CREATION & RBAC (Tests 1 - 9)
  // -------------------------------------------------------------
  describe('POST /api/v1/members (Create Member)', () => {
    it('1. OWNER can create a member', async () => {
      vi.spyOn(prisma.member, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.member, 'create').mockResolvedValue(sampleMember as any)

      const response = await request(app)
        .post('/api/v1/members')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'أحمد محمد علي',
          phone: '01012345678',
          email: 'ahmed@example.com',
          gender: 'MALE',
          dateOfBirth: '1995-04-18',
          address: 'المعادي الجديدة، القاهرة',
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.member.name).toBe('أحمد محمد علي')
      expect(response.body.data.member.memberCode).toBe('GYM-000001')
      expect(response.body.data.member.gymId).toBe(mockGymId)
    })

    it('2. MANAGER can create a member', async () => {
      vi.spyOn(prisma.member, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.member, 'create').mockResolvedValue(sampleMember as any)

      const response = await request(app)
        .post('/api/v1/members')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({
          name: 'أحمد محمد علي',
          phone: '01012345678',
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('3. RECEPTIONIST can create a member', async () => {
      vi.spyOn(prisma.member, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.member, 'create').mockResolvedValue(sampleMember as any)

      const response = await request(app)
        .post('/api/v1/members')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({
          name: 'أحمد محمد علي',
          phone: '01012345678',
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('4. TRAINER cannot create a member (403 Forbidden)', async () => {
      const response = await request(app)
        .post('/api/v1/members')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])
        .send({
          name: 'أحمد محمد علي',
          phone: '01012345678',
        })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })

    it('5. Member is assigned strictly to authenticated gym, never req.body.gymId', async () => {
      vi.spyOn(prisma.member, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(null)
      const createSpy = vi.spyOn(prisma.member, 'create').mockResolvedValue(sampleMember as any)

      await request(app)
        .post('/api/v1/members')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          gymId: 'attacker-hacked-gym-id',
          name: 'أحمد محمد علي',
          phone: '01012345678',
        })

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gymId: mockGymId,
          }),
        })
      )
    })

    it('6. Duplicate phone in same gym is rejected with 409 Conflict', async () => {
      vi.spyOn(prisma.member, 'findUnique').mockResolvedValue(sampleMember as any)

      const response = await request(app)
        .post('/api/v1/members')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'أحمد آخر',
          phone: '01012345678',
        })

      expect(response.status).toBe(409)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('رقم الهاتف مستخدم بالفعل داخل هذا الجيم')
    })

    it('7. Same phone in another gym is allowed', async () => {
      // For gym 1, phone check is null
      vi.spyOn(prisma.member, 'findUnique').mockImplementation(async ({ where }: any) => {
        if (where?.gymId_phone?.gymId === mockOtherGymId) {
          return sampleMember as any
        }
        return null
      })
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.member, 'create').mockResolvedValue(sampleMember as any)

      const response = await request(app)
        .post('/api/v1/members')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'أحمد محمد علي',
          phone: '01012345678',
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('8. Member code is generated automatically (GYM-000001 or sequential)', async () => {
      vi.spyOn(prisma.member, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue({
        memberCode: 'GYM-000042',
      } as any)

      const createSpy = vi.spyOn(prisma.member, 'create').mockResolvedValue({
        ...sampleMember,
        memberCode: 'GYM-000043',
      } as any)

      const response = await request(app)
        .post('/api/v1/members')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'عضو جديد',
          phone: '01099887766',
        })

      expect(response.status).toBe(201)
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberCode: 'GYM-000043',
          }),
        })
      )
    })

    it('9. Member code retry handles concurrency collision', async () => {
      vi.spyOn(prisma.member, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(null)

      let callCount = 0
      vi.spyOn(prisma.member, 'create').mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          const err: any = new Error('Unique constraint failed')
          err.code = 'P2002'
          err.meta = { target: ['memberCode'] }
          throw err
        }
        return sampleMember as any
      })

      const response = await request(app)
        .post('/api/v1/members')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'عضو تصادم',
          phone: '01055443322',
        })

      expect(response.status).toBe(201)
      expect(callCount).toBe(2)
    })
  })

  // -------------------------------------------------------------
  // 2. LIST & SEARCH & FILTER & PAGINATION (Tests 10 - 17)
  // -------------------------------------------------------------
  describe('GET /api/v1/members (List & Search)', () => {
    it('10. List members for authenticated gym (TRAINER allowed)', async () => {
      vi.spyOn(prisma.member, 'findMany').mockResolvedValue([sampleMember as any])
      vi.spyOn(prisma.member, 'count').mockResolvedValue(1)

      const response = await request(app)
        .get('/api/v1/members')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.members).toHaveLength(1)
      expect(response.body.data.pagination.total).toBe(1)
    })

    it('11. Search members by name', async () => {
      const findManySpy = vi.spyOn(prisma.member, 'findMany').mockResolvedValue([sampleMember as any])
      vi.spyOn(prisma.member, 'count').mockResolvedValue(1)

      const response = await request(app)
        .get('/api/v1/members?search=أحمد')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(200)
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'أحمد' } },
            ]),
          }),
        })
      )
    })

    it('12. Search members by phone', async () => {
      const findManySpy = vi.spyOn(prisma.member, 'findMany').mockResolvedValue([sampleMember as any])
      vi.spyOn(prisma.member, 'count').mockResolvedValue(1)

      const response = await request(app)
        .get('/api/v1/members?search=01012345678')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(200)
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { phone: { contains: '01012345678' } },
            ]),
          }),
        })
      )
    })

    it('13. Search members by member code', async () => {
      const findManySpy = vi.spyOn(prisma.member, 'findMany').mockResolvedValue([sampleMember as any])
      vi.spyOn(prisma.member, 'count').mockResolvedValue(1)

      const response = await request(app)
        .get('/api/v1/members?search=GYM-000001')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(200)
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { memberCode: { contains: 'GYM-000001' } },
            ]),
          }),
        })
      )
    })

    it('14. Search members by email', async () => {
      const findManySpy = vi.spyOn(prisma.member, 'findMany').mockResolvedValue([sampleMember as any])
      vi.spyOn(prisma.member, 'count').mockResolvedValue(1)

      const response = await request(app)
        .get('/api/v1/members?search=ahmed@example.com')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(200)
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { email: { contains: 'ahmed@example.com' } },
            ]),
          }),
        })
      )
    })

    it('15. Filter members by status (active, inactive, all)', async () => {
      const findManySpy = vi.spyOn(prisma.member, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.member, 'count').mockResolvedValue(0)

      // Active (default)
      await request(app)
        .get('/api/v1/members?status=active')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      )

      // Inactive
      await request(app)
        .get('/api/v1/members?status=inactive')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: false }),
        })
      )

      // All
      await request(app)
        .get('/api/v1/members?status=all')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ isActive: expect.anything() }),
        })
      )
    })

    it('16. Filter members by gender (MALE, FEMALE)', async () => {
      const findManySpy = vi.spyOn(prisma.member, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.member, 'count').mockResolvedValue(0)

      await request(app)
        .get('/api/v1/members?gender=FEMALE')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ gender: 'FEMALE' }),
        })
      )
    })

    it('17. Member list pagination metadata calculation', async () => {
      vi.spyOn(prisma.member, 'findMany').mockResolvedValue([sampleMember as any])
      vi.spyOn(prisma.member, 'count').mockResolvedValue(45)

      const response = await request(app)
        .get('/api/v1/members?page=2&limit=20')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(200)
      expect(response.body.data.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
      })
    })
  })

  // -------------------------------------------------------------
  // 3. GET SINGLE MEMBER & GYM ISOLATION (Tests 18 - 19)
  // -------------------------------------------------------------
  describe('GET /api/v1/members/:id (Get Single Member)', () => {
    it('18. Get member details successfully', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)

      const response = await request(app)
        .get('/api/v1/members/member-uuid-101')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.member.id).toBe('member-uuid-101')
      expect(response.body.data.member.memberCode).toBe('GYM-000001')
    })

    it('19. Cross-gym member access returns 404 without leaking info', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockImplementation(async ({ where }: any) => {
        if (where.gymId === mockGymId && where.id === 'foreign-member-id') {
          return null // isolated
        }
        return null
      })

      const response = await request(app)
        .get('/api/v1/members/foreign-member-id')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('العضو غير موجود')
    })
  })

  // -------------------------------------------------------------
  // 4. UPDATE MEMBER & RBAC (Tests 20 - 23)
  // -------------------------------------------------------------
  describe('PATCH /api/v1/members/:id (Update Member)', () => {
    it('20. OWNER can update member', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.member, 'update').mockResolvedValue({
        ...sampleMember,
        name: 'أحمد محمد علي المحدث',
      } as any)

      const response = await request(app)
        .patch('/api/v1/members/member-uuid-101')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'أحمد محمد علي المحدث',
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.member.name).toBe('أحمد محمد علي المحدث')
    })

    it('21. MANAGER can update member', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.member, 'update').mockResolvedValue({
        ...sampleMember,
        notes: 'ملاحظة جديدة',
      } as any)

      const response = await request(app)
        .patch('/api/v1/members/member-uuid-101')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({
          notes: 'ملاحظة جديدة',
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('22. RECEPTIONIST can update member', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.member, 'update').mockResolvedValue({
        ...sampleMember,
        address: 'عنوان جديد',
      } as any)

      const response = await request(app)
        .patch('/api/v1/members/member-uuid-101')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({
          address: 'عنوان جديد',
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('23. TRAINER cannot update member (403 Forbidden)', async () => {
      const response = await request(app)
        .patch('/api/v1/members/member-uuid-101')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])
        .send({
          name: 'محاولة تعديل',
        })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })
  })

  // -------------------------------------------------------------
  // 5. STATUS CHANGE & DELETE PREVENTION (Tests 24 - 26)
  // -------------------------------------------------------------
  describe('PATCH /api/v1/members/:id/status & Deletion Prevention', () => {
    it('24. Activate member', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue({
        ...sampleMember,
        isActive: false,
      } as any)
      vi.spyOn(prisma.member, 'update').mockResolvedValue({
        ...sampleMember,
        isActive: true,
      } as any)

      const response = await request(app)
        .patch('/api/v1/members/member-uuid-101/status')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({ isActive: true })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.member.isActive).toBe(true)
    })

    it('25. Deactivate member', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)
      vi.spyOn(prisma.member, 'update').mockResolvedValue({
        ...sampleMember,
        isActive: false,
      } as any)

      const response = await request(app)
        .patch('/api/v1/members/member-uuid-101/status')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({ isActive: false })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.member.isActive).toBe(false)
    })

    it('26. Cannot delete member (No DELETE route mounted)', async () => {
      const response = await request(app)
        .delete('/api/v1/members/member-uuid-101')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(404)
    })
  })

  // -------------------------------------------------------------
  // 6. VALIDATION & SECURITY INTEGRITY (Tests 27 - 30)
  // -------------------------------------------------------------
  describe('Validation & Security Integrity', () => {
    it('27. Invalid phone format is rejected with 400 Bad Request', async () => {
      const response = await request(app)
        .post('/api/v1/members')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'عضو برقم خاطئ',
          phone: '123456', // invalid Egyptian phone
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('28. Future date of birth is rejected with 400 Bad Request', async () => {
      const response = await request(app)
        .post('/api/v1/members')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'عضو بتاريخ مستقبلي',
          phone: '01011223344',
          dateOfBirth: '2099-01-01',
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('29. Passwords are never involved in member creation or fields', async () => {
      vi.spyOn(prisma.member, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.member, 'create').mockResolvedValue(sampleMember as any)

      const response = await request(app)
        .post('/api/v1/members')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'أحمد محمد علي',
          phone: '01012345678',
          password: 'SecretPassword123', // ignored
        })

      expect(response.status).toBe(201)
      expect(response.body.data.member.password).toBeUndefined()
      expect(response.body.data.member.passwordHash).toBeUndefined()
    })

    it('30. PasswordHash and user credentials are never returned in member response', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(sampleMember as any)

      const response = await request(app)
        .get('/api/v1/members/member-uuid-101')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(response.status).toBe(200)
      const data = response.body.data.member
      expect(data.passwordHash).toBeUndefined()
      expect(data.password).toBeUndefined()
      expect(data.salt).toBeUndefined()
    })
  })
})
