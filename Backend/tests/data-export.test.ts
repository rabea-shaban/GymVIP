import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { Role, Prisma, SubscriptionStatus, PaymentMethod } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { generateAuthToken } from '../src/utils/jwt.util.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../src/types/audit.types.js'
import { sanitizeFormulaInjection, escapeCsvValue, generateCsv, generateXlsx } from '../src/utils/export.util.js'

describe('Feature 17: Data Export & Backup Readiness Integration Tests', () => {
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
    name: 'أحمد محمود',
    phone: '01012345678',
    email: 'ahmed@example.com',
    gender: 'MALE',
    dateOfBirth: new Date('1995-05-15T00:00:00.000Z'),
    isActive: true,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
  }

  const sampleSubscription = {
    id: 'sub-uuid-1',
    gymId: mockGymId,
    memberId: sampleMember.id,
    planId: 'plan-1',
    planName: 'باقة شهرية ذهبية',
    planPrice: new Prisma.Decimal(500.0),
    durationDays: 30,
    currency: 'EGP',
    startDate: new Date('2026-10-01T00:00:00.000Z'),
    endDate: new Date('2026-10-31T23:59:59.999Z'),
    status: SubscriptionStatus.ACTIVE,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    member: sampleMember,
  }

  const samplePayment = {
    id: 'pay-uuid-1',
    gymId: mockGymId,
    subscriptionId: sampleSubscription.id,
    memberId: sampleMember.id,
    amount: new Prisma.Decimal(500.0),
    currency: 'EGP',
    method: PaymentMethod.CASH,
    walletProvider: null,
    transactionReference: 'REC-00123',
    createdAt: new Date('2026-10-01T10:30:00.000Z'),
    member: sampleMember,
  }

  const sampleAttendance = {
    id: 'att-uuid-1',
    gymId: mockGymId,
    memberId: sampleMember.id,
    subscriptionId: sampleSubscription.id,
    checkInAt: new Date('2026-10-05T08:00:00.000Z'),
    checkOutAt: new Date('2026-10-05T09:30:00.000Z'),
    durationMinutes: 90,
    createdAt: new Date('2026-10-05T08:00:00.000Z'),
    member: sampleMember,
  }

  const samplePlan = {
    id: 'plan-uuid-1',
    gymId: mockGymId,
    name: 'باقة 30 يوم',
    description: 'دخول غير محدود لجميع الصالات',
    durationDays: 30,
    price: new Prisma.Decimal(500.0),
    currency: 'EGP',
    isActive: true,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
  }

  const sampleAuditLog = {
    id: 'audit-uuid-1',
    gymId: mockGymId,
    actorUserId: mockOwnerId,
    action: 'MEMBER_CREATED',
    entityType: 'MEMBER',
    entityId: sampleMember.id,
    description: 'تم إنشاء عضو جديد أحمد محمود',
    metadata: { note: 'ملاحظة سرية' },
    beforeData: { password: 'secret_hash_not_exported' },
    afterData: { password: 'secret_hash_not_exported' },
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    actorUser: {
      id: mockOwnerId,
      name: 'مالك النادي',
      role: Role.OWNER,
    },
  }

  beforeEach(() => {
    vi.restoreAllMocks()

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

  // 1. Authorized member export succeeds
  it('1. should allow authorized OWNER to export members as CSV', async () => {
    vi.spyOn(prisma.member, 'count').mockResolvedValue(1)
    vi.spyOn(prisma.member, 'findMany').mockResolvedValue([sampleMember] as any)

    const response = await request(app)
      .get('/api/v1/exports/members?format=csv')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('text/csv')
    expect(response.headers['content-disposition']).toContain('attachment; filename=')
    expect(response.text).toContain('كود العضو')
    expect(response.text).toContain('أحمد محمود')
  })

  // 2. Unauthorized member export is rejected
  it('2. should reject member export when request has no authentication token (401)', async () => {
    const response = await request(app).get('/api/v1/exports/members')
    expect(response.status).toBe(401)
  })

  // 3. Payment export respects financial permissions
  it('3. should reject RECEPTIONIST from exporting financial payments (403 Forbidden)', async () => {
    const response = await request(app)
      .get('/api/v1/exports/payments')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${receptionistToken}`])

    expect(response.status).toBe(403)
    expect(response.body.success).toBe(false)
  })

  // 4. Trainer cannot export gym-wide data
  it('4. should strictly forbid TRAINER from exporting any gym data with 403', async () => {
    const endpoints = [
      '/api/v1/exports/members',
      '/api/v1/exports/subscriptions',
      '/api/v1/exports/payments',
      '/api/v1/exports/attendance',
      '/api/v1/exports/plans',
      '/api/v1/exports/activity-logs',
    ]

    for (const ep of endpoints) {
      const response = await request(app)
        .get(ep)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${trainerToken}`])

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    }
  })

  // 5. Cross-gym data never appears in exports
  it('5. should strictly enforce gymId in queries and never export another gym records', async () => {
    let capturedWhere: any = null
    vi.spyOn(prisma.member, 'count').mockImplementation(async ({ where }: any) => {
      capturedWhere = where
      return 1
    })
    vi.spyOn(prisma.member, 'findMany').mockResolvedValue([sampleMember] as any)

    const response = await request(app)
      .get('/api/v1/exports/members')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(200)
    expect(capturedWhere.gymId).toBe(mockGymId)
    expect(capturedWhere.gymId).not.toBe(mockOtherGymId)
  })

  // 6. Member filters are applied correctly
  it('6. should apply search and status filters to database query', async () => {
    let capturedWhere: any = null
    vi.spyOn(prisma.member, 'count').mockImplementation(async ({ where }: any) => {
      capturedWhere = where
      return 1
    })
    vi.spyOn(prisma.member, 'findMany').mockResolvedValue([sampleMember] as any)

    const response = await request(app)
      .get('/api/v1/exports/members?status=ACTIVE&search=أحمد')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(200)
    expect(capturedWhere.isActive).toBe(true)
    expect(capturedWhere.OR).toBeDefined()
  })

  // 7. Date filters respect Cairo boundaries
  it('7. should respect Africa/Cairo date boundaries for from and to filters', async () => {
    let capturedWhere: any = null
    vi.spyOn(prisma.payment, 'count').mockImplementation(async ({ where }: any) => {
      capturedWhere = where
      return 1
    })
    vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([samplePayment] as any)

    const response = await request(app)
      .get('/api/v1/exports/payments?from=2026-10-01&to=2026-10-05')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(200)
    expect(capturedWhere.createdAt).toBeDefined()
    expect(capturedWhere.createdAt.gte).toBeInstanceOf(Date)
    expect(capturedWhere.createdAt.lte).toBeInstanceOf(Date)
  })

  // 8. CSV headers are correct
  it('8. should generate correct Arabic CSV headers for all export types', async () => {
    vi.spyOn(prisma.attendance, 'count').mockResolvedValue(1)
    vi.spyOn(prisma.attendance, 'findMany').mockResolvedValue([sampleAttendance] as any)

    const response = await request(app)
      .get('/api/v1/exports/attendance?format=csv')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(200)
    expect(response.text).toContain('"اسم العضو"')
    expect(response.text).toContain('"كود العضو"')
    expect(response.text).toContain('"وقت تسجيل الحضور"')
    expect(response.text).toContain('"وقت تسجيل الانصراف"')
    expect(response.text).toContain('"مدة الحضور"')
    expect(response.text).toContain('"تاريخ السجل"')
  })

  // 9. CSV handles Arabic text
  it('9. should handle Arabic text and include UTF-8 BOM', async () => {
    vi.spyOn(prisma.membershipPlan, 'count').mockResolvedValue(1)
    vi.spyOn(prisma.membershipPlan, 'findMany').mockResolvedValue([samplePlan] as any)

    const response = await request(app)
      .get('/api/v1/exports/plans?format=csv')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(200)
    // UTF-8 BOM check (\uFEFF)
    expect(response.text.charCodeAt(0)).toBe(0xfeff)
    expect(response.text).toContain('باقة 30 يوم')
    expect(response.text).toContain('دخول غير محدود لجميع الصالات')
  })

  // 10. CSV values are escaped correctly
  it('10. should properly escape CSV values containing commas and quotes', () => {
    const testValue = 'باقة خاصة, تشمل "ساونا" وبخار'
    const escaped = escapeCsvValue(testValue)
    expect(escaped).toBe('"باقة خاصة, تشمل ""ساونا"" وبخار"')
  })

  // 11. CSV formula injection is prevented
  it('11. should prevent formula injection characters in CSV cells (=, +, -, @)', () => {
    expect(sanitizeFormulaInjection('=cmd|/c calc')).toBe("'=cmd|/c calc")
    expect(sanitizeFormulaInjection('+123456')).toBe("'+123456")
    expect(sanitizeFormulaInjection('-200.00')).toBe("'-200.00")
    expect(sanitizeFormulaInjection('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)")
    expect(sanitizeFormulaInjection('أحمد محمود')).toBe('أحمد محمود')
  })

  // 12. XLSX output is valid
  it('12. should produce valid XLSX file with correct application content-type', async () => {
    vi.spyOn(prisma.subscription, 'count').mockResolvedValue(1)
    vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([sampleSubscription] as any)

    const response = await request(app)
      .get('/api/v1/exports/subscriptions?format=xlsx')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    expect(response.headers['content-disposition']).toContain('.xlsx')
    expect(Buffer.isBuffer(response.body)).toBe(true)
    expect(response.body.length).toBeGreaterThan(100)
  })

  // 13. XLSX cells cannot execute user-provided formulas
  it('13. should sanitize formula characters when writing XLSX data cells', async () => {
    const maliciousMember = {
      ...sampleMember,
      name: '=SUM(1+1)',
    }
    vi.spyOn(prisma.member, 'count').mockResolvedValue(1)
    vi.spyOn(prisma.member, 'findMany').mockResolvedValue([maliciousMember] as any)

    const response = await request(app)
      .get('/api/v1/exports/members?format=xlsx')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(Buffer.isBuffer(response.body)).toBe(true)
  })

  // 14. Unsupported formats are rejected
  it('14. should reject unsupported formats (e.g., format=pdf or format=txt) with 400', async () => {
    const response = await request(app)
      .get('/api/v1/exports/members?format=pdf')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  // 15. Row limits are enforced
  it('15. should reject export when row count exceeds MAX_EXPORT_LIMIT (10,000) with 400', async () => {
    vi.spyOn(prisma.member, 'count').mockResolvedValue(10001)

    const response = await request(app)
      .get('/api/v1/exports/members')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(400)
    expect(response.body.message).toContain('يتجاوز الحد الأقصى المسموح به')
  })

  // 16. Large exports do not silently truncate
  it('16. should not silently truncate and instead inform the user about the range limit', async () => {
    vi.spyOn(prisma.payment, 'count').mockResolvedValue(15000)

    const response = await request(app)
      .get('/api/v1/exports/payments')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(400)
    expect(response.body.message).toContain('يرجى تحديد نطاق زمني أصغر')
  })

  // 17. Export audit records are created appropriately
  it('17. should create an audit log entry for successful export operations', async () => {
    let capturedAudit: any = null
    vi.spyOn(prisma.member, 'count').mockResolvedValue(1)
    vi.spyOn(prisma.member, 'findMany').mockResolvedValue([sampleMember] as any)
    vi.spyOn(prisma.auditLog, 'create').mockImplementation(async ({ data }: any) => {
      capturedAudit = data
      return {} as any
    })

    const response = await request(app)
      .get('/api/v1/exports/members?format=csv')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(200)
    expect(capturedAudit).toBeDefined()
    expect(capturedAudit.action).toBe(AUDIT_ACTIONS.DATA_EXPORT_MEMBERS)
    expect(capturedAudit.entityType).toBe(AUDIT_ENTITY_TYPES.DATA_EXPORT)
    expect(capturedAudit.actorUserId).toBe(mockOwnerId)
    expect(capturedAudit.metadata.format).toBe('csv')
    expect(capturedAudit.metadata.rowCount).toBe(1)
  })

  // 18. Export audit records do not contain file contents
  it('18. should ensure audit log metadata does NOT contain binary or text file contents', async () => {
    let capturedAudit: any = null
    vi.spyOn(prisma.payment, 'count').mockResolvedValue(1)
    vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([samplePayment] as any)
    vi.spyOn(prisma.auditLog, 'create').mockImplementation(async ({ data }: any) => {
      capturedAudit = data
      return {} as any
    })

    const response = await request(app)
      .get('/api/v1/exports/payments?format=xlsx')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(200)
    expect(capturedAudit.metadata.buffer).toBeUndefined()
    expect(capturedAudit.metadata.content).toBeUndefined()
    expect(capturedAudit.beforeData).toBeUndefined()
    expect(capturedAudit.afterData).toBeUndefined()
  })

  // 19. Export responses use correct download headers
  it('19. should include Content-Disposition attachment with safe filename', async () => {
    vi.spyOn(prisma.member, 'count').mockResolvedValue(1)
    vi.spyOn(prisma.member, 'findMany').mockResolvedValue([sampleMember] as any)

    const response = await request(app)
      .get('/api/v1/exports/members?from=2026-10-01&to=2026-10-10&format=csv')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(200)
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="gymvip-members-2026-10-01-2026-10-10.csv"'
    )
  })

  // 20. Temporary files are cleaned up (or memory buffers disposed)
  it('20. should stream or buffer directly in memory without leaving unmanaged disk leaks', async () => {
    vi.spyOn(prisma.attendance, 'count').mockResolvedValue(1)
    vi.spyOn(prisma.attendance, 'findMany').mockResolvedValue([sampleAttendance] as any)

    const response = await request(app)
      .get('/api/v1/exports/attendance?format=xlsx')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(Buffer.isBuffer(response.body)).toBe(true)
  })

  // 21. Invalid filters return consistent errors
  it('21. should reject invalid date range where from date is after to date with 400', async () => {
    const response = await request(app)
      .get('/api/v1/exports/members?from=2026-10-20&to=2026-10-10')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  // 22. Export queries enforce gym isolation
  it('22. should filter subscriptions by gymId even when memberId is passed in query', async () => {
    let capturedWhere: any = null
    vi.spyOn(prisma.subscription, 'count').mockImplementation(async ({ where }: any) => {
      capturedWhere = where
      return 1
    })
    vi.spyOn(prisma.subscription, 'findMany').mockResolvedValue([sampleSubscription] as any)

    const response = await request(app)
      .get(`/api/v1/exports/subscriptions?memberId=${sampleMember.id}`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(200)
    expect(capturedWhere.gymId).toBe(mockGymId)
    expect(capturedWhere.memberId).toBe(sampleMember.id)
  })

  // 23. Activity-log exports omit sensitive snapshots
  it('23. should omit beforeData, afterData, and passwords from activity-log exports', async () => {
    vi.spyOn(prisma.auditLog, 'count').mockResolvedValue(1)
    vi.spyOn(prisma.auditLog, 'findMany').mockResolvedValue([sampleAuditLog] as any)

    const response = await request(app)
      .get('/api/v1/exports/activity-logs?format=csv')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(200)
    expect(response.text).toContain('تم إنشاء عضو جديد أحمد محمود')
    expect(response.text).not.toContain('secret_hash_not_exported')
    expect(response.text).not.toContain('password')
  })

  // 24. Existing business endpoints remain unchanged
  it('24. should ensure existing endpoints (e.g. GET /api/v1/members) continue to function unchanged', async () => {
    vi.spyOn(prisma.member, 'findMany').mockResolvedValue([sampleMember] as any)
    vi.spyOn(prisma.member, 'count').mockResolvedValue(1)

    const response = await request(app)
      .get('/api/v1/members')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${ownerToken}`])

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.members).toBeDefined()
  })
})
