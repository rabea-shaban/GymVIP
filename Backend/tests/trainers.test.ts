import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { Role } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'

describe('Feature 10: Trainers Management Integration Tests', () => {
  const mockGymId = 'gym-uuid-1'
  const mockOtherGymId = 'gym-uuid-2'

  const mockOwnerId = 'owner-uuid-1'
  const mockManagerId = 'manager-uuid-1'
  const mockReceptionistId = 'receptionist-uuid-1'
  const mockTrainerUserId = 'trainer-user-uuid-1'
  const mockOtherTrainerUserId = 'other-trainer-user-uuid-2'

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
    sub: mockTrainerUserId,
    gymId: mockGymId,
    role: Role.TRAINER,
  })

  const otherTrainerToken = generateAuthToken({
    sub: mockOtherTrainerUserId,
    gymId: mockGymId,
    role: Role.TRAINER,
  })

  const otherGymOwnerToken = generateAuthToken({
    sub: 'other-owner-uuid',
    gymId: mockOtherGymId,
    role: Role.OWNER,
  })

  const sampleTrainerUser = {
    id: mockTrainerUserId,
    gymId: mockGymId,
    name: 'كابتن رامي السباعي',
    email: 'ramy@gymvip.com',
    phone: '01012345678',
    passwordHash: 'hashed_password',
    role: Role.TRAINER,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
  }

  const sampleTrainer = {
    id: 'trainer-uuid-1',
    gymId: mockGymId,
    userId: mockTrainerUserId,
    specialization: 'كمال أجسام وتأهيل حركي',
    bio: 'مدرب معتمد بخبرة أكثر من 8 سنوات في تدريب كمال الأجسام.',
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
    user: {
      id: mockTrainerUserId,
      name: 'كابتن رامي السباعي',
      email: 'ramy@gymvip.com',
      phone: '01012345678',
      isActive: true,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock user lookup for auth middleware
    prisma.user.findUnique = vi.fn().mockImplementation(({ where }) => {
      if (where.id === mockOwnerId) {
        return Promise.resolve({
          id: mockOwnerId,
          gymId: mockGymId,
          role: Role.OWNER,
          isActive: true,
          gym: { id: mockGymId, isActive: true },
        })
      }
      if (where.id === mockManagerId) {
        return Promise.resolve({
          id: mockManagerId,
          gymId: mockGymId,
          role: Role.MANAGER,
          isActive: true,
          gym: { id: mockGymId, isActive: true },
        })
      }
      if (where.id === mockReceptionistId) {
        return Promise.resolve({
          id: mockReceptionistId,
          gymId: mockGymId,
          role: Role.RECEPTIONIST,
          isActive: true,
          gym: { id: mockGymId, isActive: true },
        })
      }
      if (where.id === mockTrainerUserId) {
        return Promise.resolve({
          id: mockTrainerUserId,
          gymId: mockGymId,
          role: Role.TRAINER,
          isActive: true,
          gym: { id: mockGymId, isActive: true },
        })
      }
      if (where.id === mockOtherTrainerUserId) {
        return Promise.resolve({
          id: mockOtherTrainerUserId,
          gymId: mockGymId,
          role: Role.TRAINER,
          isActive: true,
          gym: { id: mockGymId, isActive: true },
        })
      }
      if (where.id === 'other-owner-uuid') {
        return Promise.resolve({
          id: 'other-owner-uuid',
          gymId: mockOtherGymId,
          role: Role.OWNER,
          isActive: true,
          gym: { id: mockOtherGymId, isActive: true },
        })
      }
      return Promise.resolve(null)
    })
  })

  describe('1. POST /api/v1/trainers (Create Trainer)', () => {
    const validCreatePayload = {
      name: 'كابتن هيثم كمال',
      email: 'haitham@gymvip.com',
      password: 'Password123',
      phone: '01098765432',
      specialization: 'لياقة بدنية وكروس فيت',
      bio: 'أخصائي إعداد بدني معتمد',
    }

    it('1. OWNER can create a trainer', async () => {
      prisma.user.findFirst = vi.fn().mockResolvedValue(null)
      prisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        return callback({
          user: {
            create: vi.fn().mockResolvedValue({
              id: 'new-trainer-user-id',
              gymId: mockGymId,
              name: validCreatePayload.name,
              email: validCreatePayload.email,
              phone: validCreatePayload.phone,
              role: Role.TRAINER,
              isActive: true,
            }),
          },
          trainer: {
            create: vi.fn().mockResolvedValue({
              id: 'new-trainer-id',
              gymId: mockGymId,
              userId: 'new-trainer-user-id',
              specialization: validCreatePayload.specialization,
              bio: validCreatePayload.bio,
              createdAt: new Date(),
              updatedAt: new Date(),
              user: {
                id: 'new-trainer-user-id',
                name: validCreatePayload.name,
                email: validCreatePayload.email,
                phone: validCreatePayload.phone,
                isActive: true,
              },
            }),
          },
        })
      })

      const res = await request(app)
        .post('/api/v1/trainers')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send(validCreatePayload)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.trainer.name === undefined).toBe(true)
      expect(res.body.data.trainer.user.name).toBe(validCreatePayload.name)
      expect(res.body.data.trainer.user.email).toBe(validCreatePayload.email)
      expect(res.body.data.trainer.specialization).toBe(validCreatePayload.specialization)
      expect(res.body.data.trainer.user.passwordHash).toBeUndefined()
    })

    it('2. MANAGER can create a trainer', async () => {
      prisma.user.findFirst = vi.fn().mockResolvedValue(null)
      prisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        return callback({
          user: {
            create: vi.fn().mockResolvedValue({
              id: 'new-trainer-user-id',
              gymId: mockGymId,
              name: validCreatePayload.name,
              email: validCreatePayload.email,
              phone: validCreatePayload.phone,
              role: Role.TRAINER,
              isActive: true,
            }),
          },
          trainer: {
            create: vi.fn().mockResolvedValue({
              id: 'new-trainer-id',
              gymId: mockGymId,
              userId: 'new-trainer-user-id',
              specialization: validCreatePayload.specialization,
              bio: validCreatePayload.bio,
              createdAt: new Date(),
              updatedAt: new Date(),
              user: {
                id: 'new-trainer-user-id',
                name: validCreatePayload.name,
                email: validCreatePayload.email,
                phone: validCreatePayload.phone,
                isActive: true,
              },
            }),
          },
        })
      })

      const res = await request(app)
        .post('/api/v1/trainers')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send(validCreatePayload)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
    })

    it('3. RECEPTIONIST cannot create trainer (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/trainers')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send(validCreatePayload)

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it('4. TRAINER cannot create trainer (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/trainers')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])
        .send(validCreatePayload)

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it('5. Creating trainer creates User + Trainer profile in database', async () => {
      let createdUserData: any = null
      let createdTrainerData: any = null

      prisma.user.findFirst = vi.fn().mockResolvedValue(null)
      prisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        return callback({
          user: {
            create: vi.fn().mockImplementation(({ data }) => {
              createdUserData = data
              return Promise.resolve({
                id: 'gen-user-id',
                ...data,
              })
            }),
          },
          trainer: {
            create: vi.fn().mockImplementation(({ data }) => {
              createdTrainerData = data
              return Promise.resolve({
                id: 'gen-trainer-id',
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
                user: {
                  id: 'gen-user-id',
                  name: data.name,
                  email: 'test@gymvip.com',
                  phone: '01012345678',
                  isActive: true,
                },
              })
            }),
          },
        })
      })

      const res = await request(app)
        .post('/api/v1/trainers')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send(validCreatePayload)

      expect(res.status).toBe(201)
      expect(createdUserData).toBeDefined()
      expect(createdUserData.role).toBe(Role.TRAINER)
      expect(createdUserData.gymId).toBe(mockGymId)
      expect(createdTrainerData).toBeDefined()
      expect(createdTrainerData.gymId).toBe(mockGymId)
      expect(createdTrainerData.userId).toBe('gen-user-id')
    })

    it('6. Transaction rollback if Trainer profile creation fails', async () => {
      prisma.user.findFirst = vi.fn().mockResolvedValue(null)
      prisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        return callback({
          user: {
            create: vi.fn().mockResolvedValue({ id: 'u1' }),
          },
          trainer: {
            create: vi.fn().mockRejectedValue(new Error('DB Constraint Error in Trainer')),
          },
        })
      })

      const res = await request(app)
        .post('/api/v1/trainers')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send(validCreatePayload)

      expect(res.status).toBe(500)
    })

    it('7. Cannot create duplicate email in same gym (409 Conflict)', async () => {
      prisma.user.findFirst = vi.fn().mockResolvedValue({
        id: 'existing-user',
        email: validCreatePayload.email.toLowerCase(),
        gymId: mockGymId,
      })

      const res = await request(app)
        .post('/api/v1/trainers')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send(validCreatePayload)

      expect(res.status).toBe(409)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('مستخدم بالفعل')
    })

    it('8. Rejects invalid input with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/trainers')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({
          name: '',
          email: 'invalid-email',
          password: '123',
          phone: '123',
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })

  describe('2. GET /api/v1/trainers (List Trainers)', () => {
    it('9. OWNER can list trainers', async () => {
      prisma.trainer.count = vi.fn().mockResolvedValue(1)
      prisma.trainer.findMany = vi.fn().mockResolvedValue([sampleTrainer])

      const res = await request(app)
        .get('/api/v1/trainers')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.trainers).toHaveLength(1)
      expect(res.body.data.pagination.total).toBe(1)
    })

    it('10. MANAGER can list trainers', async () => {
      prisma.trainer.count = vi.fn().mockResolvedValue(1)
      prisma.trainer.findMany = vi.fn().mockResolvedValue([sampleTrainer])

      const res = await request(app)
        .get('/api/v1/trainers')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('11. RECEPTIONIST can list trainers', async () => {
      prisma.trainer.count = vi.fn().mockResolvedValue(1)
      prisma.trainer.findMany = vi.fn().mockResolvedValue([sampleTrainer])

      const res = await request(app)
        .get('/api/v1/trainers')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('12. TRAINER cannot list all trainers (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/trainers')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it('13. Search query filters by name/email/phone/specialization', async () => {
      prisma.trainer.count = vi.fn().mockResolvedValue(1)
      prisma.trainer.findMany = vi.fn().mockResolvedValue([sampleTrainer])

      const res = await request(app)
        .get('/api/v1/trainers?search=رامي')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(prisma.trainer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gymId: mockGymId,
            OR: expect.arrayContaining([
              { user: { name: { contains: 'رامي' } } },
              { user: { email: { contains: 'رامي' } } },
              { user: { phone: { contains: 'رامي' } } },
              { specialization: { contains: 'رامي' } },
            ]),
          }),
        })
      )
    })

    it('14. Status filter filters by active/inactive/all', async () => {
      prisma.trainer.count = vi.fn().mockResolvedValue(1)
      prisma.trainer.findMany = vi.fn().mockResolvedValue([sampleTrainer])

      const res = await request(app)
        .get('/api/v1/trainers?status=active')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(prisma.trainer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gymId: mockGymId,
            user: { isActive: true },
          }),
        })
      )
    })

    it('15. Pagination parameters work properly', async () => {
      prisma.trainer.count = vi.fn().mockResolvedValue(25)
      prisma.trainer.findMany = vi.fn().mockResolvedValue([sampleTrainer])

      const res = await request(app)
        .get('/api/v1/trainers?page=2&limit=10')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.data.pagination.page).toBe(2)
      expect(res.body.data.pagination.limit).toBe(10)
      expect(res.body.data.pagination.total).toBe(25)
      expect(res.body.data.pagination.totalPages).toBe(3)
      expect(prisma.trainer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      )
    })
  })

  describe('3. GET /api/v1/trainers/:id (Get Trainer Details)', () => {
    it('16. OWNER and MANAGER can view trainer details', async () => {
      prisma.trainer.findFirst = vi.fn().mockResolvedValue(sampleTrainer)

      const res = await request(app)
        .get('/api/v1/trainers/trainer-uuid-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.trainer.id).toBe('trainer-uuid-1')
      expect(res.body.data.trainer.user.name).toBe('كابتن رامي السباعي')
    })

    it('17. RECEPTIONIST can view trainer details', async () => {
      prisma.trainer.findFirst = vi.fn().mockResolvedValue(sampleTrainer)

      const res = await request(app)
        .get('/api/v1/trainers/trainer-uuid-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('18. TRAINER can view their own profile details', async () => {
      prisma.trainer.findFirst = vi.fn().mockResolvedValue(sampleTrainer)

      const res = await request(app)
        .get('/api/v1/trainers/trainer-uuid-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('19. TRAINER cannot view another trainer profile (403 Forbidden)', async () => {
      prisma.trainer.findFirst = vi.fn().mockResolvedValue(sampleTrainer) // userId is mockTrainerUserId

      const res = await request(app)
        .get('/api/v1/trainers/trainer-uuid-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${otherTrainerToken}`]) // other trainer

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it('20. Gym isolation: Trainer from Gym A cannot be viewed by Gym B (404 Not Found)', async () => {
      prisma.trainer.findFirst = vi.fn().mockResolvedValue(null)

      const res = await request(app)
        .get('/api/v1/trainers/trainer-uuid-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${otherGymOwnerToken}`])

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe('4. GET /api/v1/trainers/me (Trainer Self Profile)', () => {
    it('21. Logged in TRAINER can access /me profile', async () => {
      prisma.trainer.findFirst = vi.fn().mockResolvedValue(sampleTrainer)

      const res = await request(app)
        .get('/api/v1/trainers/me')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.trainer.userId).toBe(mockTrainerUserId)
      expect(res.body.data.trainer.user.email).toBe('ramy@gymvip.com')
    })

    it('22. Non-TRAINER role (OWNER) cannot access /trainers/me (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/trainers/me')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })
  })

  describe('5. PATCH /api/v1/trainers/:id (Update Trainer)', () => {
    const updatePayload = {
      name: 'كابتن رامي المعدل',
      phone: '01099998888',
      specialization: 'تغذية وكمال أجسام متقدم',
      bio: 'نبذة محدثة',
    }

    it('23. OWNER and MANAGER can update trainer details', async () => {
      prisma.trainer.findFirst = vi.fn().mockResolvedValue(sampleTrainer)
      prisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        return callback({
          user: {
            update: vi.fn().mockResolvedValue({}),
          },
          trainer: {
            update: vi.fn().mockResolvedValue({
              ...sampleTrainer,
              specialization: updatePayload.specialization,
              bio: updatePayload.bio,
              user: {
                ...sampleTrainer.user,
                name: updatePayload.name,
                phone: updatePayload.phone,
              },
            }),
          },
        })
      })

      const res = await request(app)
        .patch('/api/v1/trainers/trainer-uuid-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send(updatePayload)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.trainer.specialization).toBe(updatePayload.specialization)
      expect(res.body.data.trainer.user.name).toBe(updatePayload.name)
    })

    it('24. RECEPTIONIST cannot update trainer (403 Forbidden)', async () => {
      const res = await request(app)
        .patch('/api/v1/trainers/trainer-uuid-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send(updatePayload)

      expect(res.status).toBe(403)
    })

    it('25. TRAINER cannot update another trainer (403 Forbidden)', async () => {
      const res = await request(app)
        .patch('/api/v1/trainers/trainer-uuid-1')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])
        .send(updatePayload)

      expect(res.status).toBe(403)
    })
  })

  describe('6. PATCH /api/v1/trainers/:id/status (Activate / Deactivate)', () => {
    it('26. OWNER can deactivate a trainer (User.isActive = false)', async () => {
      prisma.trainer.findFirst = vi.fn().mockResolvedValue(sampleTrainer)
      prisma.user.update = vi.fn().mockResolvedValue({})
      prisma.trainer.findUnique = vi.fn().mockResolvedValue({
        ...sampleTrainer,
        user: {
          ...sampleTrainer.user,
          isActive: false,
        },
      })

      const res = await request(app)
        .patch('/api/v1/trainers/trainer-uuid-1/status')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
        .send({ isActive: false })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.trainer.user.isActive).toBe(false)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockTrainerUserId },
        data: { isActive: false },
      })
    })

    it('27. MANAGER can activate a trainer (User.isActive = true)', async () => {
      prisma.trainer.findFirst = vi.fn().mockResolvedValue(sampleTrainer)
      prisma.user.update = vi.fn().mockResolvedValue({})
      prisma.trainer.findUnique = vi.fn().mockResolvedValue({
        ...sampleTrainer,
        user: {
          ...sampleTrainer.user,
          isActive: true,
        },
      })

      const res = await request(app)
        .patch('/api/v1/trainers/trainer-uuid-1/status')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${managerToken}`])
        .send({ isActive: true })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.trainer.user.isActive).toBe(true)
    })

    it('28. RECEPTIONIST cannot activate/deactivate trainer (403 Forbidden)', async () => {
      const res = await request(app)
        .patch('/api/v1/trainers/trainer-uuid-1/status')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])
        .send({ isActive: false })

      expect(res.status).toBe(403)
    })
  })
})
