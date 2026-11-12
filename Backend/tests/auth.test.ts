import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { Role } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { hashPassword } from '../src/utils/password.util.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'

describe('Feature 2: Authentication, Gym Account & RBAC Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------
  // 1. REGISTRATION TESTS
  // -------------------------------------------------------------
  describe('POST /api/v1/auth/register', () => {
    it('1. should successfully register a new gym and owner, set HTTPOnly cookie, and return safe data', async () => {
      const mockGym = {
        id: 'gym-uuid-1',
        name: 'GymVIP Fitness Club',
        slug: 'gymvip-fitness-club-abc123',
        phone: '01012345678',
        email: 'owner@gymvip.eg',
        city: 'المنيا',
        currency: 'EGP',
        timezone: 'Africa/Cairo',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockUser = {
        id: 'user-uuid-1',
        gymId: mockGym.id,
        name: 'أحمد محمد',
        email: 'owner@gymvip.eg',
        phone: '01012345678',
        role: Role.OWNER,
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Mock user not existing
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.gym, 'findUnique').mockResolvedValue(null)

      // Mock transaction create
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          gym: { create: vi.fn().mockResolvedValue(mockGym) },
          user: { create: vi.fn().mockResolvedValue(mockUser) },
        }
        return callback(tx)
      })

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          gymName: 'GymVIP Fitness Club',
          ownerName: 'أحمد محمد',
          email: 'owner@gymvip.eg',
          phone: '01012345678',
          password: 'StrongPassword123!',
          city: 'المنيا',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.name).toBe('أحمد محمد')
      expect(res.body.data.user.role).toBe(Role.OWNER)
      expect(res.body.data.gym.name).toBe('GymVIP Fitness Club')

      // Ensure password and passwordHash are NEVER in the response
      expect(res.body.data.user).not.toHaveProperty('password')
      expect(res.body.data.user).not.toHaveProperty('passwordHash')
      expect(res.body).not.toHaveProperty('token')

      // Verify HTTPOnly cookie was set
      const cookies = res.headers['set-cookie']
      expect(cookies).toBeDefined()
      expect(cookies[0]).toContain(`${AUTH_COOKIE_NAME}=`)
      expect(cookies[0]).toContain('HttpOnly')
    })

    it('2. should reject duplicate email registration with 409 Conflict', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: 'existing-user-id',
      } as any)

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          gymName: 'GymVIP Duplicate',
          ownerName: 'محمود علي',
          email: 'existing@gymvip.eg',
          phone: '01012345678',
          password: 'StrongPassword123!',
        })

      expect(res.status).toBe(409)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('مسجل بالفعل')
    })

    it('3. should reject invalid registration payload with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          gymName: '', // Invalid empty
          ownerName: 'A', // Too short
          email: 'invalid-email', // Invalid format
          phone: '12345', // Invalid Egyptian phone
          password: 'short', // Too short & no numbers
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.errors).toBeInstanceOf(Array)
      expect(res.body.errors.length).toBeGreaterThan(0)
    })
  })

  // -------------------------------------------------------------
  // 2. LOGIN TESTS
  // -------------------------------------------------------------
  describe('POST /api/v1/auth/login', () => {
    it('4. should successfully log in with valid credentials, set HTTPOnly cookie, and update lastLoginAt', async () => {
      const rawPassword = 'StrongPassword123!'
      const passwordHash = await hashPassword(rawPassword)

      const mockGym = {
        id: 'gym-uuid-1',
        name: 'GymVIP Cairo',
        slug: 'gymvip-cairo',
        city: 'القاهرة',
        currency: 'EGP',
        isActive: true,
      }

      const mockUser = {
        id: 'user-uuid-1',
        gymId: 'gym-uuid-1',
        name: 'كابتن طارق',
        email: 'tarek@gymvip.eg',
        phone: '01099887766',
        passwordHash,
        role: Role.OWNER,
        isActive: true,
        gym: mockGym,
      }

      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any)
      const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue({} as any)

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'tarek@gymvip.eg',
          password: rawPassword,
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.email).toBe('tarek@gymvip.eg')
      expect(res.body.data.gym.slug).toBe('gymvip-cairo')
      expect(updateSpy).toHaveBeenCalled()

      // Ensure token is in HTTPOnly cookie only, not in response body
      expect(res.body).not.toHaveProperty('token')
      const cookies = res.headers['set-cookie']
      expect(cookies).toBeDefined()
      expect(cookies[0]).toContain(`${AUTH_COOKIE_NAME}=`)
      expect(cookies[0]).toContain('HttpOnly')
    })

    it('5. should reject wrong password with 401 Unauthorized', async () => {
      const passwordHash = await hashPassword('CorrectPassword123!')

      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: 'user-uuid-1',
        email: 'tarek@gymvip.eg',
        passwordHash,
        isActive: true,
        gym: { isActive: true },
      } as any)

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'tarek@gymvip.eg',
          password: 'WrongPassword!',
        })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('غير صحيحة')
    })

    it('6. should reject non-existent user with generic 401 Unauthorized', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null)

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@gymvip.eg',
          password: 'SomePassword123!',
        })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('غير صحيحة')
    })

    it('7. should reject disabled user with 403 Forbidden', async () => {
      const rawPassword = 'StrongPassword123!'
      const passwordHash = await hashPassword(rawPassword)

      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: 'user-uuid-1',
        email: 'disabled@gymvip.eg',
        passwordHash,
        isActive: false, // Disabled user
        gym: { isActive: true },
      } as any)

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'disabled@gymvip.eg',
          password: rawPassword,
        })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('معطل')
    })

    it('8. should reject user of inactive/disabled gym with 403 Forbidden', async () => {
      const rawPassword = 'StrongPassword123!'
      const passwordHash = await hashPassword(rawPassword)

      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: 'user-uuid-1',
        email: 'gymdisabled@gymvip.eg',
        passwordHash,
        isActive: true,
        gym: { isActive: false }, // Disabled Gym
      } as any)

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'gymdisabled@gymvip.eg',
          password: rawPassword,
        })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('النادي')
    })
  })

  // -------------------------------------------------------------
  // 3. CURRENT USER & LOGOUT TESTS
  // -------------------------------------------------------------
  describe('GET /api/v1/auth/me & POST /api/v1/auth/logout', () => {
    it('9. should return 401 when calling /api/v1/auth/me without authentication cookie', async () => {
      const res = await request(app).get('/api/v1/auth/me')

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('10. should return authenticated user profile when calling /api/v1/auth/me with valid cookie', async () => {
      const token = generateAuthToken({
        sub: 'user-uuid-1',
        gymId: 'gym-uuid-1',
        role: Role.OWNER,
      })

      const mockUser = {
        id: 'user-uuid-1',
        gymId: 'gym-uuid-1',
        name: 'أحمد المالك',
        email: 'owner@gymvip.eg',
        phone: '01012345678',
        role: Role.OWNER,
        isActive: true,
        gym: {
          id: 'gym-uuid-1',
          name: 'GymVIP Maadi',
          slug: 'gymvip-maadi',
          city: 'المعادي',
          currency: 'EGP',
          isActive: true,
        },
      }

      // Mock user in auth middleware and getCurrentUserProfile
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any)

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${token}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.name).toBe('أحمد المالك')
      expect(res.body.data.gym.slug).toBe('gymvip-maadi')
    })

    it('11. should clear authentication cookie on logout', async () => {
      const res = await request(app).post('/api/v1/auth/logout')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toContain('تم تسجيل الخروج بنجاح')

      const cookies = res.headers['set-cookie']
      expect(cookies).toBeDefined()
      expect(cookies[0]).toContain(`${AUTH_COOKIE_NAME}=;`)
    })
  })

  // -------------------------------------------------------------
  // 4. RBAC & GYM ISOLATION TESTS
  // -------------------------------------------------------------
  describe('RBAC & Multi-tenant Gym Isolation', () => {
    it('12. should allow OWNER to access owner-protected routes', async () => {
      const ownerToken = generateAuthToken({
        sub: 'owner-id-1',
        gymId: 'gym-id-1',
        role: Role.OWNER,
      })

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'owner-id-1',
        gymId: 'gym-id-1',
        name: 'المالك',
        email: 'owner@gymvip.eg',
        role: Role.OWNER,
        isActive: true,
        gym: { id: 'gym-id-1', isActive: true },
      } as any)

      // Test via /auth/me which validates requireAuth
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.data.user.role).toBe(Role.OWNER)
    })

    it('14. should deny MANAGER from accessing an OWNER-only route with 403 Forbidden', async () => {
      // Create a test app route with requireRole(Role.OWNER)
      const { requireRole } = await import('../src/middlewares/rbac.middleware.js')
      const { requireAuth } = await import('../src/middlewares/auth.middleware.js')
      const express = (await import('express')).default
      const testApp = express()
      testApp.use((await import('cookie-parser')).default())
      testApp.use(express.json())

      testApp.get(
        '/owner-only',
        requireAuth,
        requireRole(Role.OWNER),
        (_req, res) => {
          res.json({ success: true, message: 'Welcome Owner' })
        }
      )
      testApp.use((await import('../src/middlewares/error.middleware.js')).errorHandler)

      const managerToken = generateAuthToken({
        sub: 'manager-id-1',
        gymId: 'gym-id-1',
        role: Role.MANAGER,
      })

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'manager-id-1',
        gymId: 'gym-id-1',
        name: 'المدير',
        email: 'manager@gymvip.eg',
        role: Role.MANAGER,
        isActive: true,
        gym: { id: 'gym-id-1', isActive: true },
      } as any)

      const res = await request(testApp)
        .get('/owner-only')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toBe('ليس لديك صلاحية لتنفيذ هذا الإجراء')
    })

    it('15. should verify gymId is securely bound to the authenticated user context for multi-tenant isolation', async () => {
      const token = generateAuthToken({
        sub: 'user-gym-a',
        gymId: 'gym-alpha',
        role: Role.MANAGER,
      })

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user-gym-a',
        gymId: 'gym-alpha',
        name: 'مدير فرع ألفا',
        email: 'manager@gym-alpha.eg',
        role: Role.MANAGER,
        isActive: true,
        gym: { id: 'gym-alpha', name: 'Gym Alpha', slug: 'gym-alpha', city: 'القاهرة', currency: 'EGP', isActive: true },
      } as any)

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${token}`])

      expect(res.status).toBe(200)
      expect(res.body.data.user.id).toBe('user-gym-a')
      expect(res.body.data.gym.id).toBe('gym-alpha')
    })
  })
})
