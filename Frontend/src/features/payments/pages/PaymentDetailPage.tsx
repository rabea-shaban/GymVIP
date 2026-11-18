import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Printer,
  Receipt,
  MoreVertical,
  CheckCircle2,
  CreditCard,
  Tag,
  AlertTriangle,
  ChevronLeft,
  Copy,
  Building,
  User,
  ShieldCheck,
  X,
  Wallet,
  Smartphone,
  RotateCcw,
  DollarSign
} from 'lucide-react'
import { paymentsApi } from '../services/paymentsApi'
import type { PaymentItem, PaymentSummary } from '../types/payment.types'
import { useRealtimeSync } from '@/services/socket'

export const PaymentDetailPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const paymentId = id || 'PAY-00491'

  // Real Data State
  const [realPayment, setRealPayment] = useState<PaymentItem | null>(null)
  const [subPayments, setSubPayments] = useState<PaymentItem[]>([])
  const [financialSummary, setFinancialSummary] = useState<PaymentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Toast
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('تمت العملية بنجاح')

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3500)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text)
    triggerToast(`تم نسخ: ${text}`)
  }

  const handlePrint = () => {
    triggerToast('جارٍ تجهيز وإرسال الإيصال إلى الطابعة...')
    setTimeout(() => {
      window.print?.()
    }, 600)
  }

  const loadPaymentData = useCallback(async () => {
    if (!id) return
    try {
      setIsLoading(true)
      setHasError(false)
      const data = await paymentsApi.getById(id)
      setRealPayment(data)

      if (data.subscriptionId) {
        try {
          const subRes = await paymentsApi.getSubscriptionPayments(data.subscriptionId)
          setSubPayments(subRes.payments)
          setFinancialSummary(subRes.financialSummary)
        } catch {
          // ignore secondary error
        }
      }
    } catch {
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadPaymentData()
  }, [loadPaymentData])

  // Instant Real-Time WebSocket updates for Payment Details
  useRealtimeSync(undefined, () => {
    loadPaymentData()
  })

  // Computed data
  const isCash = realPayment?.method === 'CASH'
  const currentPaymentId = realPayment?.id || paymentId
  const amount = realPayment ? parseFloat(realPayment.amount) : 0
  const methodTitle = realPayment
    ? (realPayment.method === 'CASH'
        ? 'نقدي (كاش)'
        : `محفظة إلكترونية (${realPayment.walletProvider || 'إلكترونية'})`)
    : 'نقدي (كاش)'
  const referenceNo = realPayment?.transactionReference || '—'
  const paymentDate = realPayment
    ? new Date(realPayment.createdAt).toLocaleString('ar-EG-u-nu-latn', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  const memberName = realPayment?.member?.name || '—'
  const memberCode = realPayment?.member?.memberCode || '—'
  const memberPhone = realPayment?.member?.phone || '—'
  const staffName = realPayment?.createdByUser?.name || 'كاشير الفرع'
  const staffRole = realPayment?.createdByUser?.role || 'موظف'
  const planName = realPayment?.subscription?.planName || '—'
  const planPrice = realPayment?.subscription?.planPrice ? parseFloat(realPayment.subscription.planPrice) : 0
  const subCode = realPayment?.subscriptionId || '—'
  const startDate = realPayment?.subscription?.startDate ? realPayment.subscription.startDate.split('T')[0] : '—'
  const endDate = realPayment?.subscription?.endDate ? realPayment.subscription.endDate.split('T')[0] : '—'

  const totalPaid = financialSummary ? parseFloat(financialSummary.paidAmount) : amount
  const remainingDebt = financialSummary ? parseFloat(financialSummary.outstandingAmount) : 0
  const paidPercent = financialSummary && planPrice > 0
    ? Math.min(100, Math.round((totalPaid / planPrice) * 100))
    : 100

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-cairo">
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

      {/* Error Alert */}
      {hasError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold">تعذر جلب تفاصيل الإيصال المالي ({paymentId})</div>
              <div className="text-xs text-rose-700 mt-0.5">
                لم يتم العثور على الإيصال أو حدث خطأ في استجابة الخزينة.
              </div>
            </div>
          </div>
          <button
            onClick={() => loadPaymentData()}
            className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Breadcrumb & Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 mb-1.5">
            <span
              onClick={() => navigate('/app/dashboard')}
              className="hover:text-zinc-700 cursor-pointer"
            >
              لوحة التحكم
            </span>
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            <button
              onClick={() => navigate('/app/payments')}
              className="hover:text-zinc-700 transition"
            >
              المدفوعات
            </button>
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-700">تفاصيل الدفعة ({currentPaymentId})</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tight">تفاصيل الدفعة</h1>
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-zinc-100 text-zinc-700 font-mono">
              {currentPaymentId}
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1 font-medium">
            عرض تفاصيل العملية المالية والاشتراك المرتبط بها وإيصال التحصيل المعتمد للنادي.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-zinc-950 text-white hover:bg-zinc-800 shadow-sm transition active:scale-95"
          >
            <Printer className="w-4 h-4 text-[#F5D86B]" />
            <span>طباعة الإيصال الرسمي</span>
          </button>

          <button
            onClick={() => triggerToast('خيارات إضافية: إرسال عبر واتساب، تصدير PDF')}
            className="p-2.5 rounded-xl bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Immutable Ledger Security Warning Box */}
      <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-zinc-700 font-semibold">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            سجل مالي غير قابل للتعديل (Immutable Ledger): وفقاً لمعايير التدقيق المالي في GymVIP، لا يمكن تعديل أو مسح أي دفعة بعد تسجيلها لحماية الإيرادات.
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-200 text-zinc-700 shrink-0">
          معتمد وموثق
        </span>
      </div>

      {/* Top Transaction Hero Banner */}
      {isLoading ? (
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-sm space-y-4 animate-pulse">
          <div className="h-16 bg-zinc-100 rounded-xl"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-20 bg-zinc-100 rounded-xl"></div>
            <div className="h-20 bg-zinc-100 rounded-xl"></div>
            <div className="h-20 bg-zinc-100 rounded-xl"></div>
            <div className="h-20 bg-zinc-100 rounded-xl"></div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Wallet className="w-7 h-7 text-[#F5D86B]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black text-zinc-950 font-mono">
                  {currentPaymentId}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ● مكتملة ومودعة بالخزينة
                </span>
              </div>
              <div className="text-xs text-zinc-500 font-semibold mt-1 flex flex-wrap items-center gap-2">
                <span>{paymentDate}</span>
                <span>•</span>
                <span>مرجع المعاملة: {referenceNo}</span>
              </div>
            </div>
          </div>

          <div className="text-left self-end sm:self-auto">
            <div className="text-xs text-zinc-400 font-medium">المبلغ الإجمالي للعملية</div>
            <div className="text-3xl font-black text-zinc-950 mt-0.5">
              {amount.toLocaleString('ar-EG')} <span className="text-base font-bold text-zinc-600">ج.م</span>
            </div>
            <div className="text-[11px] text-zinc-400 font-medium font-mono">EGP {amount.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* 4 Financial & Method Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Current Payment Amount */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500">مبلغ الدفعة الحالية</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-zinc-950 font-mono">
              {amount.toLocaleString('ar-EG')} <span className="text-sm font-bold text-zinc-500 font-cairo">ج.م</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">قيمة العملية المالية المسجلة</div>
          </div>
        </div>

        {/* Card 2: Payment Method */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#FAF0D3] text-[#7E6517] border border-[#ECD9A2] flex items-center justify-center">
              {isCash ? <DollarSign className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </div>
            <span className="text-xs font-bold text-zinc-500">طريقة الدفع المعتمدة</span>
          </div>
          <div className="mt-3">
            <div className="text-lg sm:text-xl font-black text-zinc-950 truncate">
              {methodTitle}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {isCash ? 'تم الاستلام نقداً بالخزينة' : `مرجع: ${referenceNo}`}
            </div>
          </div>
        </div>

        {/* Card 3: Total Paid for Subscription */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500">المسدد للاشتراك حتى الآن</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
              {totalPaid.toLocaleString('ar-EG')} <span className="text-sm font-bold text-emerald-700 font-cairo">ج.م</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">من أصل {planPrice.toLocaleString('ar-EG')} ج.م ({paidPercent}%)</div>
          </div>
        </div>

        {/* Card 4: Remaining Debt */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500">المتبقي للاشتراك</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">
              {remainingDebt.toLocaleString('ar-EG')} <span className="text-sm font-bold text-rose-700 font-cairo">ج.م</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {remainingDebt === 0 ? 'مسدد بالكامل' : 'مستحق غير مسدد'}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Column in RTL (~65% width): Core Details, Subscription Card, All Payments Table, Timeline */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Official Financial Transaction Details */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#B8941F]" />
                <h3 className="text-base font-black text-zinc-950">
                  بيانات العملية المالية الرسمية
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-700">
                خزينة الفرع
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-xs">
              <div>
                <span className="text-zinc-400 block mb-1">رقم العملية (Payment ID)</span>
                <span className="font-mono font-bold text-zinc-950 text-sm">{currentPaymentId}</span>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1">نوع المعاملة</span>
                <span className="font-bold text-zinc-950 text-sm">تحصيل اشتراك رياضي</span>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1">المبلغ المسدد بالأرقام</span>
                <span className="font-black text-zinc-950 text-sm font-mono">{amount.toLocaleString('ar-EG')} ج.م</span>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1">العملة الرسمية</span>
                <span className="font-bold text-zinc-800 text-xs">الجنيه المصري (EGP)</span>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1">طريقة الدفع المعتمدة</span>
                <span className="font-bold text-zinc-900 text-xs">{methodTitle}</span>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1">رقم المرجع الخارجي</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-zinc-900">
                  <span>{referenceNo}</span>
                  {!isCash && (
                    <button
                      onClick={() => copyToClipboard(referenceNo)}
                      className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1">تاريخ ووقت التحصيل</span>
                <span className="font-bold text-zinc-900">{paymentDate}</span>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1">الحالة المالية</span>
                <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  مكتملة ومودعة بالحساب
                </span>
              </div>
            </div>

            {/* Collected By Staff Member */}
            <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-950 text-white flex items-center justify-center font-bold text-xs">
                  {staffName.charAt(0)}
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400">سجلت بواسطة الموظف:</div>
                  <div className="font-bold text-zinc-950">{staffName}</div>
                  <div className="text-[10px] text-zinc-500">
                    {staffRole} — الخزينة الرئيسية
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {realPayment?.notes && (
              <div className="p-3.5 bg-[#FAF8F2] border border-[#ECD9A2] rounded-xl text-xs space-y-1">
                <div className="font-bold text-[#7E6517]">ملاحظات التحصيل المسجلة:</div>
                <p className="text-zinc-700 leading-relaxed">
                  "{realPayment.notes}"
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Linked Subscription */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-zinc-700" />
                  <h3 className="text-base font-black text-zinc-950">الاشتراك المرتبط بالعملية</h3>
                </div>
                <div className="text-xs text-zinc-400 font-mono mt-0.5">كود الاشتراك: {subCode}</div>
              </div>

              <button
                onClick={() => navigate(`/app/subscriptions/${subCode}`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition"
              >
                <span>عرض تفاصيل الاشتراك</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70">
                <span className="text-zinc-400 block mb-1">الباقة الرياضية</span>
                <span className="font-bold text-zinc-950 block">{planName}</span>
                <span className="text-[11px] text-zinc-500 mt-0.5 block">قيمة العقد: {planPrice.toLocaleString('ar-EG')} ج.م</span>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70">
                <span className="text-zinc-400 block mb-1">فترة سريان الاشتراك</span>
                <span className="font-bold text-zinc-950 block font-mono">{startDate} ← {endDate}</span>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70">
                <span className="text-zinc-400 block mb-1">حالة الاشتراك</span>
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
                  ● ساري ونشط
                </span>
              </div>
            </div>

            {/* Financial Status Box */}
            <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-zinc-700">موقف سداد قيمة الاشتراك</span>
                <span className="text-zinc-900">{paidPercent}% مسدد</span>
              </div>
              <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${paidPercent}%` }}></div>
              </div>
              <div className="flex justify-between text-zinc-600 pt-1">
                <span>تم سداد: <strong className="text-emerald-700 font-mono">{totalPaid.toLocaleString('ar-EG')} ج.م</strong></span>
                <span>المتبقي: <strong className="text-rose-600 font-mono">{remainingDebt.toLocaleString('ar-EG')} ج.م</strong></span>
                <span>الإجمالي التعاقدي: <strong className="text-zinc-900 font-mono">{planPrice.toLocaleString('ar-EG')} ج.م</strong></span>
              </div>
            </div>
          </div>

          {/* Card 3: All Payments Table for This Subscription */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-zinc-700" />
                <h3 className="text-base font-black text-zinc-950">
                  سجل دفعات هذا الاشتراك ({subPayments.length || 1})
                </h3>
              </div>
              <span className="text-xs text-zinc-400 font-medium">
                المجموع المسدد: {totalPaid.toLocaleString('ar-EG')} ج.م
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-zinc-50/80 text-zinc-500 font-bold border-y border-zinc-100">
                    <th className="py-3 px-4">رقم الدفعة</th>
                    <th className="py-3 px-3">المبلغ</th>
                    <th className="py-3 px-3">طريقة الدفع</th>
                    <th className="py-3 px-3">المرجع</th>
                    <th className="py-3 px-3">تاريخ الدفع</th>
                    <th className="py-3 px-3 text-center">الحالة</th>
                    <th className="py-3 px-4 text-left">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {subPayments.length > 0 ? (
                    subPayments.map((p) => (
                      <tr
                        key={p.id}
                        className={p.id === currentPaymentId ? 'bg-[#FAF8F2]' : 'hover:bg-zinc-50 transition'}
                      >
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
                          {p.id === currentPaymentId ? (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-zinc-950 text-white">
                              قيد المشاهدة
                            </span>
                          ) : (
                            <button
                              onClick={() => navigate(`/app/payments/${p.id}`)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition"
                            >
                              عرض الدفعة
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="bg-[#FAF8F2]">
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-950">{currentPaymentId}</td>
                      <td className="py-3.5 px-3 font-black text-zinc-950 text-sm font-mono">{amount} ج.م</td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 font-bold text-[11px]">
                          <span>{methodTitle}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-zinc-500">{referenceNo}</td>
                      <td className="py-3.5 px-3 font-medium text-zinc-700">{paymentDate}</td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          مكتملة
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-zinc-950 text-white">
                          الدفعة الحالية
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Left Column in RTL (~35% width): Thermal Receipt Live Preview & Member Card */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Realistic Thermal Paper Receipt Preview */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-black text-zinc-950">معاينة الإيصال المعتمد</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-600">
                إيصال رسمي
              </span>
            </div>

            {/* Thermal Receipt Body */}
            <div className="bg-[#FAF9F5] border-2 border-dashed border-zinc-300 rounded-2xl p-5 text-center space-y-4 text-xs font-mono shadow-inner relative">
              {/* Gym Header */}
              <div className="space-y-1">
                <div className="w-12 h-12 rounded-xl bg-zinc-950 text-white flex items-center justify-center mx-auto mb-1 overflow-hidden">
                  {realPayment?.gym?.logo ? (
                    <img src={realPayment.gym.logo} alt={realPayment.gym.name} className="w-full h-full object-contain" />
                  ) : (
                    <Building className="w-5 h-5 text-[#F5D86B]" />
                  )}
                </div>
                <div className="font-black text-zinc-950 text-sm font-cairo tracking-wide">
                  {realPayment?.gym?.name || 'GymVIP Fitness'}
                </div>
                <div className="text-[10px] text-zinc-500 font-cairo">
                  {realPayment?.gym?.address || 'القاهرة — جمهورية مصر العربية'}
                </div>
                <div className="text-[10px] font-bold bg-zinc-200/70 text-zinc-800 px-2 py-0.5 rounded inline-block font-cairo">
                  إيصال تحصيل نقدية / إلكتروني
                </div>
              </div>

              <div className="h-px bg-zinc-300 border-b border-dashed border-zinc-400"></div>

              {/* Receipt Details */}
              <div className="space-y-1.5 text-right font-cairo text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">رقم الإيصال:</span>
                  <span className="font-bold text-zinc-950 font-mono">{currentPaymentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">التاريخ:</span>
                  <span className="text-zinc-800">{paymentDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">اسم العضو:</span>
                  <span className="font-bold text-zinc-950">{memberName} ({memberCode})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">نوع الاشتراك:</span>
                  <span className="text-zinc-800">{planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">طريقة الدفع:</span>
                  <span className="font-bold text-zinc-900">{methodTitle}</span>
                </div>
                {referenceNo && referenceNo !== '—' && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">رقم المرجع:</span>
                    <span className="font-mono text-zinc-700">{referenceNo}</span>
                  </div>
                )}
              </div>

              <div className="h-px bg-zinc-300 border-b border-dashed border-zinc-400"></div>

              {/* Totals */}
              <div className="p-2.5 bg-zinc-100 rounded-xl space-y-1 font-cairo">
                <div className="flex justify-between text-xs font-black text-zinc-950">
                  <span>المبلغ المستلم:</span>
                  <span className="font-mono">{amount.toLocaleString('ar-EG')} ج.م</span>
                </div>
                <div className="flex justify-between text-[11px] font-semibold text-rose-600">
                  <span>المتبقي على الاشتراك:</span>
                  <span className="font-mono">{remainingDebt.toLocaleString('ar-EG')} ج.م</span>
                </div>
              </div>

              <div className="text-[10px] text-zinc-500 space-y-0.5 font-cairo pt-1">
                <div>الموظف المسؤول: {staffName}</div>
                <div className="font-bold text-zinc-900">شكراً لاختياركم {realPayment?.gym?.name || 'GymVIP'}</div>
                <div className="text-[9px] text-zinc-400">إيصال تحصيل رسمي موثق إلكترونياً</div>
              </div>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black bg-zinc-950 text-white hover:bg-zinc-800 shadow-sm transition active:scale-95"
            >
              <Printer className="w-4 h-4 text-[#F5D86B]" />
              <span>طباعة الإيصال (Ctrl + P)</span>
            </button>
          </div>

          {/* Card 2: Paying Member Details */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-black text-zinc-950">بيانات العضو</h3>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                عضو نشط
              </span>
            </div>

            <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/70 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {memberName.charAt(0)}
              </div>
              <div>
                <h4 className="font-black text-zinc-950 text-sm">{memberName}</h4>
                <div className="text-xs text-zinc-400 font-mono mt-0.5">كود : {memberCode}</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">رقم الهاتف:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-zinc-900 dir-ltr">{memberPhone}</span>
                  <button
                    onClick={() => copyToClipboard(memberPhone)}
                    className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                    title="نسخ"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500">الرصيد المدين:</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 font-mono">
                  مستحق {remainingDebt.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (realPayment?.memberId) {
                  navigate(`/app/members/${realPayment.memberId}`)
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
        </div>
      </div>
    </div>
  )
}

export default PaymentDetailPage
