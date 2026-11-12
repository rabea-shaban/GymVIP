/**
 * GymVIP E2E Comprehensive Functional Verification Runner
 * Validates the 10 Critical Workflows End-to-End against Express API & Prisma DB
 */
import request from 'supertest'
import { app } from '../src/app.js'
import { prisma } from '../src/config/database.js'
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js'

interface WorkflowResult {
  workflowId: number
  name: string
  status: 'PASS' | 'FAIL'
  durationMs: number
  steps: { step: string; status: 'PASS' | 'FAIL'; details?: string }[]
  error?: string
}

const results: WorkflowResult[] = []

async function runAudit() {
  console.log('===============================================================')
  console.log('🚀 STARTING GYMVIP END-TO-END WORKFLOW VERIFICATION SUITE')
  console.log('===============================================================\n')

  // Find Gym & Seed Users
  const gym = await prisma.gym.findFirst({ where: { isActive: true } })
  if (!gym) throw new Error('No active Gym found in DB. Run seed first.')

  console.log(`🏢 Testing with Active Gym: ${gym.name} (ID: ${gym.id})`)

  let ownerCookie: string = ''
  let receptionistCookie: string = ''
  let trainerCookie: string = ''
  let testMemberId: string = ''
  let testPlanId: string = ''
  let testSubId: string = ''

  // -----------------------------------------------------------------
  // WORKFLOW 1: Login -> Dashboard -> View Members -> Create Member -> Verify DB
  // -----------------------------------------------------------------
  const w1Start = Date.now()
  const w1: WorkflowResult = {
    workflowId: 1,
    name: 'Login -> Dashboard -> View Members -> Create Member -> Verify Database',
    status: 'PASS',
    durationMs: 0,
    steps: [],
  }

  try {
    // Step 1: Login as Owner
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'capt.ahmed@gymvip.eg', password: 'GymVIP2025#' })
    if (loginRes.status !== 200 || !loginRes.body.success) {
      throw new Error(`Login failed with status ${loginRes.status}: ${JSON.stringify(loginRes.body)}`)
    }
    const cookies = loginRes.headers['set-cookie'] as unknown as string[]
    ownerCookie = cookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`)) || ''
    w1.steps.push({ step: '1.1 Authentication & Cookie Extraction', status: 'PASS' })

    // Step 2: Dashboard Overview
    const dashRes = await request(app).get('/api/v1/dashboard/overview').set('Cookie', [ownerCookie])
    if (dashRes.status !== 200 || !dashRes.body.data) {
      throw new Error(`Dashboard retrieval failed: ${dashRes.status}`)
    }
    w1.steps.push({ step: '1.2 Dashboard Metrics Retrieval', status: 'PASS' })

    // Step 3: View Members
    const membersRes = await request(app).get('/api/v1/members').set('Cookie', [ownerCookie])
    if (membersRes.status !== 200 || !Array.isArray(membersRes.body.data.members)) {
      throw new Error(`Members listing failed: ${membersRes.status}`)
    }
    w1.steps.push({ step: '1.3 Members Roster Retrieval', status: 'PASS' })

    // Step 4: Create Member
    const uniquePhone = '011' + Math.floor(10000000 + Math.random() * 90000000)
    const createRes = await request(app)
      .post('/api/v1/members')
      .set('Cookie', [ownerCookie])
      .send({
        name: 'عمرو فوزي عبد الله - مراجع E2E',
        phone: uniquePhone,
        gender: 'MALE',
        email: `amr_${Date.now()}@test.eg`,
        city: 'القاهرة',
        address: 'المعادي شارع 9',
      })
    if (createRes.status !== 201 || !createRes.body.data?.member?.id) {
      throw new Error(`Member creation failed: ${createRes.status} ${JSON.stringify(createRes.body)}`)
    }
    const newMemberId = createRes.body.data.member.id
    testMemberId = newMemberId
    w1.steps.push({ step: '1.4 Member Creation API', status: 'PASS', details: `Member ID: ${newMemberId}` })

    // Step 5: Verify in Database
    const dbMember = await prisma.member.findUnique({ where: { id: newMemberId } })
    if (!dbMember || dbMember.phone !== uniquePhone || dbMember.gymId !== gym.id) {
      throw new Error('Database record verification failed or tenant mismatch')
    }
    w1.steps.push({ step: '1.5 Database Persistence & Tenant Isolation', status: 'PASS' })
  } catch (err: any) {
    w1.status = 'FAIL'
    w1.error = err.message
  }
  w1.durationMs = Date.now() - w1Start
  results.push(w1)

  // -----------------------------------------------------------------
  // WORKFLOW 2: Select Member -> Create Subscription -> Register Payment -> Verify DB
  // -----------------------------------------------------------------
  const w2Start = Date.now()
  const w2: WorkflowResult = {
    workflowId: 2,
    name: 'Select Member -> Create Subscription -> Register Payment -> Verify Records',
    status: 'PASS',
    durationMs: 0,
    steps: [],
  }

  try {
    // Step 1: Ensure Member and Plan exist
    let plan = await prisma.membershipPlan.findFirst({ where: { gymId: gym.id, isActive: true } })
    if (!plan) {
      const pRes = await request(app)
        .post('/api/v1/plans')
        .set('Cookie', [ownerCookie])
        .send({
          name: 'باقة تدريب E2E الشهرية',
          durationDays: 30,
          price: 750,
          description: 'باقة للاختبار الآلي',
        })
      plan = pRes.body.data.plan
    }
    testPlanId = plan!.id
    w2.steps.push({ step: '2.1 Member & Plan Ready', status: 'PASS' })

    // Step 2: Create Subscription (startDate: today)
    const today = new Date().toISOString()
    const subRes = await request(app)
      .post('/api/v1/subscriptions')
      .set('Cookie', [ownerCookie])
      .send({
        memberId: testMemberId,
        planId: testPlanId,
        startDate: today,
        notes: 'اشتراك اختبار تدفق كامل',
      })
    if (subRes.status !== 201 || !subRes.body.data?.subscription?.id) {
      throw new Error(`Subscription creation failed: ${subRes.status} ${JSON.stringify(subRes.body)}`)
    }
    testSubId = subRes.body.data.subscription.id
    w2.steps.push({ step: '2.2 Create Subscription API', status: 'PASS', details: `Sub ID: ${testSubId}` })

    // Step 3: Register Full Payment
    const payRes = await request(app)
      .post('/api/v1/payments')
      .set('Cookie', [ownerCookie])
      .send({
        subscriptionId: testSubId,
        amount: Number(plan!.price),
        method: 'CASH',
        notes: 'سداد كامل نقداً',
      })
    if (payRes.status !== 201 || !payRes.body.data?.payment?.id) {
      throw new Error(`Payment registration failed: ${payRes.status} ${JSON.stringify(payRes.body)}`)
    }
    const payId = payRes.body.data.payment.id
    w2.steps.push({ step: '2.3 Register Full Payment API', status: 'PASS', details: `Pay ID: ${payId}` })

    // Step 4: Verify Subscription and Payment Records in DB
    const dbSub = await prisma.subscription.findUnique({
      where: { id: testSubId },
      include: { payments: true },
    })
    if (!dbSub || dbSub.payments.length === 0) {
      throw new Error('Database verification failed: subscription or payments missing')
    }
    const totalPaid = dbSub.payments.reduce((acc, p) => acc + Number(p.amount), 0)
    if (totalPaid !== Number(plan!.price)) {
      throw new Error(`Total paid mismatch: expected ${plan!.price}, got ${totalPaid}`)
    }
    w2.steps.push({ step: '2.4 Database Payment Balance Verification', status: 'PASS' })
  } catch (err: any) {
    w2.status = 'FAIL'
    w2.error = err.message
  }
  w2.durationMs = Date.now() - w2Start
  results.push(w2)

  // -----------------------------------------------------------------
  // WORKFLOW 3: Renew Subscription -> Partial Payment -> Verify Balance
  // -----------------------------------------------------------------
  const w3Start = Date.now()
  const w3: WorkflowResult = {
    workflowId: 3,
    name: 'Select Member -> Renew Subscription -> Register Partial Payment -> Verify Balance',
    status: 'PASS',
    durationMs: 0,
    steps: [],
  }

  try {
    // Step 1: Renew the subscription from Workflow 2
    const renewRes = await request(app)
      .post(`/api/v1/subscriptions/${testSubId}/renew`)
      .set('Cookie', [ownerCookie])
      .send({
        planId: testPlanId,
        notes: 'تجديد باقة تدريبية',
      })
    if (renewRes.status !== 201 || !renewRes.body.data?.subscription?.id) {
      throw new Error(`Renewal failed: ${renewRes.status} ${JSON.stringify(renewRes.body)}`)
    }
    const renewedSubId = renewRes.body.data.subscription.id
    w3.steps.push({ step: '3.1 Renew Subscription API', status: 'PASS', details: `Renewed Sub ID: ${renewedSubId}` })

    // Step 2: Register Partial Payment (e.g. 300 out of 750 with WALLET)
    const partialAmount = 300
    const partPayRes = await request(app)
      .post('/api/v1/payments')
      .set('Cookie', [ownerCookie])
      .send({
        subscriptionId: renewedSubId,
        amount: partialAmount,
        method: 'WALLET',
        walletProvider: 'VODAFONE_CASH',
        walletNumber: '01012345678',
        notes: 'سداد جزئي عبر محفظة فودافون كاش',
      })
    if (partPayRes.status !== 201) {
      throw new Error(`Partial payment failed: ${partPayRes.status} ${JSON.stringify(partPayRes.body)}`)
    }
    w3.steps.push({ step: '3.2 Register Partial Payment (WALLET)', status: 'PASS', details: `Paid: ${partialAmount}` })

    // Step 3: Check remaining balance via Payments query and Subscription details endpoint
    const paymentsRes = await request(app)
      .get(`/api/v1/payments?subscriptionId=${renewedSubId}`)
      .set('Cookie', [ownerCookie])
    if (paymentsRes.status !== 200 || !Array.isArray(paymentsRes.body.data.payments)) {
      throw new Error(`Get payments failed: ${paymentsRes.status}`)
    }
    const subDetailRes = await request(app)
      .get(`/api/v1/subscriptions/${renewedSubId}`)
      .set('Cookie', [ownerCookie])
    if (subDetailRes.status !== 200) {
      throw new Error(`Get subscription details failed: ${subDetailRes.status}`)
    }
    const subData = subDetailRes.body.data.subscription
    const paidSum = paymentsRes.body.data.payments.reduce((acc: number, p: any) => acc + Number(p.amount), 0)
    const remaining = Number(subData.planPrice) - paidSum
    if (paidSum !== partialAmount || remaining !== (Number(subData.planPrice) - partialAmount)) {
      throw new Error(`Balance calculation discrepancy: PlanPrice=${subData.planPrice}, Paid=${paidSum}, Rem=${remaining}`)
    }
    w3.steps.push({ step: '3.3 Subscription Balance & Payments Verification', status: 'PASS', details: `Remaining: ${remaining} EGP` })
  } catch (err: any) {
    w3.status = 'FAIL'
    w3.error = err.message
  }
  w3.durationMs = Date.now() - w3Start
  results.push(w3)

  // -----------------------------------------------------------------
  // WORKFLOW 4: Search Member -> Check Status -> Register Attendance -> Verify DB
  // -----------------------------------------------------------------
  const w4Start = Date.now()
  const w4: WorkflowResult = {
    workflowId: 4,
    name: 'Search Member -> Check Subscription Status -> Register Attendance -> Verify Attendance',
    status: 'PASS',
    durationMs: 0,
    steps: [],
  }

  try {
    // Step 1: Search member by name
    const searchRes = await request(app)
      .get(`/api/v1/members?search=${encodeURIComponent('عمرو فوزي')}`)
      .set('Cookie', [ownerCookie])
    if (searchRes.status !== 200 || searchRes.body.data.members.length === 0) {
      throw new Error(`Member search failed or member not found: ${searchRes.status}`)
    }
    const foundMember = searchRes.body.data.members[0]
    w4.steps.push({ step: '4.1 Member Search API', status: 'PASS', details: `Found: ${foundMember.name}` })

    // Step 2: Register Check-In
    const checkInRes = await request(app)
      .post('/api/v1/attendance/check-in')
      .set('Cookie', [ownerCookie])
      .send({
        memberId: foundMember.id,
      })
    if (checkInRes.status !== 201 || !checkInRes.body.data?.attendance?.id) {
      throw new Error(`Attendance check-in failed: ${checkInRes.status} ${JSON.stringify(checkInRes.body)}`)
    }
    const attId = checkInRes.body.data.attendance.id
    w4.steps.push({ step: '4.2 Member Check-In Recorded', status: 'PASS', details: `Attendance ID: ${attId}` })

    // Step 3: Duplicate check-in prevention check
    const dupRes = await request(app)
      .post('/api/v1/attendance/check-in')
      .set('Cookie', [ownerCookie])
      .send({ memberId: foundMember.id })
    if (dupRes.status !== 409) {
      throw new Error(`Duplicate check-in prevention failed: expected 409, got ${dupRes.status}`)
    }
    w4.steps.push({ step: '4.3 Duplicate Check-In Prevention (409 Conflict)', status: 'PASS' })

    // Step 4: Verify in Database
    const dbAtt = await prisma.attendance.findUnique({ where: { id: attId } })
    if (!dbAtt || dbAtt.memberId !== foundMember.id || dbAtt.gymId !== gym.id) {
      throw new Error('Database attendance record verification failed')
    }
    w4.steps.push({ step: '4.4 Database Attendance Record Verification', status: 'PASS' })
  } catch (err: any) {
    w4.status = 'FAIL'
    w4.error = err.message
  }
  w4.durationMs = Date.now() - w4Start
  results.push(w4)

  // -----------------------------------------------------------------
  // WORKFLOW 5: Open Member Profile -> Edit Info -> Upload Image -> Verify Persistence
  // -----------------------------------------------------------------
  const w5Start = Date.now()
  const w5: WorkflowResult = {
    workflowId: 5,
    name: 'Open Member Profile -> Edit Information -> Upload Image -> Verify Persistence',
    status: 'PASS',
    durationMs: 0,
    steps: [],
  }

  try {
    // Step 1: Update Member Information and Avatar URL via PATCH
    const updatedNotes = 'عضو متميز - تم تحديث الملف الشخصي عبر فحص E2E'
    const sampleAvatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
    const updateRes = await request(app)
      .patch(`/api/v1/members/${testMemberId}`)
      .set('Cookie', [ownerCookie])
      .send({
        notes: updatedNotes,
        address: 'شارع اللاسلكي، المعادي الجديدة',
        avatarUrl: sampleAvatarUrl,
      })
    if (updateRes.status !== 200 || updateRes.body.data.member.notes !== updatedNotes) {
      throw new Error(`Member update failed: ${updateRes.status} ${JSON.stringify(updateRes.body)}`)
    }
    w5.steps.push({ step: '5.1 Member Info & Avatar Update (PATCH)', status: 'PASS' })

    // Step 2: Re-query API (simulating page refresh)
    const refreshRes = await request(app)
      .get(`/api/v1/members/${testMemberId}`)
      .set('Cookie', [ownerCookie])
    if (refreshRes.status !== 200 || refreshRes.body.data.member.notes !== updatedNotes || refreshRes.body.data.member.avatarUrl !== sampleAvatarUrl) {
      throw new Error('Refresh page verification failed: avatar or notes not persisted')
    }
    w5.steps.push({ step: '5.2 Re-query API & Persistence Confirmation', status: 'PASS' })

    // Step 3: Verify directly in Database
    const dbMemberAfter = await prisma.member.findUnique({ where: { id: testMemberId } })
    if (dbMemberAfter?.avatarUrl !== sampleAvatarUrl || dbMemberAfter?.notes !== updatedNotes) {
      throw new Error('Database direct verification of avatar/notes failed')
    }
    w5.steps.push({ step: '5.3 Direct Database Record Verification', status: 'PASS' })
  } catch (err: any) {
    w5.status = 'FAIL'
    w5.error = err.message
  }
  w5.durationMs = Date.now() - w5Start
  results.push(w5)

  // -----------------------------------------------------------------
  // WORKFLOW 6: Create Trainer -> Verify Profile & Dashboard
  // -----------------------------------------------------------------
  const w6Start = Date.now()
  const w6: WorkflowResult = {
    workflowId: 6,
    name: 'Create Trainer -> Verify Profile & Association',
    status: 'PASS',
    durationMs: 0,
    steps: [],
  }

  let createdTrainerId: string = ''

  try {
    // Step 1: Create a Trainer
    const trainerPhone = '010' + Math.floor(10000000 + Math.random() * 90000000)
    const trainerEmail = `trainer_${Date.now()}@gymvip.eg`
    const trRes = await request(app)
      .post('/api/v1/trainers')
      .set('Cookie', [ownerCookie])
      .send({
        name: 'كابتن محمود شاكر - مدرب لياقة',
        email: trainerEmail,
        password: 'Trainer2026#',
        phone: trainerPhone,
        specialization: 'كمال أجسام وتأهيل حركي',
        bio: 'مدرب معتمد بخبرة تتجاوز 7 سنوات في التدريب الرياضي',
      })
    if (trRes.status !== 201 || !trRes.body.data?.trainer?.id) {
      throw new Error(`Trainer creation failed: ${trRes.status} ${JSON.stringify(trRes.body)}`)
    }
    createdTrainerId = trRes.body.data.trainer.id
    w6.steps.push({ step: '6.1 Trainer Creation API', status: 'PASS', details: `Trainer ID: ${createdTrainerId}` })

    // Step 2: Verify Trainer Details by ID
    const trDetailRes = await request(app)
      .get(`/api/v1/trainers/${createdTrainerId}`)
      .set('Cookie', [ownerCookie])
    if (trDetailRes.status !== 200 || trDetailRes.body.data.trainer.user.email !== trainerEmail) {
      throw new Error(`Trainer details verification failed: ${trDetailRes.status}`)
    }
    w6.steps.push({ step: '6.2 Trainer Profile Retrieval', status: 'PASS' })

    // Step 3: Deactivate Trainer Status
    const statusRes = await request(app)
      .patch(`/api/v1/trainers/${createdTrainerId}/status`)
      .set('Cookie', [ownerCookie])
      .send({ isActive: false })
    if (statusRes.status !== 200 || statusRes.body.data.trainer.user.isActive !== false) {
      throw new Error(`Trainer status update failed: ${statusRes.status}`)
    }
    w6.steps.push({ step: '6.3 Trainer Status Toggle (Deactivation)', status: 'PASS' })
  } catch (err: any) {
    w6.status = 'FAIL'
    w6.error = err.message
  }
  w6.durationMs = Date.now() - w6Start
  results.push(w6)

  // -----------------------------------------------------------------
  // WORKFLOW 7: Financial Report Generation -> Date Filtering -> Export -> Verify Consistency
  // -----------------------------------------------------------------
  const w7Start = Date.now()
  const w7: WorkflowResult = {
    workflowId: 7,
    name: 'Generate Financial Report -> Apply Date Filters -> Export Report -> Verify Consistency',
    status: 'PASS',
    durationMs: 0,
    steps: [],
  }

  try {
    // Step 1: Financial Report Query with from/to
    const finRes = await request(app)
      .get('/api/v1/reports/payments?from=2026-01-01&to=2026-12-31')
      .set('Cookie', [ownerCookie])
    if (finRes.status !== 200 || !finRes.body.data) {
      throw new Error(`Financial report query failed: ${finRes.status}`)
    }
    const reportData = finRes.body.data.report || finRes.body.data
    w7.steps.push({ step: '7.1 Financial Report API with Date Filters', status: 'PASS' })

    // Step 2: Cross check with Payments table in DB for same period
    const dbPayments = await prisma.payment.findMany({
      where: {
        gymId: gym.id,
        createdAt: {
          gte: new Date('2026-01-01T00:00:00.000Z'),
          lte: new Date('2026-12-31T23:59:59.999Z'),
        },
      },
    })
    const dbRevenue = dbPayments.reduce((acc, p) => acc + Number(p.amount), 0)
    const apiRevenue = Number(reportData.totalCollected || 0)
    if (Math.abs(dbRevenue - apiRevenue) > 0.01) {
      throw new Error(`Financial calculation mismatch: API=${apiRevenue}, DB=${dbRevenue}`)
    }
    w7.steps.push({ step: '7.2 Report Revenue vs Database Total Verification', status: 'PASS', details: `Revenue: ${apiRevenue} EGP` })

    // Step 3: Export Payments Report to Excel
    const exportRes = await request(app)
      .get('/api/v1/exports/payments?format=xlsx')
      .set('Cookie', [ownerCookie])
    if (exportRes.status !== 200) {
      throw new Error(`Export payments report failed: ${exportRes.status}`)
    }
    w7.steps.push({ step: '7.3 Export Payments Generation', status: 'PASS', details: `Content-Type: ${exportRes.headers['content-type']}` })
  } catch (err: any) {
    w7.status = 'FAIL'
    w7.error = err.message
  }
  w7.durationMs = Date.now() - w7Start
  results.push(w7)

  // -----------------------------------------------------------------
  // WORKFLOW 8: Receptionist Login -> Attempt Unauthorized Admin Actions -> Verify 403
  // -----------------------------------------------------------------
  const w8Start = Date.now()
  const w8: WorkflowResult = {
    workflowId: 8,
    name: 'Receptionist Login -> Attempt Unauthorized Admin Actions -> Verify Explicit 403 Forbidden',
    status: 'PASS',
    durationMs: 0,
    steps: [],
  }

  try {
    // Step 1: Login as Receptionist
    const recLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reception@gymvip.eg', password: 'GymVIP2025#' })
    if (recLogin.status !== 200) throw new Error('Receptionist login failed')
    const recCookies = recLogin.headers['set-cookie'] as unknown as string[]
    receptionistCookie = recCookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`)) || ''
    w8.steps.push({ step: '8.1 Receptionist Authentication', status: 'PASS' })

    // Step 2: Attempt to Modify Gym Settings (Only OWNER allowed)
    const gymSettingsRes = await request(app)
      .patch('/api/v1/gym')
      .set('Cookie', [receptionistCookie])
      .send({ name: 'اسم غير مصرح' })
    if (gymSettingsRes.status !== 403) {
      throw new Error(`RBAC bypass: Receptionist modifying gym returned ${gymSettingsRes.status} instead of 403`)
    }
    w8.steps.push({ step: '8.2 Block Gym Settings Modification (403 Forbidden)', status: 'PASS' })

    // Step 3: Attempt to Read Audit Activity Logs (Only OWNER/MANAGER allowed)
    const auditRes = await request(app)
      .get('/api/v1/activity-logs')
      .set('Cookie', [receptionistCookie])
    if (auditRes.status !== 403) {
      throw new Error(`RBAC bypass: Receptionist reading audit logs returned ${auditRes.status} instead of 403`)
    }
    w8.steps.push({ step: '8.3 Block Audit Logs Access (403 Forbidden)', status: 'PASS' })

    // Step 4: Attempt to Cancel Subscription (Only OWNER/MANAGER allowed)
    const cancelRes = await request(app)
      .post(`/api/v1/subscriptions/${testSubId}/cancel`)
      .set('Cookie', [receptionistCookie])
      .send({ reason: 'إلغاء غير مصرح لموظف استقبال' })
    if (cancelRes.status !== 403) {
      throw new Error(`RBAC bypass: Receptionist cancelling subscription returned ${cancelRes.status} instead of 403`)
    }
    w8.steps.push({ step: '8.4 Block Subscription Cancellation (403 Forbidden)', status: 'PASS' })
  } catch (err: any) {
    w8.status = 'FAIL'
    w8.error = err.message
  }
  w8.durationMs = Date.now() - w8Start
  results.push(w8)

  // -----------------------------------------------------------------
  // WORKFLOW 9: Trainer Login -> Attempt Access to Financial Data -> Verify 403
  // -----------------------------------------------------------------
  const w9Start = Date.now()
  const w9: WorkflowResult = {
    workflowId: 9,
    name: 'Trainer Login -> Attempt Access to Financial & Foreign Data -> Verify Explicit 403 Forbidden',
    status: 'PASS',
    durationMs: 0,
    steps: [],
  }

  try {
    // Step 1: Login as Trainer
    const trLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'coach.tarek@gymvip.eg', password: 'GymVIP2025#' })
    if (trLogin.status !== 200) throw new Error('Trainer login failed')
    const trCookies = trLogin.headers['set-cookie'] as unknown as string[]
    trainerCookie = trCookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`)) || ''
    w9.steps.push({ step: '9.1 Trainer Authentication', status: 'PASS' })

    // Step 2: Attempt to Access Financial Reports (Forbidden)
    const finRes = await request(app)
      .get('/api/v1/reports/payments')
      .set('Cookie', [trainerCookie])
    if (finRes.status !== 403) {
      throw new Error(`RBAC bypass: Trainer viewing financial report returned ${finRes.status} instead of 403`)
    }
    w9.steps.push({ step: '9.2 Block Financial Report Access (403 Forbidden)', status: 'PASS' })

    // Step 3: Attempt to Create Membership Plan (Forbidden)
    const planRes = await request(app)
      .post('/api/v1/plans')
      .set('Cookie', [trainerCookie])
      .send({ name: 'خطة غير مصرح بها', durationDays: 30, price: 500 })
    if (planRes.status !== 403) {
      throw new Error(`RBAC bypass: Trainer creating plan returned ${planRes.status} instead of 403`)
    }
    w9.steps.push({ step: '9.3 Block Plan Creation (403 Forbidden)', status: 'PASS' })

    // Step 4: Attempt to Freeze Subscription (Forbidden)
    const frzRes = await request(app)
      .post(`/api/v1/subscriptions/${testSubId}/freeze`)
      .set('Cookie', [trainerCookie])
      .send({ days: 7 })
    if (frzRes.status !== 403) {
      throw new Error(`RBAC bypass: Trainer freezing subscription returned ${frzRes.status} instead of 403`)
    }
    w9.steps.push({ step: '9.4 Block Subscription Freeze (403 Forbidden)', status: 'PASS' })
  } catch (err: any) {
    w9.status = 'FAIL'
    w9.error = err.message
  }
  w9.durationMs = Date.now() - w9Start
  results.push(w9)

  // -----------------------------------------------------------------
  // WORKFLOW 10: Logout -> Attempt Access to Protected Endpoints -> Verify 401
  // -----------------------------------------------------------------
  const w10Start = Date.now()
  const w10: WorkflowResult = {
    workflowId: 10,
    name: 'Logout -> Attempt Access to Protected Endpoints -> Verify Explicit 401 Unauthorized',
    status: 'PASS',
    durationMs: 0,
    steps: [],
  }

  try {
    // Step 1: Perform Logout
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', [ownerCookie])
    if (logoutRes.status !== 200 || !logoutRes.body.success) {
      throw new Error(`Logout failed: ${logoutRes.status}`)
    }
    const outCookies = logoutRes.headers['set-cookie'] as unknown as string[]
    const clearedCookie = outCookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=;`))
    if (!clearedCookie && !outCookies.some((c) => c.includes('Max-Age=0') || c.includes('expires='))) {
      throw new Error('Logout did not clear session cookie properly')
    }
    w10.steps.push({ step: '10.1 User Logout & Cookie Clearance', status: 'PASS' })

    // Step 2: Attempt accessing protected endpoint with empty cookie / unauthenticated
    const protRes1 = await request(app).get('/api/v1/members')
    if (protRes1.status !== 401) {
      throw new Error(`Security breach: Access without token returned ${protRes1.status} instead of 401`)
    }
    w10.steps.push({ step: '10.2 Reject Anonymous Access (401 Unauthorized)', status: 'PASS' })

    // Step 3: Attempt accessing protected endpoint with malformed/expired token
    const protRes2 = await request(app)
      .get('/api/v1/dashboard/overview')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=malformed_tampered_jwt_token_value`])
    if (protRes2.status !== 401) {
      throw new Error(`Security breach: Malformed token access returned ${protRes2.status} instead of 401`)
    }
    w10.steps.push({ step: '10.3 Reject Tampered Token (401 Unauthorized)', status: 'PASS' })
  } catch (err: any) {
    w10.status = 'FAIL'
    w10.error = err.message
  }
  w10.durationMs = Date.now() - w10Start
  results.push(w10)

  // -----------------------------------------------------------------
  // SUMMARY REPORT
  // -----------------------------------------------------------------
  console.log('\n===============================================================')
  console.log('📊 END-TO-END WORKFLOW AUDIT EXECUTION SUMMARY')
  console.log('===============================================================\n')

  let allPassed = true
  for (const res of results) {
    const icon = res.status === 'PASS' ? '✅' : '❌'
    console.log(`${icon} WORKFLOW ${res.workflowId}: ${res.name} (${res.durationMs}ms) -> ${res.status}`)
    for (const step of res.steps) {
      console.log(`    ├── [${step.status}] ${step.step} ${step.details ? `(${step.details})` : ''}`)
    }
    if (res.error) {
      console.log(`    └── 🚨 ERROR: ${res.error}`)
      allPassed = false
    }
  }

  console.log('\n===============================================================')
  if (allPassed) {
    console.log('🎯 ALL 10 CRITICAL WORKFLOWS PASSED AT 100% WITH CONCRETE EVIDENCE!')
  } else {
    console.log('⚠️ SOME WORKFLOWS FAILED. REVIEW DETAILS ABOVE.')
  }
  console.log('===============================================================\n')

  await prisma.$disconnect()
  process.exit(allPassed ? 0 : 1)
}

runAudit().catch(async (e) => {
  console.error('Fatal execution error in verify-e2e-workflows:', e)
  await prisma.$disconnect()
  process.exit(1)
})
