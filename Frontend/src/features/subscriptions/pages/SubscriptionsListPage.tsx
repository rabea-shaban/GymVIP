import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Award,
  Plus,
  Search,
  RotateCcw,
  Clock,
  Eye,
  CheckCircle2,
  PauseCircle,
  XCircle,
  User,
  CreditCard,
  MoreVertical,
  ChevronLeft,
} from 'lucide-react'
import { useToast } from '@/components/feedback/Toast'
import { subscriptionsApi } from '../services/subscriptionsApi'
import type { SubscriptionItem, SubscriptionStatus } from '../types/subscription.types'
import { ExportDropdown } from '@/components/ui/ExportDropdown'
import { Avatar } from '@/components/ui/Avatar'
import { Dropdown } from '@/components/ui/Dropdown'
import { CancelSubscriptionModal } from '../components/CancelSubscriptionModal'
import { useRealtimeSync } from '@/services/socket'

export const SubscriptionsListPage: React.FC = () => {
  const navigate = useNavigate()
  const toast = useToast()

  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Cancel Modal State
  const [cancelModalSub, setCancelModalSub] = useState<SubscriptionItem | null>(null)

  // 300ms Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  const loadSubscriptions = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await subscriptionsApi.list({
        search: debouncedSearch.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as SubscriptionStatus),
        page,
        limit: 15,
      })
      setSubscriptions(res.subscriptions)
      setTotalPages(res.pagination.totalPages || 1)
      setTotalCount(res.pagination.total || 0)
    } catch {
      toast.error('تعذر جلب قائمة الاشتراكات من الخادم')
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, statusFilter, page, toast])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  // Instant Real-Time WebSocket updates for Subscriptions List
  useRealtimeSync(undefined, () => {
    loadSubscriptions()
  })

  const handleResetFilters = () => {
    setSearchQuery('')
    setDebouncedSearch('')
    setStatusFilter('ALL')
    setPage(1)
  }

  const getDaysRemaining = (endDateStr?: string) => {
    if (!endDateStr) return null
    try {
      const end = new Date(endDateStr)
      const now = new Date()
      const diff = end.getTime() - now.getTime()
      return Math.ceil(diff / (1000 * 60 * 60 * 24))
    } catch {
      return null
    }
  }

  const getStatusBadge = (status: SubscriptionStatus, endDateStr?: string) => {
    const daysLeft = getDaysRemaining(endDateStr)

    if (status === 'ACTIVE') {
      if (daysLeft !== null && daysLeft <= 0) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>ينتهي اليوم</span>
          </span>
        )
      }
      if (daysLeft !== null && daysLeft <= 7) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>باقي {daysLeft} أيام</span>
          </span>
        )
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>نشط</span>
        </span>
      )
    }

    if (status === 'FROZEN') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <PauseCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>مجمد</span>
        </span>
      )
    }

    if (status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span>منتهي</span>
        </span>
      )
    }

    if (status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>ملغي</span>
        </span>
      )
    }

    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600">
        {status}
      </span>
    )
  }

  // Quick KPI summary
  const summaryStats = useMemo(() => {
    const active = subscriptions.filter(
      (s) => (s.effectiveStatus || s.status) === 'ACTIVE'
    ).length
    const frozen = subscriptions.filter(
      (s) => (s.effectiveStatus || s.status) === 'FROZEN'
    ).length
    const now = new Date()
    const in7Days = new Date()
    in7Days.setDate(in7Days.getDate() + 7)
    const expiringSoon = subscriptions.filter((s) => {
      const st = s.effectiveStatus || s.status
      if (st !== 'ACTIVE' || !s.endDate) return false
      const end = new Date(s.endDate)
      return end >= now && end <= in7Days
    }).length

    return {
      total: totalCount,
      active,
      frozen,
      expiringSoon,
    }
  }, [subscriptions, totalCount])

  return (
    <div className="space-y-6 pb-16 font-cairo">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mb-1.5">
            <span
              onClick={() => navigate('/app/dashboard')}
              className="hover:text-zinc-700 cursor-pointer"
            >
              لوحة التحكم
            </span>
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-900 font-bold">إدارة الاشتراكات</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
            إدارة الاشتراكات
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            متابعة دقيقة للاشتراكات النشطة، المنتهية، والمجمدة وسجلات تجديد العضويات.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <ExportDropdown
            endpoint="subscriptions"
            params={{
              search: debouncedSearch.trim() || undefined,
              status: statusFilter === 'ALL' ? undefined : (statusFilter as SubscriptionStatus),
            }}
          />
          <button
            onClick={() => navigate('/app/subscriptions/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gym-gold hover:bg-[#E5C158] text-amber-950 text-xs sm:text-sm font-black transition-all shadow-xs active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>إنشاء اشتراك جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-1.5">
            <span>إجمالي الاشتراكات</span>
            <Award className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-black text-zinc-950">
            {summaryStats.total}
          </div>
          <span className="text-[11px] text-zinc-400 font-medium">سجل عضوية مقيد</span>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-1.5">
            <span>الاشتراكات السارية</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {summaryStats.active}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">عضوية نشطة حالياً</span>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-1.5">
            <span>على وشك الانتهاء</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">
            {summaryStats.expiringSoon}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">خلال 7 أيام</span>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-1.5">
            <span>اشتراكات مجمدة</span>
            <PauseCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">
            {summaryStats.frozen}
          </div>
          <span className="text-[11px] text-blue-600 font-medium">موقوفة مؤقتاً</span>
        </div>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-3.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم العضو، الهاتف، كود العضو، أو الباقة..."
                className="w-full pr-10 pl-4 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all placeholder:text-zinc-400"
              />
            </div>

            {/* Status Dropdown */}
            <div className="w-full sm:w-44">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:bg-white focus:border-zinc-900 focus:outline-none transition-all cursor-pointer font-bold"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="ACTIVE">نشط (ساري)</option>
                <option value="FROZEN">مجمد</option>
                <option value="EXPIRED">منتهي</option>
                <option value="CANCELLED">ملغي</option>
              </select>
            </div>

            {/* Reset */}
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-xs sm:text-sm font-bold hover:bg-zinc-50 transition-colors shrink-0"
              title="إعادة ضبط الفلاتر"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
              <span>إعادة ضبط</span>
            </button>
          </div>

          <div className="text-xs font-bold text-zinc-600 bg-zinc-100/90 px-3.5 py-1.5 rounded-xl self-end sm:self-center">
            إجمالي <span className="text-zinc-950 font-black">{totalCount}</span> اشتراك
          </div>
        </div>
      </div>

      {/* 4. Subscriptions Table / State Views */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-zinc-200/90 p-8 space-y-4 animate-pulse">
          <div className="h-6 w-48 bg-zinc-200 rounded-xl" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-zinc-100 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zinc-200/90 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-4">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 mb-1">
            {searchQuery ? 'لا توجد نتائج مطابقة لبحثك' : 'لا توجد اشتراكات مسجلة'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mb-6">
            {searchQuery
              ? `لم يتم العثور على أي اشتراك يطابق "${searchQuery}".`
              : 'ابدأ بإنشاء أول اشتراك لعضو في الجيم لتوثيق مدة الباقة وتاريخ الانتهاء.'}
          </p>
          <button
            onClick={() => navigate('/app/subscriptions/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gym-gold text-amber-950 text-xs font-black hover:bg-[#E5C158] transition-all shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>إنشاء اشتراك جديد</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-zinc-50/90 border-b border-zinc-200/80 text-zinc-500 font-bold">
                <tr>
                  <th className="py-3.5 px-4 min-w-[110px]">كود العضو</th>
                  <th className="py-3.5 px-3 min-w-[60px] text-center">الصورة</th>
                  <th className="py-3.5 px-4 min-w-[150px]">اسم العضو</th>
                  <th className="py-3.5 px-4 min-w-[130px]">رقم الموبايل</th>
                  <th className="py-3.5 px-4 min-w-[170px]">الباقة</th>
                  <th className="py-3.5 px-4 min-w-[110px]">سعر الاشتراك</th>
                  <th className="py-3.5 px-4 min-w-[90px] text-center">المدة</th>
                  <th className="py-3.5 px-4 min-w-[110px] text-center">تاريخ البدء</th>
                  <th className="py-3.5 px-4 min-w-[110px] text-center">تاريخ الانتهاء</th>
                  <th className="py-3.5 px-4 min-w-[130px] text-center">الحالة</th>
                  <th className="py-3.5 px-4 min-w-[140px] text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
                {subscriptions.map((sub) => {
                  const startDateStr = sub.startDate ? sub.startDate.split('T')[0] : '—'
                  const endDateStr = sub.endDate ? sub.endDate.split('T')[0] : '—'
                  const priceFormatted = Number(sub.planPrice).toLocaleString('en-US')

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => navigate(`/app/subscriptions/${sub.id}`)}
                      className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                    >
                      {/* 1. Member Code */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200/90 text-zinc-800 text-xs font-bold">
                          {sub.member?.memberCode || '—'}
                        </span>
                      </td>

                      {/* 2. Member Avatar Photo */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <Avatar
                            src={sub.member?.avatarUrl || undefined}
                            name={sub.member?.name || 'عضو'}
                            size="sm"
                            className="border border-zinc-200 shadow-2xs"
                          />
                        </div>
                      </td>

                      {/* 3. Member Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-black text-zinc-950 text-xs block truncate group-hover:text-blue-700 transition-colors">
                          {sub.member?.name || 'غير معروف'}
                        </span>
                      </td>

                      {/* 4. Mobile Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs text-zinc-600 font-bold inline-block">
                          {sub.member?.phone || '—'}
                        </span>
                      </td>

                      {/* 5. Plan Name */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-zinc-900 text-xs block truncate max-w-[200px]">
                          {sub.planName}
                        </span>
                      </td>

                      {/* 6. Plan Price */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-zinc-950 text-xs">
                          {priceFormatted}{' '}
                          <span className="text-[11px] text-zinc-500 font-normal">ج.م</span>
                        </div>
                      </td>

                      {/* 7. Duration */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-800 font-bold text-xs">
                          {sub.durationDays} يوم
                        </span>
                      </td>

                      {/* 8. Start Date */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-bold text-zinc-600 text-xs">
                        {startDateStr}
                      </td>

                      {/* 9. End Date */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-bold text-zinc-600 text-xs">
                        {endDateStr}
                      </td>

                      {/* 10. Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {getStatusBadge(sub.effectiveStatus || sub.status, sub.endDate)}
                      </td>

                      {/* 11. Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div
                          className="flex items-center justify-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => navigate(`/app/subscriptions/${sub.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-3.5 h-3.5 text-zinc-600" />
                            <span>عرض</span>
                          </button>

                          <button
                            onClick={() => navigate(`/app/subscriptions/${sub.id}/renew`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gym-gold hover:bg-[#E5C158] text-amber-950 text-xs font-black transition-colors shadow-2xs"
                            title="تجديد الاشتراك"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>تجديد</span>
                          </button>

                          <Dropdown
                            align="left"
                            trigger={
                              <button
                                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                                title="خيارات إضافية"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            }
                            items={[
                              {
                                id: 'pay',
                                label: 'سداد دفعة مالية',
                                icon: <CreditCard className="w-4 h-4 text-emerald-600" />,
                                onClick: () =>
                                  navigate(
                                    `/app/payments/new?subscriptionId=${sub.id}&memberId=${sub.memberId}`
                                  ),
                              },
                              {
                                id: 'member',
                                label: 'عرض ملف العضو',
                                icon: <User className="w-4 h-4 text-blue-600" />,
                                onClick: () => navigate(`/app/members/${sub.memberId}`),
                              },
                              {
                                divider: true,
                                label: '',
                              },
                              {
                                id: 'cancel',
                                label: 'إلغاء الاشتراك',
                                icon: <XCircle className="w-4 h-4 text-rose-600" />,
                                danger: true,
                                disabled: (sub.effectiveStatus || sub.status) === 'CANCELLED',
                                onClick: () => setCancelModalSub(sub),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-zinc-100 flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-medium">
                الصفحة <span className="font-bold text-zinc-900">{page}</span> من{' '}
                <span className="font-bold text-zinc-900">{totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3.5 py-1.5 rounded-xl border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50 font-bold transition-colors"
                >
                  السابق
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3.5 py-1.5 rounded-xl border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50 font-bold transition-colors"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {cancelModalSub && (
        <CancelSubscriptionModal
          isOpen={Boolean(cancelModalSub)}
          onClose={() => setCancelModalSub(null)}
          onSuccess={() => {
            setCancelModalSub(null)
            loadSubscriptions()
            toast.success('تم إلغاء الاشتراك بنجاح')
          }}
          subscriptionId={cancelModalSub.id}
          memberName={cancelModalSub.member?.name}
          planName={cancelModalSub.planName}
        />
      )}
    </div>
  )
}

export default SubscriptionsListPage
