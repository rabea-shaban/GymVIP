import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  RotateCcw,
  Snowflake,
  MoreVertical,
  CheckCircle2,
  Clock,
  Calendar,
  CreditCard,
  Tag,
  AlertTriangle,
  ChevronLeft,
  Receipt,
  Building,
  User,
  X,
  Wallet,
  Ban,
  Plus,
} from 'lucide-react'
import { subscriptionsApi } from '../services/subscriptionsApi'
import type { SubscriptionItem, SubscriptionFreezeItem } from '../types/subscription.types'
import { paymentsApi } from '@/features/payments/services/paymentsApi'
import type { PaymentItem, PaymentSummary, PaymentMethod, WalletProvider } from '@/features/payments/types/payment.types'
import { useAuth } from '@/features/auth/context/AuthContext'
import { CancelSubscriptionModal } from '../components/CancelSubscriptionModal'

export const SubscriptionDetailPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER' || user?.role === 'RECEPTIONIST'
  const canCancel = user?.role === 'OWNER' || user?.role === 'MANAGER'
  const subId = id || 'SUB-00841'

  const [realSubscription, setRealSubscription] = useState<SubscriptionItem | null>(null)
  const [subscriptionPayments, setSubscriptionPayments] = useState<PaymentItem[]>([])
  const [freezeHistory, setFreezeHistory] = useState<SubscriptionFreezeItem[]>([])
  const [financialSummary, setFinancialSummary] = useState<PaymentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  // Toast
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('تمت العملية بنجاح')

  // Modals
  const [showFreezeModal, setShowFreezeModal] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  // Freeze Modal State
  const [freezeDays, setFreezeDays] = useState('7')
  const [freezeReason, setFreezeReason] = useState('')
  const [isFreezing, setIsFreezing] = useState(false)

  // Payment Modal State
  const [paymentAmount, setPaymentAmount] = useState('200')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [walletProvider, setWalletProvider] = useState<WalletProvider>('VODAFONE_CASH')
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)

  const reloadData = React.useCallback(() => {
    if (id) {
      setIsLoading(true)
      subscriptionsApi
        .getById(id)
        .then((data) => {
          setRealSubscription(data)
          setIsError(false)
        })
        .catch(() => {
          setIsError(true)
        })
        .finally(() => {
          setIsLoading(false)
        })

      subscriptionsApi
        .getFreezes(id)
        .then((res) => {
          setFreezeHistory(res.freezes || [])
        })
        .catch(() => {})

      paymentsApi
        .getSubscriptionPayments(id)
        .then((res) => {
          setSubscriptionPayments(res.payments)
          setFinancialSummary(res.financialSummary)
          const due = parseFloat(res.financialSummary.outstandingAmount)
          setPaymentAmount(due > 0 ? String(due) : '0')
        })
        .catch(() => {})
    }
  }, [id])

  useEffect(() => {
    reloadData()
  }, [reloadData])

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3500)
  }

  // Dynamic Data based on real data
  const isCancelled = realSubscription?.status === 'CANCELLED'
  const isFrozen = !isCancelled && realSubscription?.effectiveStatus === 'FROZEN'
  const isExpired = !isCancelled && realSubscription?.effectiveStatus === 'EXPIRED'

  const memberName = realSubscription?.member?.name || 'عضو غير محدد'
  const memberCode = realSubscription?.member?.memberCode || ''
  const planName = realSubscription?.planName || 'باقة غير محددة'
  const planPrice = realSubscription ? parseFloat(realSubscription.planPrice) : 0
  const durationDays = realSubscription?.durationDays || 30
  const startDateText = realSubscription?.startDate
    ? new Date(realSubscription.startDate).toLocaleDateString('ar-EG')
    : '-'
  const endDateText = realSubscription?.endDate
    ? new Date(realSubscription.endDate).toLocaleDateString('ar-EG')
    : '-'

  const totalPaid = financialSummary ? parseFloat(financialSummary.paidAmount) : 0
  const remainingDebt = financialSummary ? parseFloat(financialSummary.outstandingAmount) : 0
  const paidPercent = planPrice > 0 ? Math.min(100, Math.round((totalPaid / planPrice) * 100)) : 100

  const daysRemaining = React.useMemo(() => {
    if (!realSubscription?.endDate || isExpired) return 0
    const end = new Date(realSubscription.endDate).getTime()
    const now = new Date().getTime()
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }, [realSubscription?.endDate, isExpired])

  const timeConsumedPercent = React.useMemo(() => {
    if (!realSubscription?.startDate || !realSubscription?.endDate) return 0
    if (isExpired) return 100
    const start = new Date(realSubscription.startDate).getTime()
    const end = new Date(realSubscription.endDate).getTime()
    const now = new Date().getTime()
    if (now <= start) return 0
    if (now >= end) return 100
    return Math.round(((now - start) / (end - start)) * 100)
  }, [realSubscription?.startDate, realSubscription?.endDate, isExpired])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="w-8 h-8 border-4 border-zinc-950 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !realSubscription) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-zinc-900">لم يتم العثور على سجل الاشتراك</h2>
        <p className="text-xs text-zinc-500">
          تأكد من رقم الاشتراك المدخل أو تحقق من الصلاحيات الإدارية المطلوبة.
        </p>
        <button
          onClick={() => navigate('/app/subscriptions')}
          className="px-5 py-2.5 rounded-xl bg-zinc-950 text-white font-bold text-xs"
        >
          العودة لقائمة الاشتراكات
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[#E5C158]/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-sm font-medium">{toastMessage}</div>
          <button
            onClick={() => setShowToast(false)}
            className="text-zinc-400 hover:text-white mr-2 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Breadcrumb & Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 mb-1.5">
            <span>لوحة التحكم</span>
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            <button
              onClick={() => navigate('/app/subscriptions')}
              className="hover:text-zinc-700 transition"
            >
              الاشتراكات
            </button>
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-700">تفاصيل الاشتراك ({subId})</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tight">تفاصيل الاشتراك</h1>
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-zinc-100 text-zinc-700 font-mono">
              {subId}
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1 font-medium">
            عرض تفاصيل الاشتراك وحالته والمدفوعات المرتبطة به وجدول التجديد
          </p>
        </div>

        {/* Header Action Buttons */}
        {canManage && (
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            {isCancelled ? (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
                  <Ban className="w-4 h-4 text-rose-600" />
                  <span>الاشتراك ملغي نهائياً</span>
                </div>
                <button
                  onClick={() =>
                    navigate(
                      realSubscription?.memberId
                        ? `/app/subscriptions/new?memberId=${realSubscription.memberId}`
                        : '/app/subscriptions/new'
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ إنشاء اشتراك جديد</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate(`/app/subscriptions/${id || subId}/renew`)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-zinc-950 text-white hover:bg-zinc-800 shadow-sm transition active:scale-95"
                >
                  <RotateCcw className="w-4 h-4 text-[#F5D86B]" />
                  <span>تجديد الاشتراك</span>
                </button>

                {(realSubscription ? realSubscription.effectiveStatus === 'ACTIVE' : !isFrozen && !isExpired) && (
                  <button
                    onClick={() => setShowFreezeModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 shadow-sm transition"
                  >
                    <Snowflake className="w-4 h-4 text-blue-500" />
                    <span>تجميد الاشتراك</span>
                  </button>
                )}

                {canCancel && (realSubscription ? (realSubscription.status === 'ACTIVE' || realSubscription.status === 'FROZEN') : (!isExpired && !isCancelled)) && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>إلغاء الاشتراك</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => triggerToast('خيارات إضافية: طباعة العقد، سجل المراجعة، تفاصيل المشترك')}
              className="p-2.5 rounded-xl bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* TOP HERO MEMBER & TIMELINE CARD */}
      {isLoading ? (
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-sm space-y-4 animate-pulse">
          <div className="h-14 bg-zinc-100 rounded-xl"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-zinc-100 rounded-xl"></div>
            <div className="h-20 bg-zinc-100 rounded-xl"></div>
            <div className="h-20 bg-zinc-100 rounded-xl"></div>
          </div>
          <div className="h-4 bg-zinc-100 rounded-full"></div>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Top Row: Member & Status Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center p-2.5 shrink-0 shadow-sm">
                <Building className="w-6 h-6 text-[#F5D86B]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-zinc-950">{memberName}</h2>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-100 text-zinc-700 font-mono">
                    كود العضو: {memberCode}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 font-semibold mt-0.5">
                  {planName} • <span className="font-mono">{subId}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {isCancelled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                  <span>ملغي</span>
                </span>
              ) : isFrozen ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Snowflake className="w-3.5 h-3.5 text-amber-600" />
                  <span>مجمد مؤقتاً</span>
                </span>
              ) : isExpired ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>منتهي</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>نشط</span>
                </span>
              )}

              {!isExpired && !isCancelled && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{durationDays} يوم مدة الاشتراك</span>
                </span>
              )}
            </div>
          </div>

          {/* 3 Date/Time Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Block 1: Start Date */}
            <div className="bg-[#F8F9FA] border border-zinc-200/80 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs text-zinc-500 font-medium">تاريخ البداية</div>
                <div className="text-base font-black text-zinc-950 font-mono">{startDateText}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            {/* Block 2: Expiry Date */}
            <div className="bg-[#F8F9FA] border border-zinc-200/80 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs text-zinc-500 font-medium">تاريخ الانتهاء</div>
                <div className="text-base font-black text-zinc-950 font-mono">{endDateText}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            {/* Block 3: Remaining Days */}
            <div className="bg-[#F8F9FA] border border-zinc-200/80 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs text-zinc-500 font-medium">المدة الإجمالية</div>
                <div className="text-base font-black text-zinc-950 font-mono">
                  {durationDays} يوماً ({daysRemaining} يوم متبقٍ)
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-bold text-zinc-700">
              <span>معدل استهلاك مدة الاشتراك</span>
              <span>{timeConsumedPercent}% منقضٍ</span>
            </div>
            <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-[#C69A24] to-[#7E6517] rounded-full transition-all duration-500"
                style={{ width: `${timeConsumedPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION DETAILS CARD */}
      {isCancelled && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-950">بيانات وتفاصيل الإلغاء</h4>
                <p className="text-xs text-rose-700 font-medium">
                  تم إلغاء هذا الاشتراك رسمياً ولا يمكن تجديده مباشرة. يمكنك إنشاء اشتراك جديد للمشترك لمواصلة التمارين.
                </p>
              </div>
            </div>
            {canManage && (
              <button
                onClick={() =>
                  navigate(
                    realSubscription?.memberId
                      ? `/app/subscriptions/new?memberId=${realSubscription.memberId}`
                      : '/app/subscriptions/new'
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0 transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ إنشاء اشتراك جديد للمشترك</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="bg-white/90 p-3.5 rounded-xl border border-rose-100">
              <span className="text-zinc-500 font-medium block mb-1">تاريخ ووقت الإلغاء</span>
              <span className="font-bold text-zinc-950 font-mono">
                {realSubscription?.cancelledAt
                  ? new Date(realSubscription.cancelledAt).toLocaleString('ar-EG')
                  : 'تم الإلغاء مؤخراً'}
              </span>
            </div>
            <div className="bg-white/90 p-3.5 rounded-xl border border-rose-100">
              <span className="text-zinc-500 font-medium block mb-1">سبب الإلغاء المعتمد</span>
              <span className="font-bold text-zinc-950">
                {realSubscription?.cancellationReason || 'طلب العضو الإلغاء'}
              </span>
            </div>
            <div className="bg-white/90 p-3.5 rounded-xl border border-rose-100">
              <span className="text-zinc-500 font-medium block mb-1">الموظف المسؤول عن الإلغاء</span>
              <span className="font-bold text-zinc-950">
                {realSubscription?.cancelledByUser?.name || 'إدارة النادي'}
              </span>
            </div>
            {realSubscription?.cancellationNotes && (
              <div className="bg-white/90 p-3.5 rounded-xl border border-rose-100 sm:col-span-2 md:col-span-3">
                <span className="text-zinc-500 font-medium block mb-1">ملاحظات الإلغاء الإدارية</span>
                <span className="font-semibold text-zinc-800 leading-relaxed">
                  {realSubscription.cancellationNotes}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4 STAT FINANCIAL & DURATION CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Subscription Price */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500">قيمة الاشتراك</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-zinc-950">
              {planPrice.toLocaleString('ar-EG')} <span className="text-sm font-bold text-zinc-500">ج.م</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">السعر الثابت وقت الشراء</div>
          </div>
        </div>

        {/* Card 2: Total Paid */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500">إجمالي المدفوع</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">
              {totalPaid} <span className="text-sm font-bold text-emerald-700">ج.م</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">{paidPercent}% من إجمالي القيمة</div>
          </div>
        </div>

        {/* Card 3: Remaining Debt */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500">المبلغ المستحق</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-rose-600">
              {remainingDebt} <span className="text-sm font-bold text-rose-700">ج.م</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {remainingDebt > 0 ? 'متبقي للتحصيل - رصيد مدين' : 'مسدد بالكامل - خالٍ من الديون'}
            </div>
          </div>
        </div>

        {/* Card 4: Subscription Duration */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500">مدة الاشتراك</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-zinc-950">
              30 <span className="text-sm font-bold text-zinc-500">يوم</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">شهر ميلادي كامل</div>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN DETAILS WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Column in RTL (~65% width): Core Details, Payments Table, Activity Timeline */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Core Details */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#B8941F]" />
                <h3 className="text-base font-black text-zinc-950">بيانات الاشتراك الأساسية</h3>
              </div>
              <span className="text-xs text-zinc-400 font-medium">سجل النظام الإداري</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-xs">
              <div>
                <span className="text-zinc-400 block mb-1">الباقة الرياضية</span>
                <span className="font-bold text-zinc-950 text-sm">اشتراك شهري (VIP Fitness)</span>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1">نوع المدة التعاقدية</span>
                <span className="font-bold text-zinc-950 text-sm">30 يوماً متواصلاً</span>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1">تاريخ البداية</span>
                <span className="font-bold text-zinc-900 text-sm">10 سبتمبر 2026</span>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1">تاريخ الانتهاء</span>
                <span className="font-bold text-zinc-900 text-sm">9 أكتوبر 2026</span>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1">السعر وقت الاشتراك</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-zinc-950 text-sm">500 ج.م</span>
                  <span className="text-[11px] text-zinc-400">(تاريخي ثابت ومعتمد)</span>
                </div>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1">حالة الاشتراك الحالية</span>
                {isCancelled ? (
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    ملغي نهائياً
                  </span>
                ) : isFrozen ? (
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    مجمد مؤقتاً
                  </span>
                ) : isExpired ? (
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                    منتهي
                  </span>
                ) : (
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    نشط ومستمر
                  </span>
                )}
              </div>
            </div>

            {/* Created By Footnote */}
            <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>أنشئ بواسطة:</span>
                <strong className="text-zinc-900">عمر حسن (موظف استقبال)</strong>
              </div>
              <div className="text-zinc-400 text-[11px]">
                تاريخ ووقت الإنشاء: 10 سبتمبر 2026 — 09:15 ص
              </div>
            </div>
          </div>

          {/* Card 2: Linked Payments */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-base font-black text-zinc-950">المدفوعات المرتبطة</h3>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {totalPaid} ج.م مدفوع من أصل 500 ج.م (المتبقي: {remainingDebt} ج.م)
                </div>
              </div>

              {!isCancelled ? (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-[#FAF0D3] text-[#7E6517] hover:bg-[#F5E5B8] border border-[#ECD9A2] shadow-sm transition active:scale-95"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#B8941F]" />
                  <span>تسجيل دفعة جديدة</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-100 text-zinc-500 border border-zinc-200">
                  <Ban className="w-3.5 h-3.5 text-zinc-400" />
                  <span>لا يمكن سداد اشتراك ملغي</span>
                </div>
              )}
            </div>

            {/* Payment Progress Bar */}
            <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${paidPercent}%` }}
              ></div>
            </div>

            {/* Payments Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-zinc-50/80 text-zinc-500 font-bold border-y border-zinc-100">
                    <th className="py-3 px-4">رقم الدفعة</th>
                    <th className="py-3 px-3">المبلغ</th>
                    <th className="py-3 px-3">طريقة الدفع</th>
                    <th className="py-3 px-3">المرجع</th>
                    <th className="py-3 px-3">التاريخ</th>
                    <th className="py-3 px-3 text-center">الحالة</th>
                    <th className="py-3 px-4 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {subscriptionPayments.length > 0 ? (
                    subscriptionPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">{p.id}</td>
                        <td className="py-3.5 px-3 font-black text-zinc-950 text-sm font-mono">
                          {Number(p.amount).toLocaleString('ar-EG')} ج.م
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 font-bold text-[11px]">
                            <span>{p.method === 'CASH' ? 'نقدي (كاش)' : `محفظة (${p.walletProvider})`}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-zinc-500">{p.transactionReference || '—'}</td>
                        <td className="py-3.5 px-3 font-medium text-zinc-700 font-mono">
                          {p.createdAt ? p.createdAt.split('T')[0] : ''}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            مكتملة
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-left">
                          <button
                            onClick={() => navigate(`/app/payments/${p.id}`)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition"
                          >
                            عرض الدفعة
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      {/* Payment Row 1 */}
                      <tr className="hover:bg-zinc-50/50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">PAY-00482</td>
                        <td className="py-3.5 px-3 font-black text-zinc-950 text-sm">200 ج.م</td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 font-bold text-[11px]">
                            <span>$</span>
                            <span>نقدي (كاش)</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-zinc-400">—</td>
                        <td className="py-3.5 px-3 font-medium text-zinc-700">10 سبتمبر 2026</td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            مكتملة
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-left">
                          <button
                            onClick={() => triggerToast('عرض إيصال PAY-00482')}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition"
                          >
                            عرض الدفعة
                          </button>
                        </td>
                      </tr>

                      {/* Payment Row 2 */}
                      <tr className="hover:bg-zinc-50/50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">PAY-00491</td>
                        <td className="py-3.5 px-3 font-black text-zinc-950 text-sm">100 ج.م</td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 font-bold text-[11px]">
                            <Wallet className="w-3 h-3 text-purple-700" />
                            <span>محفظة إلكترونية (فودافون كاش)</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-zinc-600 text-xs">WLT-829341</td>
                        <td className="py-3.5 px-3 font-medium text-zinc-700">12 سبتمبر 2026</td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            مكتملة
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-left">
                          <button
                            onClick={() => triggerToast('عرض إيصال PAY-00491')}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition"
                          >
                            عرض الدفعة
                          </button>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2.5: Freeze History Table Card */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-black text-zinc-950">سجل تجميد الاشتراك (Freeze History)</h3>
              </div>
              <span className="text-xs text-zinc-500 font-bold font-mono">
                {freezeHistory.length} فترات تجميد
              </span>
            </div>

            {freezeHistory.length === 0 ? (
              <div className="py-8 text-center bg-zinc-50 rounded-2xl border border-zinc-100 text-zinc-400 text-xs">
                لا يوجد سجل تجميد لهذا الاشتراك
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 text-zinc-400 font-medium">
                      <th className="pb-3 px-3">بداية التجميد</th>
                      <th className="pb-3 px-3">نهاية التجميد</th>
                      <th className="pb-3 px-3">المدة (أيام)</th>
                      <th className="pb-3 px-3">السبب</th>
                      <th className="pb-3 px-3">تاريخ التوثيق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {freezeHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3 px-3 font-mono font-bold text-zinc-900">
                          {item.startDate.split('T')[0]}
                        </td>
                        <td className="py-3 px-3 font-mono text-zinc-700">
                          {item.endDate.split('T')[0]}
                        </td>
                        <td className="py-3 px-3 font-black text-blue-700">
                          {item.days} يوم
                        </td>
                        <td className="py-3 px-3 text-zinc-600">
                          {item.reason || '—'}
                        </td>
                        <td className="py-3 px-3 text-zinc-400 font-mono text-[11px]">
                          {item.createdAt.split('T')[0]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card 3: Subscription Activity Timeline */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-700" />
                <h3 className="text-base font-black text-zinc-950">سجل نشاطات الاشتراك</h3>
              </div>
              <span className="text-xs text-zinc-400 font-medium">الترتيب الزمني</span>
            </div>

            <div className="space-y-4 text-xs relative pr-4 before:absolute before:right-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
              {/* Event 1 */}
              <div className="relative pr-4">
                <span className="w-3 h-3 rounded-full bg-zinc-950 absolute -right-[5px] top-1"></span>
                <div className="font-bold text-zinc-950 text-sm">تم إنشاء الاشتراك وبدء الخدمة</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">10 سبتمبر 2026 — 09:15 ص</div>
                <p className="text-zinc-600 mt-1 leading-relaxed">
                  تم تسجيل الاشتراك بنجاح بالقيمة التعاقدية {planPrice} ج.م.
                </p>
              </div>

              {/* Event 2 */}
              <div className="relative pr-4">
                <span className="w-3 h-3 rounded-full bg-emerald-500 absolute -right-[5px] top-1"></span>
                <div className="font-bold text-zinc-950 text-sm">تم تسجيل دفعات مالية</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">سجل الخزينة</div>
                <p className="text-zinc-600 mt-1 leading-relaxed">
                  إجمالي المسدد: {totalPaid} ج.م | المتبقي: {remainingDebt} ج.م
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Left Column in RTL (~35% width): Member Profile Box & Renewal Chain */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Member Info Card */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-black text-zinc-950">بيانات العضو</h3>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                عضو نشط
              </span>
            </div>

            <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/70 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-bold text-sm shrink-0">
                م.أ
              </div>
              <div>
                <h4 className="font-black text-zinc-950 text-sm">{memberName}</h4>
                <div className="text-xs text-zinc-400 font-mono mt-0.5">كود : {memberCode}</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">الرصيد المدين:</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                  مستحق {remainingDebt} ج.م
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (realSubscription?.memberId) {
                  navigate(`/app/members/${realSubscription.memberId}`)
                } else {
                  navigate('/app/members')
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>عرض ملف العضو الكامل</span>
            </button>
          </div>

          {/* Card 2: Renewal Chain */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <RotateCcw className="w-4 h-4 text-zinc-700" />
              <h3 className="text-sm font-black text-zinc-950">سلسلة التجديد</h3>
            </div>

            {isCancelled ? (
              <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-950">الاشتراك ملغي</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    غير قابل للتجديد
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  وفقاً لقواعد النظام، لا يمكن تجديد اشتراك تم إلغاؤه نهائياً. يلزم إنشاء اشتراك جديد للمشترك.
                </p>
                {canManage && (
                  <button
                    onClick={() =>
                      navigate(
                        realSubscription?.memberId
                          ? `/app/subscriptions/new?memberId=${realSubscription.memberId}`
                          : '/app/subscriptions/new'
                      )
                    }
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إنشاء اشتراك جديد للمشترك</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900">تجديد الاشتراك</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF0D3] text-[#7E6517] border border-[#ECD9A2]">
                    متاح
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  يمكن تجديد الاشتراك مبكراً مع احتساب المدة تلقائياً بعد نهاية الاشتراك الحالي.
                </p>
                {canManage && (
                  <button
                    onClick={() => navigate(`/app/subscriptions/${id || subId}/renew`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black bg-zinc-950 text-white hover:bg-zinc-800 transition shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#F5D86B]" />
                    <span>تجديد الاشتراك الآن</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FREEZE MODAL */}
      {showFreezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center">
                  <Snowflake className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-zinc-950">تجميد الاشتراك (Freeze)</h3>
              </div>
              <button
                onClick={() => setShowFreezeModal(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              تنبيه: سيتم تمديد تاريخ انتهاء الاشتراك بعدد أيام التجميد المحددة، ولن يتمكن العضو من تسجيل الدخول حتى انتهاء فترة التجميد.
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-800 mb-1">مدة التجميد (بالأيام)</label>
                <select
                  value={freezeDays}
                  onChange={(e) => setFreezeDays(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900"
                >
                  <option value="3">3 أيام</option>
                  <option value="7">7 أيام (أسبوع)</option>
                  <option value="15">15 يوماً (أسبوعان)</option>
                  <option value="30">30 يوماً (شهر كامل)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-800 mb-1">سبب التجميد (اختياري)</label>
                <input
                  type="text"
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900"
                  placeholder="سفر مؤقت / ظروف صحية..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowFreezeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isFreezing}
                onClick={async () => {
                  try {
                    setIsFreezing(true)
                    const daysNum = Number(freezeDays)
                    if (id && id !== 'SUB-00841') {
                      await subscriptionsApi.freeze(id, {
                        days: daysNum,
                        reason: freezeReason.trim() || undefined,
                      })
                    }
                    setShowFreezeModal(false)
                    triggerToast(`تم تجميد الاشتراك لمدة ${freezeDays} يوماً بنجاح`)
                    reloadData()
                  } catch (err: any) {
                    triggerToast(err.response?.data?.message || err.message || 'تعذر تجميد الاشتراك')
                  } finally {
                    setIsFreezing(false)
                  }
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isFreezing ? 'جاري التجميد...' : 'تأكيد التجميد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENEW MODAL */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gold-100 text-gold-800 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-zinc-950">تجديد اشتراك محمد أحمد</h3>
              </div>
              <button
                onClick={() => setShowRenewModal(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-800 mb-1">نوع التجديد</label>
                <select className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900">
                  <option>نفس الباقة: شهر إضافي (500 ج.م)</option>
                  <option>ترقية: 3 أشهر (1,350 ج.م)</option>
                  <option>ترقية: سنوي VIP شامل (4,500 ج.م)</option>
                </select>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-zinc-600">
                يبدأ التجديد التلقائي اعتباراً من تاريخ انتهاء الباقة الحالية (9 أكتوبر 2026).
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRenewModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRenewModal(false)
                  if (realSubscription?.id) {
                    navigate(`/app/subscriptions/${realSubscription.id}/renew`)
                  }
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-950 text-white hover:bg-zinc-800"
              >
                تأكيد التجديد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 text-right font-cairo">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-zinc-950">تحصيل دفعة لاشتراك {subId}</h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-800 mb-1">
                  المبلغ المطلوب تحصيله (ج.م) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={remainingDebt > 0 ? remainingDebt : undefined}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-sm text-zinc-950 font-mono"
                />
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  المبلغ المستحق الحالي: {remainingDebt.toLocaleString('ar-EG')} ج.م
                </span>
              </div>

              <div>
                <label className="block font-bold text-zinc-800 mb-1">طريقة التحصيل</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition ${
                      paymentMethod === 'CASH'
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    نقدي (كاش بالدرج)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('WALLET')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition ${
                      paymentMethod === 'WALLET'
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    محفظة إلكترونية
                  </button>
                </div>
              </div>

              {paymentMethod === 'WALLET' && (
                <div>
                  <label className="block font-bold text-zinc-800 mb-1">مزوّد المحفظة</label>
                  <select
                    value={walletProvider}
                    onChange={(e) => setWalletProvider(e.target.value as WalletProvider)}
                    className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs"
                  >
                    <option value="VODAFONE_CASH">فودافون كاش</option>
                    <option value="INSTAPAY">إنستاباي (InstaPay)</option>
                    <option value="ORANGE_CASH">أورنج كاش</option>
                    <option value="ETISALAT_CASH">اتصالات كاش</option>
                    <option value="WE">وي باي (WE Pay)</option>
                    <option value="OTHER">محفظة أخرى</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSubmittingPayment}
                onClick={async () => {
                  const amt = parseFloat(paymentAmount)
                  if (!amt || amt <= 0) {
                    triggerToast('يرجى تحديد مبلغ صالح أكبر من 0')
                    return
                  }
                  if (amt > remainingDebt) {
                    triggerToast('المبلغ المدفوع أكبر من المبلغ المستحق')
                    return
                  }

                  try {
                    setIsSubmittingPayment(true)
                    const created = await paymentsApi.create({
                      subscriptionId: realSubscription?.id || subId,
                      amount: amt,
                      method: paymentMethod,
                      walletProvider: paymentMethod === 'WALLET' ? walletProvider : null,
                    })
                    setShowPaymentModal(false)
                    triggerToast(`تم تسجيل الدفعة بنجاح! رقم الإيصال: ${created.id}`)
                    reloadData()
                  } catch (err: any) {
                    triggerToast(err.response?.data?.message || err.message || 'فشل تسجيل الدفعة')
                  } finally {
                    setIsSubmittingPayment(false)
                  }
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSubmittingPayment ? 'جاري الحفظ...' : 'تأكيد وحفظ الدفعة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL SUBSCRIPTION MODAL */}
      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSuccess={() => {
          triggerToast('تم إلغاء الاشتراك بنجاح / Subscription cancelled successfully')
          reloadData()
        }}
        subscriptionId={realSubscription?.id || subId}
        memberName={memberName}
        planName={planName}
      />
    </div>
  )
}

export default SubscriptionDetailPage
