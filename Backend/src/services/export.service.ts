import { prisma } from '../config/database.js'
import { AppError } from '../utils/appError.util.js'
import {
  generateCsv,
  generateXlsx,
  formatCairoDate,
  formatCairoDateTime,
} from '../utils/export.util.js'
import { getCairoBusinessDayRange } from '../utils/date.util.js'
import { createAuditLog } from './audit.service.js'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../types/audit.types.js'
import type {
  ExportFilterQuery,
  ExportResult,
  ExportFormat,
  ExportColumn,
} from '../types/export.types.js'

export type { ExportResult }

export const MAX_EXPORT_LIMIT = 10000

/**
 * Helper to construct Cairo timezone date range filter
 */
function buildDateRangeFilter(from?: string, to?: string) {
  const filter: any = {}
  if (from) {
    const { startOfDay } = getCairoBusinessDayRange(from)
    filter.gte = startOfDay
  }
  if (to) {
    const { endOfDay } = getCairoBusinessDayRange(to)
    filter.lte = endOfDay
  }
  return Object.keys(filter).length > 0 ? filter : undefined
}

/**
 * Builds filename with timestamp or date range
 */
function buildFilename(type: string, format: ExportFormat, from?: string, to?: string): string {
  if (from && to) {
    return `gymvip-${type}-${from}-${to}.${format}`
  }
  if (from) {
    return `gymvip-${type}-from-${from}.${format}`
  }
  if (to) {
    return `gymvip-${type}-to-${to}.${format}`
  }
  const today = formatCairoDate(new Date())
  return `gymvip-${type}-${today}.${format}`
}

function getContentType(format: ExportFormat): string {
  return format === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv; charset=utf-8'
}

/**
 * Export Members
 */
export async function exportMembers(
  gymId: string,
  filter: ExportFilterQuery,
  actorUserId?: string
): Promise<ExportResult> {
  const format: ExportFormat = filter.format === 'xlsx' ? 'xlsx' : 'csv'
  const where: any = { gymId }

  const dateFilter = buildDateRangeFilter(filter.from, filter.to)
  if (dateFilter) {
    where.createdAt = dateFilter
  }

  if (filter.status) {
    if (filter.status.toUpperCase() === 'ACTIVE') where.isActive = true
    if (filter.status.toUpperCase() === 'INACTIVE') where.isActive = false
  }

  if (filter.search?.trim()) {
    const searchPattern = filter.search.trim()
    where.OR = [
      { name: { contains: searchPattern } },
      { phone: { contains: searchPattern } },
      { memberCode: { contains: searchPattern } },
    ]
  }

  const count = await prisma.member.count({ where })
  if (count > MAX_EXPORT_LIMIT) {
    throw AppError.badRequest(
      `عدد السجلات المطلوب تصديرها (${count}) يتجاوز الحد الأقصى المسموح به (${MAX_EXPORT_LIMIT} سجل)، يرجى تحديد نطاق زمني أصغر / Export exceeds max limit of ${MAX_EXPORT_LIMIT} rows`
    )
  }

  const members = await prisma.member.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  const columns: ExportColumn[] = [
    { header: 'كود العضو', key: 'memberCode', width: 16 },
    { header: 'الاسم', key: 'name', width: 25 },
    { header: 'رقم الهاتف', key: 'phone', width: 16 },
    { header: 'البريد الإلكتروني', key: 'email', width: 25 },
    { header: 'الجنس', key: 'gender', width: 12 },
    { header: 'تاريخ الميلاد', key: 'birthDate', width: 16 },
    { header: 'الحالة', key: 'status', width: 14 },
    { header: 'تاريخ التسجيل', key: 'createdAt', width: 20 },
  ]

  const data = members.map((m) => ({
    memberCode: m.memberCode,
    name: m.name,
    phone: m.phone,
    email: m.email || '-',
    gender: m.gender === 'MALE' ? 'ذكر' : m.gender === 'FEMALE' ? 'أنثى' : '-',
    birthDate: m.dateOfBirth ? formatCairoDate(m.dateOfBirth) : '-',
    status: m.isActive ? 'نشط' : 'غير نشط',
    createdAt: formatCairoDateTime(m.createdAt),
  }))

  const buffer =
    format === 'xlsx'
      ? await generateXlsx('الأعضاء', columns, data)
      : generateCsv(columns, data)

  const filename = buildFilename('members', format, filter.from, filter.to)

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.DATA_EXPORT_MEMBERS,
    entityType: AUDIT_ENTITY_TYPES.DATA_EXPORT,
    description: `تم تصدير بيانات الأعضاء بصيغة (${format.toUpperCase()}) بعدد (${members.length}) سجل`,
    metadata: {
      format,
      rowCount: members.length,
      from: filter.from ?? null,
      to: filter.to ?? null,
    },
  })

  return {
    buffer,
    filename,
    contentType: getContentType(format),
    rowCount: members.length,
    format,
  }
}

/**
 * Export Subscriptions
 */
export async function exportSubscriptions(
  gymId: string,
  filter: ExportFilterQuery,
  actorUserId?: string
): Promise<ExportResult> {
  const format: ExportFormat = filter.format === 'xlsx' ? 'xlsx' : 'csv'
  const where: any = { gymId }

  const dateFilter = buildDateRangeFilter(filter.from, filter.to)
  if (dateFilter) {
    where.createdAt = dateFilter
  }

  if (filter.status?.trim()) {
    where.status = filter.status.trim().toUpperCase()
  }

  if (filter.memberId?.trim()) {
    where.memberId = filter.memberId.trim()
  }

  if (filter.search?.trim()) {
    const searchPattern = filter.search.trim()
    where.OR = [
      { member: { name: { contains: searchPattern } } },
      { member: { phone: { contains: searchPattern } } },
      { member: { memberCode: { contains: searchPattern } } },
      { planName: { contains: searchPattern } },
    ]
  }

  const count = await prisma.subscription.count({ where })
  if (count > MAX_EXPORT_LIMIT) {
    throw AppError.badRequest(
      `عدد السجلات المطلوب تصديرها (${count}) يتجاوز الحد الأقصى المسموح به (${MAX_EXPORT_LIMIT} سجل)، يرجى تحديد نطاق زمني أصغر / Export exceeds max limit of ${MAX_EXPORT_LIMIT} rows`
    )
  }

  const subscriptions = await prisma.subscription.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      member: true,
    },
  })

  const columns: ExportColumn[] = [
    { header: 'اسم العضو', key: 'memberName', width: 25 },
    { header: 'كود العضو', key: 'memberCode', width: 16 },
    { header: 'اسم الباقة', key: 'planName', width: 24 },
    { header: 'سعر الاشتراك الأصلي', key: 'planPrice', width: 18 },
    { header: 'تاريخ البداية', key: 'startDate', width: 16 },
    { header: 'تاريخ النهاية', key: 'endDate', width: 16 },
    { header: 'الحالة', key: 'status', width: 14 },
    { header: 'تاريخ الإنشاء', key: 'createdAt', width: 20 },
  ]

  const statusMap: Record<string, string> = {
    ACTIVE: 'نشط',
    FROZEN: 'مجمد',
    EXPIRED: 'منتهي',
    CANCELLED: 'ملغي',
  }

  const data = subscriptions.map((s) => ({
    memberName: s.member?.name || '-',
    memberCode: s.member?.memberCode || '-',
    planName: s.planName,
    planPrice: `${Number(s.planPrice).toFixed(2)} ج.م`,
    startDate: formatCairoDate(s.startDate),
    endDate: formatCairoDate(s.endDate),
    status: statusMap[s.status] || s.status,
    createdAt: formatCairoDateTime(s.createdAt),
  }))

  const buffer =
    format === 'xlsx'
      ? await generateXlsx('الاشتراكات', columns, data)
      : generateCsv(columns, data)

  const filename = buildFilename('subscriptions', format, filter.from, filter.to)

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.DATA_EXPORT_SUBSCRIPTIONS,
    entityType: AUDIT_ENTITY_TYPES.DATA_EXPORT,
    description: `تم تصدير بيانات الاشتراكات بصيغة (${format.toUpperCase()}) بعدد (${subscriptions.length}) سجل`,
    metadata: {
      format,
      rowCount: subscriptions.length,
      from: filter.from ?? null,
      to: filter.to ?? null,
    },
  })

  return {
    buffer,
    filename,
    contentType: getContentType(format),
    rowCount: subscriptions.length,
    format,
  }
}

/**
 * Export Payments
 */
export async function exportPayments(
  gymId: string,
  filter: ExportFilterQuery,
  actorUserId?: string
): Promise<ExportResult> {
  const format: ExportFormat = filter.format === 'xlsx' ? 'xlsx' : 'csv'
  const where: any = { gymId }

  const dateFilter = buildDateRangeFilter(filter.from, filter.to)
  if (dateFilter) {
    where.createdAt = dateFilter
  }

  const methodFilter = filter.paymentMethod || filter.method
  if (methodFilter?.trim()) {
    where.method = methodFilter.trim().toUpperCase()
  }

  if (filter.memberId?.trim()) {
    where.memberId = filter.memberId.trim()
  }

  if (filter.search?.trim()) {
    const searchPattern = filter.search.trim()
    where.OR = [
      { member: { name: { contains: searchPattern } } },
      { member: { phone: { contains: searchPattern } } },
      { member: { memberCode: { contains: searchPattern } } },
      { transactionReference: { contains: searchPattern } },
    ]
  }

  const count = await prisma.payment.count({ where })
  if (count > MAX_EXPORT_LIMIT) {
    throw AppError.badRequest(
      `عدد السجلات المطلوب تصديرها (${count}) يتجاوز الحد الأقصى المسموح به (${MAX_EXPORT_LIMIT} سجل)، يرجى تحديد نطاق زمني أصغر / Export exceeds max limit of ${MAX_EXPORT_LIMIT} rows`
    )
  }

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      member: true,
    },
  })

  const columns: ExportColumn[] = [
    { header: 'رقم العملية', key: 'paymentId', width: 36 },
    { header: 'اسم العضو', key: 'memberName', width: 25 },
    { header: 'كود العضو', key: 'memberCode', width: 16 },
    { header: 'مبلغ الدفع', key: 'amount', width: 16 },
    { header: 'العملة', key: 'currency', width: 12 },
    { header: 'طريقة الدفع', key: 'method', width: 16 },
    { header: 'مزود المحفظة عند وجوده', key: 'walletProvider', width: 22 },
    { header: 'مرجع العملية عند وجوده', key: 'referenceNumber', width: 22 },
    { header: 'تاريخ الدفع', key: 'createdAt', width: 20 },
  ]

  const walletProviderMap: Record<string, string> = {
    VODAFONE_CASH: 'فودافون كاش',
    ORANGE_CASH: 'أورنج كاش',
    ETISALAT_CASH: 'اتصالات كاش',
    WE: 'وي باي',
    INSTAPAY: 'إنستاباي',
    OTHER: 'محفظة أخرى',
  }

  const data = payments.map((p) => ({
    paymentId: p.id,
    memberName: p.member?.name || '-',
    memberCode: p.member?.memberCode || '-',
    amount: Number(p.amount).toFixed(2),
    currency: p.currency || 'EGP',
    method: p.method === 'CASH' ? 'نقدي' : 'محفظة إلكترونية',
    walletProvider: p.walletProvider ? walletProviderMap[p.walletProvider] || p.walletProvider : '-',
    referenceNumber: p.transactionReference || '-',
    createdAt: formatCairoDateTime(p.createdAt),
  }))

  const buffer =
    format === 'xlsx'
      ? await generateXlsx('المدفوعات', columns, data)
      : generateCsv(columns, data)

  const filename = buildFilename('payments', format, filter.from, filter.to)

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.DATA_EXPORT_PAYMENTS,
    entityType: AUDIT_ENTITY_TYPES.DATA_EXPORT,
    description: `تم تصدير سجل المدفوعات بصيغة (${format.toUpperCase()}) بعدد (${payments.length}) سجل`,
    metadata: {
      format,
      rowCount: payments.length,
      from: filter.from ?? null,
      to: filter.to ?? null,
    },
  })

  return {
    buffer,
    filename,
    contentType: getContentType(format),
    rowCount: payments.length,
    format,
  }
}

/**
 * Export Attendance
 */
export async function exportAttendance(
  gymId: string,
  filter: ExportFilterQuery,
  actorUserId?: string
): Promise<ExportResult> {
  const format: ExportFormat = filter.format === 'xlsx' ? 'xlsx' : 'csv'
  const where: any = { gymId }

  const dateFilter = buildDateRangeFilter(filter.from, filter.to)
  if (dateFilter) {
    where.checkInAt = dateFilter
  }

  if (filter.memberId?.trim()) {
    where.memberId = filter.memberId.trim()
  }

  if (filter.search?.trim()) {
    const searchPattern = filter.search.trim()
    where.OR = [
      { member: { name: { contains: searchPattern } } },
      { member: { phone: { contains: searchPattern } } },
      { member: { memberCode: { contains: searchPattern } } },
    ]
  }

  const count = await prisma.attendance.count({ where })
  if (count > MAX_EXPORT_LIMIT) {
    throw AppError.badRequest(
      `عدد السجلات المطلوب تصديرها (${count}) يتجاوز الحد الأقصى المسموح به (${MAX_EXPORT_LIMIT} سجل)، يرجى تحديد نطاق زمني أصغر / Export exceeds max limit of ${MAX_EXPORT_LIMIT} rows`
    )
  }

  const attendances = await prisma.attendance.findMany({
    where,
    orderBy: { checkInAt: 'desc' },
    include: {
      member: true,
    },
  })

  const columns: ExportColumn[] = [
    { header: 'اسم العضو', key: 'memberName', width: 25 },
    { header: 'كود العضو', key: 'memberCode', width: 16 },
    { header: 'وقت تسجيل الحضور', key: 'checkInAt', width: 20 },
    { header: 'وقت تسجيل الانصراف', key: 'checkOutAt', width: 20 },
    { header: 'مدة الحضور', key: 'duration', width: 16 },
    { header: 'تاريخ السجل', key: 'date', width: 16 },
  ]

  const data = attendances.map((a) => ({
    memberName: a.member?.name || '-',
    memberCode: a.member?.memberCode || '-',
    checkInAt: formatCairoDateTime(a.checkInAt),
    checkOutAt: a.checkOutAt ? formatCairoDateTime(a.checkOutAt) : 'لم يسجل انصراف',
    duration:
      a.durationMinutes !== null && a.durationMinutes !== undefined
        ? `${a.durationMinutes} دقيقة`
        : '-',
    date: formatCairoDate(a.checkInAt),
  }))

  const buffer =
    format === 'xlsx'
      ? await generateXlsx('الحضور', columns, data)
      : generateCsv(columns, data)

  const filename = buildFilename('attendance', format, filter.from, filter.to)

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.DATA_EXPORT_ATTENDANCE,
    entityType: AUDIT_ENTITY_TYPES.DATA_EXPORT,
    description: `تم تصدير سجلات الحضور بصيغة (${format.toUpperCase()}) بعدد (${attendances.length}) سجل`,
    metadata: {
      format,
      rowCount: attendances.length,
      from: filter.from ?? null,
      to: filter.to ?? null,
    },
  })

  return {
    buffer,
    filename,
    contentType: getContentType(format),
    rowCount: attendances.length,
    format,
  }
}

/**
 * Export Membership Plans
 */
export async function exportPlans(
  gymId: string,
  filter: ExportFilterQuery,
  actorUserId?: string
): Promise<ExportResult> {
  const format: ExportFormat = filter.format === 'xlsx' ? 'xlsx' : 'csv'
  const where: any = { gymId }

  const dateFilter = buildDateRangeFilter(filter.from, filter.to)
  if (dateFilter) {
    where.createdAt = dateFilter
  }

  if (filter.status?.trim()) {
    if (filter.status.toUpperCase() === 'ACTIVE') where.isActive = true
    if (filter.status.toUpperCase() === 'INACTIVE') where.isActive = false
  }

  if (filter.search?.trim()) {
    where.name = { contains: filter.search.trim() }
  }

  const count = await prisma.membershipPlan.count({ where })
  if (count > MAX_EXPORT_LIMIT) {
    throw AppError.badRequest(
      `عدد السجلات المطلوب تصديرها (${count}) يتجاوز الحد الأقصى المسموح به (${MAX_EXPORT_LIMIT} سجل)، يرجى تحديد نطاق زمني أصغر / Export exceeds max limit of ${MAX_EXPORT_LIMIT} rows`
    )
  }

  const plans = await prisma.membershipPlan.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  const columns: ExportColumn[] = [
    { header: 'اسم الباقة', key: 'name', width: 24 },
    { header: 'الوصف', key: 'description', width: 30 },
    { header: 'المدة بالأيام', key: 'durationDays', width: 14 },
    { header: 'السعر', key: 'price', width: 16 },
    { header: 'الحالة', key: 'status', width: 14 },
    { header: 'تاريخ الإنشاء', key: 'createdAt', width: 20 },
  ]

  const data = plans.map((p) => ({
    name: p.name,
    description: p.description || '-',
    durationDays: p.durationDays,
    price: `${Number(p.price).toFixed(2)} ج.م`,
    status: p.isActive ? 'نشطة' : 'معطلة',
    createdAt: formatCairoDateTime(p.createdAt),
  }))

  const buffer =
    format === 'xlsx'
      ? await generateXlsx('الباقات', columns, data)
      : generateCsv(columns, data)

  const filename = buildFilename('plans', format, filter.from, filter.to)

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.DATA_EXPORT_PLANS,
    entityType: AUDIT_ENTITY_TYPES.DATA_EXPORT,
    description: `تم تصدير باقات العضوية بصيغة (${format.toUpperCase()}) بعدد (${plans.length}) باقة`,
    metadata: {
      format,
      rowCount: plans.length,
      from: filter.from ?? null,
      to: filter.to ?? null,
    },
  })

  return {
    buffer,
    filename,
    contentType: getContentType(format),
    rowCount: plans.length,
    format,
  }
}

/**
 * Export Activity Logs (Safe fields only, omitting sensitive JSON snapshots)
 */
export async function exportActivityLogs(
  gymId: string,
  filter: ExportFilterQuery,
  actorUserId?: string
): Promise<ExportResult> {
  const format: ExportFormat = filter.format === 'xlsx' ? 'xlsx' : 'csv'
  const where: any = { gymId }

  const dateFilter = buildDateRangeFilter(filter.from, filter.to)
  if (dateFilter) {
    where.createdAt = dateFilter
  }

  if (filter.status?.trim()) {
    where.action = filter.status.trim().toUpperCase()
  }

  if (filter.search?.trim()) {
    where.description = { contains: filter.search.trim() }
  }

  const count = await prisma.auditLog.count({ where })
  if (count > MAX_EXPORT_LIMIT) {
    throw AppError.badRequest(
      `عدد السجلات المطلوب تصديرها (${count}) يتجاوز الحد الأقصى المسموح به (${MAX_EXPORT_LIMIT} سجل)، يرجى تحديد نطاق زمني أصغر / Export exceeds max limit of ${MAX_EXPORT_LIMIT} rows`
    )
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      actorUser: {
        select: { id: true, name: true, role: true },
      },
    },
  })

  const columns: ExportColumn[] = [
    { header: 'المستخدم', key: 'userName', width: 22 },
    { header: 'نوع العملية', key: 'action', width: 28 },
    { header: 'نوع السجل', key: 'entityType', width: 18 },
    { header: 'وصف العملية', key: 'description', width: 40 },
    { header: 'تاريخ العملية', key: 'createdAt', width: 20 },
  ]

  const data = logs.map((l) => ({
    userName: l.actorUser?.name || 'النظام الإداري',
    action: l.action,
    entityType: l.entityType,
    description: l.description,
    createdAt: formatCairoDateTime(l.createdAt),
  }))

  const buffer =
    format === 'xlsx'
      ? await generateXlsx('سجل العمليات', columns, data)
      : generateCsv(columns, data)

  const filename = buildFilename('activity-logs', format, filter.from, filter.to)

  await createAuditLog({
    gymId,
    actorUserId,
    action: AUDIT_ACTIONS.DATA_EXPORT_ACTIVITY_LOGS,
    entityType: AUDIT_ENTITY_TYPES.DATA_EXPORT,
    description: `تم تصدير سجل العمليات والتدقيق بصيغة (${format.toUpperCase()}) بعدد (${logs.length}) عملية`,
    metadata: {
      format,
      rowCount: logs.length,
      from: filter.from ?? null,
      to: filter.to ?? null,
    },
  })

  return {
    buffer,
    filename,
    contentType: getContentType(format),
    rowCount: logs.length,
    format,
  }
}
