import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  CheckCheck,
  RotateCcw,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  Snowflake,
  CheckCircle2,
  Inbox,
} from 'lucide-react'
import { notificationsApi } from '../services/notificationsApi'
import {
  NotificationItem,
  NotificationType,
  NOTIFICATION_TYPE_LABELS,
} from '../types/notification.types'
import { useToast } from '@/components/feedback/Toast/ToastContext'

export type ReadFilter = 'all' | 'unread' | 'read'

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  // Filter & Pagination States
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState<number>(1)
  const limit = 15

  // Map filters to API parameters
  const isReadParam =
    readFilter === 'unread' ? false : readFilter === 'read' ? true : undefined
  const typeParam =
    typeFilter !== 'all' ? (typeFilter as NotificationType) : undefined

  // TanStack Query for notifications list
  const {
    data: listData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['notifications', { page, limit, isRead: isReadParam, type: typeParam }],
    queryFn: () =>
      notificationsApi.list({
        page,
        limit,
        isRead: isReadParam,
        type: typeParam,
      }),
  })

  // TanStack Query for unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
  })

  const notifications = listData?.notifications || []
  const pagination = listData?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 }
  const unreadCount = unreadData?.unreadCount ?? 0

  // Mark single notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
    onError: () => {
      toast.error('تعذر تحديد الإشعار كمقروء')
    },
  })

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
      toast.success(`تم تحديد ${res.updatedCount} إشعار كمقروء`)
    },
    onError: () => {
      toast.error('تعذر تحديد الإشعارات كمقروءة')
    },
  })

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markAsReadMutation.mutate(item.id)
    }

    if (item.entityType === 'SUBSCRIPTION' && item.entityId) {
      navigate(`/app/subscriptions/${item.entityId}`)
    } else if (item.entityType === 'PAYMENT') {
      navigate('/app/payments')
    }
  }

  const formatNotificationTime = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('ar-EG', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const getTypeVisuals = (type: NotificationType) => {
    switch (type) {
      case 'SUBSCRIPTION_EXPIRING':
        return {
          icon: <Clock className="w-5 h-5 text-amber-600" />,
          bg: 'bg-amber-50 border-amber-200/80',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          badgeText: 'على وشك الانتهاء',
        }
      case 'SUBSCRIPTION_EXPIRED':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
          bg: 'bg-rose-50 border-rose-200/80',
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
          badgeText: 'منتهي',
        }
      case 'SUBSCRIPTION_RENEWED':
        return {
          icon: <RotateCcw className="w-5 h-5 text-emerald-600" />,
          bg: 'bg-emerald-50 border-emerald-200/80',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          badgeText: 'تم التجديد',
        }
      case 'SUBSCRIPTION_FROZEN':
        return {
          icon: <Snowflake className="w-5 h-5 text-blue-600" />,
          bg: 'bg-blue-50 border-blue-200/80',
          badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
          badgeText: 'تجميد',
        }
      case 'PAYMENT_RECEIVED':
        return {
          icon: <CreditCard className="w-5 h-5 text-gym-gold" />,
          bg: 'bg-amber-50/50 border-amber-200/70',
          badgeBg: 'bg-[#FCECB5] text-amber-900 border-[#ECD9A2]',
          badgeText: 'سداد مالي',
        }
      default:
        return {
          icon: <Bell className="w-5 h-5 text-zinc-600" />,
          bg: 'bg-zinc-100 border-zinc-200',
          badgeBg: 'bg-zinc-200 text-zinc-800 border-zinc-300',
          badgeText: 'تنبيه',
        }
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 font-cairo">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1 font-medium">
            <span
              onClick={() => navigate('/app/dashboard')}
              className="hover:text-zinc-800 cursor-pointer"
            >
              لوحة التحكم
            </span>
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-900 font-bold">الإشعارات</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
              الإشعارات والتنبيهات
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#FCECB5] border border-[#ECD9A2] text-[#8C6D1F] text-xs font-bold font-mono">
                {unreadCount} غير مقروءة
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            متابعة فورية لتنبيهات انتهاء وتجديد وتجميد الاشتراكات والمدفوعات التشغيلية
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
            className="px-4 py-2.5 bg-white hover:bg-zinc-50 text-zinc-800 rounded-xl text-xs sm:text-sm font-bold border border-zinc-200 flex items-center gap-2 transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck className="w-4 h-4 text-gym-gold" />
            <span>تحديد الكل كمقروء</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center border border-zinc-200/80">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-bold">إجمالي الإشعارات</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-zinc-950 font-mono">
                  {pagination.total}
                </span>
                <span className="text-[11px] text-zinc-400">إشعار مسجل</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/80">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-bold">غير مقروءة</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-amber-700 font-mono">
                  {unreadCount}
                </span>
                <span className="text-[11px] text-zinc-400">تحتاج مراجعة</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/80">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-bold">تمت مراجعتها</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {Math.max(0, pagination.total - unreadCount)}
                </span>
                <span className="text-[11px] text-zinc-400">إشعار مقروء</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Types Selector */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Read/Unread Filters */}
          <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setReadFilter('all')
                setPage(1)
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                readFilter === 'all'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => {
                setReadFilter('unread')
                setPage(1)
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                readFilter === 'unread'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <span>غير مقروءة</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#FCECB5] text-amber-900 text-[10px] font-mono font-black">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setReadFilter('read')
                setPage(1)
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                readFilter === 'read'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              مقروءة
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-zinc-500 font-bold whitespace-nowrap">النوع:</span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setPage(1)
              }}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-gym-gold/40"
            >
              <option value="all">جميع الأنواع</option>
              <option value="SUBSCRIPTION_EXPIRING">اشتراكات على وشك الانتهاء</option>
              <option value="SUBSCRIPTION_EXPIRED">اشتراكات منتهية</option>
              <option value="SUBSCRIPTION_RENEWED">تجديد اشتراك</option>
              <option value="SUBSCRIPTION_FROZEN">تجميد اشتراك</option>
              <option value="PAYMENT_RECEIVED">دفعات مالية</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-gym-gold border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-zinc-500 font-medium">جاري تحميل الإشعارات...</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="text-sm font-bold text-zinc-900">تعذر تحميل الإشعارات</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">لا توجد إشعارات حالياً</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {readFilter === 'unread'
                ? 'رائع! لا توجد أي إشعارات غير مقروءة تحتاج انتباهك.'
                : 'ستظهر هنا كافة تنبيهات الاشتراكات والتجديد والدفعات الحية فور حدوثها.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {notifications.map((item) => {
              const visuals = getTypeVisuals(item.type)
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors cursor-pointer ${
                    !item.isRead ? 'bg-[#FFFDF6] hover:bg-[#FFF9EA]' : 'hover:bg-zinc-50/80'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${visuals.bg}`}
                    >
                      {visuals.icon}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-zinc-950">{item.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${visuals.badgeBg}`}
                        >
                          {NOTIFICATION_TYPE_LABELS[item.type] || visuals.badgeText}
                        </span>
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-gym-gold shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed break-words">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-3 pt-0.5 text-[11px] text-zinc-400 font-medium">
                        <span>{formatNotificationTime(item.createdAt)}</span>
                        {item.isRead && (
                          <span className="text-zinc-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>تمت القراءة</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {item.entityType === 'SUBSCRIPTION' && item.entityId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleNotificationClick(item)
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                      >
                        <span>عرض الاشتراك</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {item.entityType === 'PAYMENT' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleNotificationClick(item)
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                      >
                        <span>عرض السجل المالي</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsReadMutation.mutate(item.id)
                        }}
                        className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                        title="تحديد كمقروء"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <div>
              صفحة {pagination.page} من {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center gap-1"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>السابق</span>
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center gap-1"
              >
                <span>التالي</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationsPage
