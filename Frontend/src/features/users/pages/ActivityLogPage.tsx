import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  History,
  Search,
  Eye,
  RotateCcw,
  User as UserIcon,
  Calendar,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { activityLogApi } from '@/features/activity-log/services/activityLogApi'
import { AuditLogDetailDrawer } from '@/features/activity-log/components/AuditLogDetailDrawer'
import { ExportDropdown } from '@/components/ui/ExportDropdown'
import {
  AUDIT_ACTION_MAP,
  AUDIT_ENTITY_MAP,
  ROLE_LABELS,
  formatCairoDateTime,
} from '@/features/activity-log/utils/auditLabels'
import type { AuditLog } from '@/features/activity-log/types'

const ACTION_OPTIONS = [
  { value: '', label: 'كافة أنواع العمليات' },
  // Members
  { value: 'MEMBER_CREATED', label: 'تسجيل عضو جديد' },
  { value: 'MEMBER_UPDATED', label: 'تعديل بيانات عضو' },
  { value: 'MEMBER_ACTIVATED', label: 'تفعيل حساب عضو' },
  { value: 'MEMBER_DEACTIVATED', label: 'تعطيل حساب عضو' },
  // Plans
  { value: 'PLAN_CREATED', label: 'إنشاء باقة اشتراك' },
  { value: 'PLAN_UPDATED', label: 'تعديل باقة اشتراك' },
  { value: 'PLAN_ACTIVATED', label: 'تفعيل باقة' },
  { value: 'PLAN_DEACTIVATED', label: 'تعطيل باقة' },
  // Subscriptions
  { value: 'SUBSCRIPTION_CREATED', label: 'إنشاء اشتراك جديد' },
  { value: 'SUBSCRIPTION_FROZEN', label: 'تجميد اشتراك' },
  { value: 'SUBSCRIPTION_RENEWED', label: 'تجديد اشتراك' },
  // Payments
  { value: 'PAYMENT_RECEIVED', label: 'تسجيل دفعة مالية' },
  // Attendance
  { value: 'ATTENDANCE_CHECK_IN', label: 'تسجيل حضور' },
  { value: 'ATTENDANCE_CHECK_OUT', label: 'تسجيل انصراف' },
  // Trainers
  { value: 'TRAINER_CREATED', label: 'إضافة مدرب' },
  { value: 'TRAINER_UPDATED', label: 'تعديل بيانات مدرب' },
  { value: 'TRAINER_ACTIVATED', label: 'تفعيل مدرب' },
  { value: 'TRAINER_DEACTIVATED', label: 'تعطيل مدرب' },
  // Users & Roles
  { value: 'USER_CREATED', label: 'إنشاء مستخدم جديد' },
  { value: 'USER_UPDATED', label: 'تعديل بيانات مستخدم' },
  { value: 'USER_ACTIVATED', label: 'تفعيل مستخدم' },
  { value: 'USER_DEACTIVATED', label: 'تعطيل مستخدم' },
  { value: 'USER_PASSWORD_RESET', label: 'إعادة تعيين كلمة مرور' },
  // Gym & Auth
  { value: 'GYM_SETTINGS_UPDATED', label: 'تحديث إعدادات النادي' },
  { value: 'LOGIN_SUCCESS', label: 'تسجيل دخول ناجح' },
  { value: 'LOGIN_FAILED', label: 'محاولة دخول فاشلة' },
  { value: 'LOGOUT', label: 'تسجيل خروج' },
]

const ENTITY_OPTIONS = [
  { value: '', label: 'كافة العناصر' },
  { value: 'MEMBER', label: 'الأعضاء' },
  { value: 'PLAN', label: 'الباقات' },
  { value: 'SUBSCRIPTION', label: 'الاشتراكات' },
  { value: 'PAYMENT', label: 'المدفوعات' },
  { value: 'ATTENDANCE', label: 'الحضور والانصراف' },
  { value: 'TRAINER', label: 'المدربين' },
  { value: 'USER', label: 'المستخدمين' },
  { value: 'GYM', label: 'إعدادات النادي' },
  { value: 'AUTH', label: 'تسجيل الدخول والأمان' },
]

export const ActivityLogPage: React.FC = () => {
  const [page, setPage] = useState<number>(1)
  const [limit] = useState<number>(20)
  const [search, setSearch] = useState<string>('')
  const [action, setAction] = useState<string>('')
  const [entityType, setEntityType] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  // State for Detail Drawer
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)

  // Fetch paginated audit trail
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      'activity-logs',
      page,
      limit,
      search,
      action,
      entityType,
      fromDate,
      toDate,
    ],
    queryFn: () =>
      activityLogApi.listLogs({
        page,
        limit,
        search: search.trim() || undefined,
        action: action || undefined,
        entityType: entityType || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
  })

  const resetFilters = () => {
    setSearch('')
    setAction('')
    setEntityType('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  const handleOpenDetail = (log: AuditLog) => {
    setSelectedLog(log)
    setIsDrawerOpen(true)
  }

  const logs = data?.data || []
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }

  return (
    <div className="space-y-6">
      <PageHeader
        title="سجل العمليات والمراجعة"
        description="سجل تدقيق غير قابل للتعديل يوثق جميع العمليات والتغييرات الحساسة داخل النادي"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/app/dashboard' },
          { label: 'الإدارة', href: '/app/users' },
          { label: 'سجل العمليات' },
        ]}
        actions={
          <ExportDropdown
            endpoint="activity-logs"
            params={{
              from: fromDate || undefined,
              to: toDate || undefined,
            }}
          />
        }
      />

      {/* Filter Toolbar Card */}
      <Card className="border border-zinc-800 bg-zinc-900/60 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Input
                placeholder="بحث في تفاصيل العملية..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                startIcon={<Search className="w-4 h-4 text-zinc-400" />}
              />
            </div>

            {/* Action Select */}
            <div>
              <Select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value)
                  setPage(1)
                }}
                options={ACTION_OPTIONS}
              />
            </div>

            {/* Entity Select */}
            <div>
              <Select
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value)
                  setPage(1)
                }}
                options={ENTITY_OPTIONS}
              />
            </div>

            {/* Reset Filters Button */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={resetFilters}
                startIcon={<RotateCcw className="w-4 h-4" />}
                className="w-full text-zinc-300 hover:text-zinc-100"
              >
                إعادة تعيين
              </Button>
            </div>
          </div>

          {/* Date Range Picker Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 font-medium text-zinc-300">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              نطاق التاريخ:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">من:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setPage(1)
                }}
                className="bg-zinc-950/60 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">إلى:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setPage(1)
                }}
                className="bg-zinc-950/60 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-primary-500"
              />
            </div>
            {(fromDate || toDate || search || action || entityType) && (
              <span className="mr-auto text-primary-400 font-medium">
                تم تطبيق تصفيات مخصصة
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingState message="جاري تحميل سجل العمليات والمراجعة..." />
      ) : isError ? (
        <ErrorState
          title="تعذر تحميل سجل العمليات"
          message={
            error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء الاتصال بالخادم'
          }
          onRetry={() => refetch()}
        />
      ) : logs.length === 0 ? (
        <Card className="border border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-10">
            <EmptyState
              icon={<History className="w-10 h-10 text-zinc-500" />}
              title="لا توجد عمليات مسجلة"
              description="لم يتم العثور على أي نشاط يطابق معايير البحث والتصفية المحددة."
              actionLabel="إلغاء التصفية"
              onAction={resetFilters}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/90 text-zinc-400">
                    <th className="p-3.5 font-semibold">التاريخ والوقت</th>
                    <th className="p-3.5 font-semibold">المنفذ</th>
                    <th className="p-3.5 font-semibold">نوع العملية</th>
                    <th className="p-3.5 font-semibold">العنصر</th>
                    <th className="p-3.5 font-semibold">بيان العملية</th>
                    <th className="p-3.5 font-semibold text-center w-28">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {logs.map((log) => {
                    const actionInfo = AUDIT_ACTION_MAP[log.action] || {
                      label: log.action,
                      variant: 'default',
                    }
                    const entityLabel = AUDIT_ENTITY_MAP[log.entityType] || log.entityType

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                        onClick={() => handleOpenDetail(log)}
                      >
                        {/* Timestamp */}
                        <td className="p-3.5 text-zinc-400 whitespace-nowrap">
                          {formatCairoDateTime(log.createdAt)}
                        </td>

                        {/* Actor User */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
                              <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-zinc-200">
                                {log.actorUser ? log.actorUser.name : 'النظام'}
                              </span>
                              {log.actorUser && (
                                <span className="text-[10px] text-zinc-500">
                                  {ROLE_LABELS[log.actorUser.role] || log.actorUser.role}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Action Badge */}
                        <td className="p-3.5 whitespace-nowrap">
                          <Badge variant={actionInfo.variant} size="sm">
                            {actionInfo.label}
                          </Badge>
                        </td>

                        {/* Entity Type */}
                        <td className="p-3.5 text-zinc-300 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-300 border border-zinc-700/50">
                            {entityLabel}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="p-3.5 text-zinc-200 font-medium max-w-md truncate">
                          {log.description}
                        </td>

                        {/* Action Details Button */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDetail(log)
                            }}
                            startIcon={<Eye className="w-3.5 h-3.5" />}
                            className="text-zinc-400 hover:text-zinc-100 group-hover:bg-zinc-800"
                          >
                            التفاصيل
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-zinc-400">
                إجمالي السجلات: <span className="font-semibold text-zinc-200">{pagination.total}</span>
              </span>
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Detail Drawer */}
      <AuditLogDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false)
          setSelectedLog(null)
        }}
        log={selectedLog}
      />
    </div>
  )
}

export default ActivityLogPage
