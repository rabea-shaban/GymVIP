import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { Role } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'

describe('Feature 4: Users Management, Roles & Permissions Tests', () => {
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
    vi.restoreAllMocks()

    // Default mock user resolver for requireAuth
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      let role = Role.OWNER
      if (where.id === mockManagerId) role = Role.MANAGER
      if (where.id === mockReceptionistId) role = Role.RECEPTIONIST
      if (where.id === mockTrainerId) role = Role.TRAINER

      return {
        id: where.id,
        gymId: mockGymId,
        name: 'المستخدم المصرح',
        email: 'auth@gymvip.eg',
        role,
        isActive: true,
        gym: { id: mockGymId, isActive: true },
      } as any
    })
  })

  // -------------------------------------------------------------
  // 1. CREATE USER PERMISSIONS
  // -------------------------------------------------------------
  describe('POST /api/v1/users (Create User)', () => {
    it('1. OWNER can create a MANAGER', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.user, 'create').mockResolvedValue({
        id: 'new-user-1',
        gymId: mockGymId,
        name: 'كابتن محمود - مدير',
        email: 'mahmoud.manager@gymvip.eg',
        phone: '01011223344',
        role: Role.MANAGER,
        passwordHash: 'hashed_secret',
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'كابتن محمود - مدير',
          email: 'mahmoud.manager@gymvip.eg',
          phone: '01011223344',
          role: Role.MANAGER,
          password: 'StrongPassword123!',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.role).toBe(Role.MANAGER)
      expect(res.body.data.user).not.toHaveProperty('passwordHash')
    })

    it('2. OWNER can create a RECEPTIONIST', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.user, 'create').mockResolvedValue({
        id: 'new-user-2',
        gymId: mockGymId,
        name: 'سارة - موظفة استقبال',
        email: 'sara@gymvip.eg',
        role: Role.RECEPTIONIST,
        passwordHash: 'hashed_secret',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'سارة - موظفة استقبال',
          email: 'sara@gymvip.eg',
          role: Role.RECEPTIONIST,
          password: 'StrongPassword123!',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.user.role).toBe(Role.RECEPTIONIST)
    })

    it('3. OWNER can create a TRAINER', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.user, 'create').mockResolvedValue({
        id: 'new-user-3',
        gymId: mockGymId,
        name: 'كابتن حسام - مدرب',
        email: 'hossam@gymvip.eg',
        role: Role.TRAINER,
        passwordHash: 'hashed_secret',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'كابتن حسام - مدرب',
          email: 'hossam@gymvip.eg',
          role: Role.TRAINER,
          password: 'StrongPassword123!',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.user.role).toBe(Role.TRAINER)
    })

    it('4. MANAGER can create a RECEPTIONIST', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.user, 'create').mockResolvedValue({
        id: 'new-user-4',
        gymId: mockGymId,
        name: 'نور - استقبال',
        email: 'nour@gymvip.eg',
        role: Role.RECEPTIONIST,
        passwordHash: 'hashed_secret',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({
          name: 'نور - استقبال',
          email: 'nour@gymvip.eg',
          role: Role.RECEPTIONIST,
          password: 'StrongPassword123!',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.user.role).toBe(Role.RECEPTIONIST)
    })

    it('5. MANAGER can create a TRAINER', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.user, 'create').mockResolvedValue({
        id: 'new-user-5',
        gymId: mockGymId,
        name: 'كابتن رامي',
        email: 'rami@gymvip.eg',
        role: Role.TRAINER,
        passwordHash: 'hashed_secret',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({
          name: 'كابتن رامي',
          email: 'rami@gymvip.eg',
          role: Role.TRAINER,
          password: 'StrongPassword123!',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.user.role).toBe(Role.TRAINER)
    })

    it('6. MANAGER cannot create an OWNER (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({
          name: 'مالك غير مصرح',
          email: 'illegal.owner@gymvip.eg',
          role: Role.OWNER,
          password: 'StrongPassword123!',
        })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it('7. MANAGER cannot create another MANAGER (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({
          name: 'مدير غير مصرح',
          email: 'illegal.manager@gymvip.eg',
          role: Role.MANAGER,
          password: 'StrongPassword123!',
        })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it('8. RECEPTIONIST cannot access user management (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it('9. TRAINER cannot access user management (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it('10. Duplicate email inside the SAME gym is rejected with 409 Conflict', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: 'existing-id',
        gymId: mockGymId,
        email: 'duplicate@gymvip.eg',
      } as any)

      const res = await request(app)
        .post('/api/v1/users')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'مستخدم مكرر',
          email: 'duplicate@gymvip.eg',
          role: Role.TRAINER,
          password: 'StrongPassword123!',
        })

      expect(res.status).toBe(409)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('مستخدم بالفعل داخل هذا الجيم')
    })
  })

  // -------------------------------------------------------------
  // 2. LIST USERS & MULTI-TENANT ISOLATION
  // -------------------------------------------------------------
  describe('GET /api/v1/users (List & Gym Isolation)', () => {
    it('11. User list is strictly filtered by the authenticated user gymId', async () => {
      const findManySpy = vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
        {
          id: 'user-1',
          gymId: mockGymId,
          name: 'طاقم الجيم',
          email: 'staff@gymvip.eg',
          phone: '01012345678',
          role: Role.TRAINER,
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any)
      vi.spyOn(prisma.user, 'count').mockResolvedValue(1)

      const res = await request(app)
        .get('/api/v1/users?role=TRAINER&status=active&page=1&limit=10')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.users.length).toBe(1)
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gymId: mockGymId,
            role: Role.TRAINER,
            isActive: true,
          }),
        })
      )
    })

    it('12. Cannot view details of a user belonging to another gym (404 Not Found)', async () => {
      // Return null because where clause has gymId: mockGymId while user belongs to mockOtherGymId
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null)

      const res = await request(app)
        .get('/api/v1/users/foreign-user-id')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  // -------------------------------------------------------------
  // 3. UPDATE USER & ROLE RESTRICTIONS
  // -------------------------------------------------------------
  describe('PATCH /api/v1/users/:id (Update User & Role)', () => {
    it('13. OWNER can update staff member profile and role', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: 'target-user-1',
        gymId: mockGymId,
        role: Role.RECEPTIONIST,
      } as any)

      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        id: 'target-user-1',
        gymId: mockGymId,
        name: 'الاسم المحدث',
        email: 'updated@gymvip.eg',
        role: Role.TRAINER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const res = await request(app)
        .patch('/api/v1/users/target-user-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'الاسم المحدث',
          role: Role.TRAINER,
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.role).toBe(Role.TRAINER)
    })

    it('14. Cannot promote any user to OWNER role (403 Forbidden)', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: 'target-user-1',
        gymId: mockGymId,
        role: Role.MANAGER,
      } as any)

      const res = await request(app)
        .patch('/api/v1/users/target-user-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          role: Role.OWNER,
        })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('لا يمكن تغيير رتبة أي مستخدم إلى مالك')
    })
  })

  // -------------------------------------------------------------
  // 4. ACTIVATE / DEACTIVATE & STATUS RESTRICTIONS
  // -------------------------------------------------------------
  describe('PATCH /api/v1/users/:id/status (Activate / Deactivate)', () => {
    it('15. Cannot deactivate yourself (400 Bad Request)', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${mockOwnerId}/status`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          isActive: false,
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('لا يمكنك تعطيل حسابك الشخصي')
    })

    it('16. Cannot deactivate an OWNER account (403 Forbidden)', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: 'another-owner-id',
        gymId: mockGymId,
        role: Role.OWNER,
      } as any)

      const res = await request(app)
        .patch('/api/v1/users/another-owner-id/status')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          isActive: false,
        })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('لا يمكن تعطيل حساب مالك النادي')
    })

    it('17. OWNER can deactivate a trainer', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: 'trainer-id-1',
        gymId: mockGymId,
        role: Role.TRAINER,
        isActive: true,
      } as any)

      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        id: 'trainer-id-1',
        gymId: mockGymId,
        name: 'مدرب معطل',
        email: 'trainer@gymvip.eg',
        role: Role.TRAINER,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const res = await request(app)
        .patch('/api/v1/users/trainer-id-1/status')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          isActive: false,
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.isActive).toBe(false)
    })
  })

  // -------------------------------------------------------------
  // 5. PASSWORD RESET
  // -------------------------------------------------------------
  describe('PATCH /api/v1/users/:id/password (Admin Reset)', () => {
    it('18. OWNER can reset a staff member password', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: 'staff-id-1',
        gymId: mockGymId,
        role: Role.RECEPTIONIST,
      } as any)

      const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue({} as any)

      const res = await request(app)
        .patch('/api/v1/users/staff-id-1/password')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          newPassword: 'BrandNewPassword123!',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe('تم إعادة تعيين كلمة المرور بنجاح')
      expect(updateSpy).toHaveBeenCalled()
    })
  })
})
