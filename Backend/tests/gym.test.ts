import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { Role } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'

describe('Feature 3: Gym Setup & Settings Tests', () => {
  const mockGymId = 'gym-uuid-1'
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

  const mockGymInitial = {
    id: mockGymId,
    name: 'GymVIP Cairo Club',
    slug: 'gymvip-cairo-club-1234',
    phone: '01012345678',
    email: 'cairo@gymvip.eg',
    address: 'شارع التسعين، التجمع الخامس',
    city: 'القاهرة الجديدة',
    logo: 'https://gymvip.eg/logo.png',
    currency: 'EGP',
    timezone: 'Africa/Cairo',
    isActive: true,
    setupCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()

    // Default mock user resolver for requireAuth middleware
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      let role = Role.OWNER
      if (where.id === mockManagerId) role = Role.MANAGER
      if (where.id === mockReceptionistId) role = Role.RECEPTIONIST
      if (where.id === mockTrainerId) role = Role.TRAINER

      return {
        id: where.id,
        gymId: mockGymId,
        name: 'المستخدم المعتمد',
        email: 'user@gymvip.eg',
        role,
        isActive: true,
        gym: { id: mockGymId, isActive: true },
      } as any
    })
  })

  // -------------------------------------------------------------
  // 1. GET GYM PROFILE & SETUP STATUS
  // -------------------------------------------------------------
  describe('GET /api/v1/gym & GET /api/v1/gym/setup-status', () => {
    it('1. should return full gym profile for authenticated staff', async () => {
      vi.spyOn(prisma.gym, 'findUnique').mockResolvedValue(mockGymInitial as any)

      const res = await request(app)
        .get('/api/v1/gym')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.gym.id).toBe(mockGymId)
      expect(res.body.data.gym.name).toBe('GymVIP Cairo Club')
      expect(res.body.data.gym.slug).toBe('gymvip-cairo-club-1234')
      expect(res.body.data.gym.currency).toBe('EGP')
      expect(res.body.data.gym.timezone).toBe('Africa/Cairo')
    })

    it('2. should return setup status boolean', async () => {
      vi.spyOn(prisma.gym, 'findUnique').mockResolvedValue({
        setupCompleted: false,
      } as any)

      const res = await request(app)
        .get('/api/v1/gym/setup-status')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.setupCompleted).toBe(false)
    })
  })

  // -------------------------------------------------------------
  // 2. COMPLETE INITIAL SETUP
  // -------------------------------------------------------------
  describe('PATCH /api/v1/gym/setup', () => {
    it('3. should allow OWNER to complete initial gym setup and set setupCompleted = true', async () => {
      vi.spyOn(prisma.gym, 'findUnique').mockResolvedValue(mockGymInitial as any)
      const updateSpy = vi.spyOn(prisma.gym, 'update').mockResolvedValue({
        ...mockGymInitial,
        name: 'GymVIP Cairo Elite',
        address: 'شارع التسعين الشمالي',
        city: 'القاهرة الجديدة',
        setupCompleted: true,
      } as any)

      const res = await request(app)
        .patch('/api/v1/gym/setup')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'GymVIP Cairo Elite',
          phone: '01012345678',
          email: 'elite@gymvip.eg',
          address: 'شارع التسعين الشمالي',
          city: 'القاهرة الجديدة',
          currency: 'EGP',
          timezone: 'Africa/Cairo',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toContain('تم إعداد بيانات الجيم بنجاح')
      expect(res.body.data.gym.setupCompleted).toBe(true)
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockGymId },
          data: expect.objectContaining({ setupCompleted: true }),
        })
      )
    })

    it('4. should reject unauthenticated requests to complete setup with 401 Unauthorized', async () => {
      const res = await request(app)
        .patch('/api/v1/gym/setup')
        .send({
          name: 'GymVIP Cairo Elite',
        })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('5. should reject invalid gym data with 400 Bad Request', async () => {
      const res = await request(app)
        .patch('/api/v1/gym/setup')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'A', // Too short
          phone: '12345', // Invalid Egyptian phone
          email: 'invalid-email',
          currency: 'USD', // Not allowed (only EGP)
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.errors).toBeInstanceOf(Array)
    })
  })

  // -------------------------------------------------------------
  // 3. UPDATE GYM SETTINGS & SLUG IMMUTABILITY
  // -------------------------------------------------------------
  describe('PATCH /api/v1/gym (Settings Update)', () => {
    it('6. should allow OWNER to update gym information while preserving slug', async () => {
      vi.spyOn(prisma.gym, 'findUnique').mockResolvedValue(mockGymInitial as any)
      const updateSpy = vi.spyOn(prisma.gym, 'update').mockResolvedValue({
        ...mockGymInitial,
        name: 'GymVIP New Name',
        slug: 'gymvip-cairo-club-1234', // Unchanged slug
      } as any)

      const res = await request(app)
        .patch('/api/v1/gym')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: 'GymVIP New Name',
          city: 'المنيا',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.gym.slug).toBe('gymvip-cairo-club-1234')

      // Verify that slug and id are NOT part of the update payload
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockGymId },
          data: {
            name: 'GymVIP New Name',
            city: 'المنيا',
          },
        })
      )
    })

    it('7. should allow MANAGER to update gym settings', async () => {
      vi.spyOn(prisma.gym, 'findUnique').mockResolvedValue(mockGymInitial as any)
      vi.spyOn(prisma.gym, 'update').mockResolvedValue({
        ...mockGymInitial,
        phone: '01122334455',
      } as any)

      const res = await request(app)
        .patch('/api/v1/gym')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({
          phone: '01122334455',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('8. should deny RECEPTIONIST from updating gym settings with 403 Forbidden', async () => {
      const res = await request(app)
        .patch('/api/v1/gym')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({
          name: 'Unauthorized Change',
        })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toBe('ليس لديك صلاحية لتنفيذ هذا الإجراء')
    })

    it('9. should deny TRAINER from updating gym settings with 403 Forbidden', async () => {
      const res = await request(app)
        .patch('/api/v1/gym')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])
        .send({
          name: 'Unauthorized Change',
        })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toBe('ليس لديك صلاحية لتنفيذ هذا الإجراء')
    })
  })

  // -------------------------------------------------------------
  // 4. OWNER-ONLY STATUS TOGGLE & ISOLATION
  // -------------------------------------------------------------
  describe('PATCH /api/v1/gym/status & Isolation', () => {
    it('10. should allow OWNER to deactivate the gym', async () => {
      vi.spyOn(prisma.gym, 'findUnique').mockResolvedValue(mockGymInitial as any)
      vi.spyOn(prisma.gym, 'update').mockResolvedValue({
        ...mockGymInitial,
        isActive: false,
      } as any)

      const res = await request(app)
        .patch('/api/v1/gym/status')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          isActive: false,
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.gym.isActive).toBe(false)
    })

    it('11. should deny MANAGER from deactivating the gym with 403 Forbidden', async () => {
      const res = await request(app)
        .patch('/api/v1/gym/status')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({
          isActive: false,
        })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toBe('ليس لديك صلاحية لتنفيذ هذا الإجراء')
    })

    it('12. should enforce gym isolation: query is strictly scoped to req.user.gymId', async () => {
      const foreignGymToken = generateAuthToken({
        sub: 'user-foreign',
        gymId: 'gym-foreign-id',
        role: Role.OWNER,
      })

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user-foreign',
        gymId: 'gym-foreign-id',
        name: 'مالك صالة أخرى',
        email: 'other@gym.eg',
        role: Role.OWNER,
        isActive: true,
        gym: { id: 'gym-foreign-id', isActive: true },
      } as any)

      const findGymSpy = vi.spyOn(prisma.gym, 'findUnique').mockResolvedValue({
        id: 'gym-foreign-id',
        name: 'Foreign Gym',
        slug: 'foreign-gym',
        currency: 'EGP',
        timezone: 'Africa/Cairo',
        isActive: true,
        setupCompleted: true,
      } as any)

      const res = await request(app)
        .get('/api/v1/gym')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${foreignGymToken}`])

      expect(res.status).toBe(200)
      expect(findGymSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'gym-foreign-id' },
        })
      )
    })
  })
})
