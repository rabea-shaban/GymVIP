import React, { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import { useToast } from '@/components/feedback/Toast'
import { subscriptionsApi } from '../services/subscriptionsApi'
import type { SubscriptionItem, SubscriptionStatus } from '../types/subscription.types'
import { ExportDropdown } from '@/components/ui/ExportDropdown'

export const SubscriptionsListPage: React.FC = () => {
  const navigate = useNavigate()
  const toast = useToast()

  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const loadSubscriptions = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await subscriptionsApi.list({
        search: searchQuery.trim() || undefined,
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
  }, [searchQuery, statusFilter, page, toast])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  const handleResetFilters = () => {
    setSearchQuery('')
    setStatusFilter('ALL')
    setPage(1)
  }

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            نشط
          </span>
        )
      case 'FROZEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <PauseCircle className="w-3.5 h-3.5 text-blue-600" />
            مجمد
          </span>
        )
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            منتهي
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            ملغي
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600">
            {status}
          </span>
        )
    }
  }

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
            <span>&gt;</span>
            <span className="text-zinc-900 font-bold">إدارة الاشتراكات</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950">إدارة الاشتراكات</h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            متابعة الاشتراكات النشطة، المنتهية، والمجمدة وسجلات تجديد العضويات.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <ExportDropdown
            endpoint="subscriptions"
            params={{
              search: searchQuery.trim() || undefined,
              status: statusFilter === 'ALL' ? undefined : (statusFilter as SubscriptionStatus),
            }}
          />
          <button
            onClick={() => navigate('/app/subscriptions/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F4D76A] hover:bg-gym-gold text-zinc-950 text-xs sm:text-sm font-black transition-all shadow-2xs active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ إنشاء اشتراك جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Filter and Search Bar */}
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
            <div className="w-full sm:w-40">
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

          <div className="text-xs font-bold text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-xl self-end sm:self-center">
            إجمالي {totalCount} اشتراك
          </div>
        </div>
      </div>

      {/* 3. Subscriptions Table / State Views */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-zinc-200 p-8 space-y-4 animate-pulse">
          <div className="h-6 w-48 bg-zinc-200 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-zinc-100 rounded-xl" />
            ))}
          </div>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center shadow-xs">
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gym-gold text-zinc-950 text-xs font-extrabold hover:bg-gym-gold-light"
          >
            <Plus className="w-4 h-4" />
            + إنشاء اشتراك جديد
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-zinc-50/90 border-b border-zinc-200/80 text-zinc-500 font-bold">
                <tr>
                  <th className="py-3.5 px-4">العضو</th>
                  <th className="py-3.5 px-4">الباقة</th>
                  <th className="py-3.5 px-4">سعر الاشتراك</th>
                  <th className="py-3.5 px-4">المدة</th>
                  <th className="py-3.5 px-4">تاريخ البدء</th>
                  <th className="py-3.5 px-4">تاريخ الانتهاء</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
                {subscriptions.map((sub) => {
                  const startDateStr = sub.startDate ? sub.startDate.split('T')[0] : ''
                  const endDateStr = sub.endDate ? sub.endDate.split('T')[0] : ''

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => navigate(`/app/subscriptions/${sub.id}`)}
                      className="hover:bg-zinc-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold text-xs shrink-0">
                            <User className="w-4 h-4 text-zinc-500" />
                          </div>
                          <div>
                            <span className="font-bold text-zinc-950 block">
                              {sub.member?.name || 'غير معروف'}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {sub.member?.memberCode || ''} • {sub.member?.phone || ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-zinc-900">{sub.planName}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-zinc-950">
                          {Number(sub.planPrice).toLocaleString('ar-EG')}{' '}
                          <span className="text-[10px] text-zinc-500">ج.م</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {sub.durationDays} يوم
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-600">
                        {startDateStr}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-600">
                        {endDateStr}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(sub.effectiveStatus || sub.status)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/app/subscriptions/${sub.id}`)
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-bold hover:bg-zinc-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض</span>
                        </button>
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
              <span className="text-zinc-500">
                الصفحة {page} من {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50 font-bold"
                >
                  السابق
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50 font-bold"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SubscriptionsListPage
