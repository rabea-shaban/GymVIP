import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  Coins,
  Search,
  RefreshCw,
  Info,
  Check,
  Receipt,
  User,
  FileCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/feedback/Toast'
import { paymentsApi } from '../services/paymentsApi'
import { subscriptionsApi } from '@/features/subscriptions/services/subscriptionsApi'
import type { PaymentMethod, WalletProvider, PaymentSummary } from '../types/payment.types'
import type { SubscriptionItem } from '@/features/subscriptions/types/subscription.types'

export const PaymentCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const querySubId = searchParams.get('subscriptionId')
  const queryMemberId = searchParams.get('memberId')
  const toast = useToast()

  // Real Subscriptions / Loading state
  const [subscriptionsList, setSubscriptionsList] = useState<SubscriptionItem[]>([])
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionItem | null>(null)
  const [financialSummary, setFinancialSummary] = useState<PaymentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)

  // Form State
  const [paidAmount, setPaidAmount] = useState<number>(200)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [walletProvider, setWalletProvider] = useState<WalletProvider>('VODAFONE_CASH')
  const [transactionReference, setTransactionReference] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  // Load subscriptions
  const loadSubscriptions = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await subscriptionsApi.list({ limit: 50 })
      setSubscriptionsList(res.subscriptions)

      let targetSub: SubscriptionItem | null = null
      if (querySubId) {
        targetSub = res.subscriptions.find((s) => s.id === querySubId) || null
        if (!targetSub) {
          targetSub = await subscriptionsApi.getById(querySubId).catch(() => null)
        }
      } else if (queryMemberId) {
        // Try to get member's active or latest subscription
        const current = await subscriptionsApi.getMemberCurrent(queryMemberId).catch(() => null)
        if (current) {
          targetSub = current
        } else {
          const mSubs = await subscriptionsApi.getMemberSubscriptions(queryMemberId).catch(() => [])
          if (mSubs && mSubs.length > 0) {
            targetSub = mSubs[0]
          }
        }
      }

      if (!targetSub && res.subscriptions.length > 0) {
        targetSub = res.subscriptions[0]
      }

      if (targetSub) {
        setSelectedSubscription(targetSub)
        try {
          const paymentsRes = await paymentsApi.getSubscriptionPayments(targetSub.id)
          setFinancialSummary(paymentsRes.financialSummary)
          const due = parseFloat(paymentsRes.financialSummary.outstandingAmount)
          setPaidAmount(due > 0 ? due : 0)
        } catch {
          const total = parseFloat(targetSub.planPrice)
          setPaidAmount(total)
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false)
    }
  }, [querySubId, queryMemberId])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  // When selected subscription changes
  const handleSelectSubscription = async (sub: SubscriptionItem) => {
    setSelectedSubscription(sub)
    try {
      const paymentsRes = await paymentsApi.getSubscriptionPayments(sub.id)
      setFinancialSummary(paymentsRes.financialSummary)
      const due = parseFloat(paymentsRes.financialSummary.outstandingAmount)
      setPaidAmount(due > 0 ? due : 0)
    } catch {
      setPaidAmount(parseFloat(sub.planPrice))
    }
  }

  // Calculated values
  const totalSubAmount = selectedSubscription
    ? parseFloat(selectedSubscription.planPrice)
    : 500
  const previouslyPaid = financialSummary
    ? parseFloat(financialSummary.paidAmount)
    : 0
  const totalDue = financialSummary
    ? parseFloat(financialSummary.outstandingAmount)
    : totalSubAmount - previouslyPaid

  const remainingAfterPayment = useMemo(() => {
    return Math.max(0, totalDue - (Number(paidAmount) || 0))
  }, [totalDue, paidAmount])

  const paymentPercentage = useMemo(() => {
    const totalCollected = previouslyPaid + (Number(paidAmount) || 0)
    return Math.min(100, Math.round((totalCollected / (totalSubAmount || 1)) * 100))
  }, [previouslyPaid, paidAmount, totalSubAmount])

  // Filtered subscriptions for search dropdown
  const filteredSubs = useMemo(() => {
    if (!searchQuery.trim()) return subscriptionsList
    const q = searchQuery.toLowerCase()
    return subscriptionsList.filter(
      (s) =>
        s.member?.name?.toLowerCase().includes(q) ||
        s.member?.memberCode?.toLowerCase().includes(q) ||
        s.member?.phone?.includes(q) ||
        s.planName.toLowerCase().includes(q)
    )
  }, [subscriptionsList, searchQuery])

  // Handle Save
  const handleSavePayment = async () => {
    if (!selectedSubscription) {
      toast.error('يرجى اختيار اشتراك صالح لتحصيل الدفعة')
      return
    }

    if (paidAmount <= 0) {
      toast.error('يرجى تحديد المبلغ المراد تحصيله (أكبر من 0)')
      return
    }

    if (paidAmount > totalDue) {
      toast.error('المبلغ المدفوع أكبر من المبلغ المستحق')
      return
    }

    try {
      setIsSubmitting(true)
      const created = await paymentsApi.create({
        subscriptionId: selectedSubscription.id,
        amount: Number(paidAmount),
        method: paymentMethod,
        walletProvider: paymentMethod === 'WALLET' ? walletProvider : null,
        transactionReference: transactionReference.trim() || null,
        notes: notes.trim() || null,
      })

      setShowConfirmModal(false)
      toast.success(`تم تحصيل مبلغ ${paidAmount} ج.م بنجاح!`)
      setTimeout(() => {
        navigate(`/app/payments/${created.id}`)
      }, 500)
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'فشل حفظ الدفعة'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-20 font-cairo">
      {/* Breadcrumbs & Header */}
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
            <span
              onClick={() => navigate('/app/payments')}
              className="hover:text-zinc-700 cursor-pointer"
            >
              المالية
            </span>
            <span>&gt;</span>
            <span
              onClick={() => navigate('/app/payments')}
              className="hover:text-zinc-700 cursor-pointer"
            >
              المدفوعات
            </span>
            <span>&gt;</span>
            <span className="text-zinc-900 font-bold">تسجيل دفعة</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950">تسجيل دفعة جديدة</h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            سجّل دفعة نقدية أو عبر محفظة إلكترونية لاشتراك العضو بالخزينة.
          </p>
        </div>

        {/* Back Button */}
        <button
          type="button"
          onClick={() => {
            if (paidAmount > 0 && selectedSubscription) {
              setShowUnsavedModal(true)
            } else {
              navigate('/app/payments')
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-xs sm:text-sm font-bold hover:bg-zinc-50 transition-colors shadow-2xs"
        >
          <span>العودة إلى المدفوعات</span>
          <ArrowLeft className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* 3. Main Form Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* RIGHT COLUMN: Step Cards (8 cols) */}
        <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
          {/* CARD 1: اختيار العضو والاشتراك */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-zinc-900" />
                <h3 className="text-sm sm:text-base font-black text-zinc-950">اختيار العضو والاشتراك</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                {selectedSubscription ? 'تم تحديد الاشتراك' : 'اختر اشتراكاً'}
              </span>
            </div>

            {/* Search & Select subscription dropdown */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث باسم العضو أو رقم الهاتف أو كود العضوية..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all font-medium text-zinc-900"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Search className="w-4 h-4" />
                </div>
              </div>

              {searchQuery && filteredSubs.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100 bg-white shadow-lg">
                  {filteredSubs.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => {
                        handleSelectSubscription(sub)
                        setSearchQuery('')
                      }}
                      className="p-3 hover:bg-zinc-50 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-zinc-950">{sub.member?.name || 'عضو'}</span>
                        <span className="text-zinc-500 font-mono mr-2">({sub.member?.memberCode})</span>
                        <span className="text-zinc-400 mr-2">• {sub.planName}</span>
                      </div>
                      <span className="font-mono font-bold text-zinc-900">{Number(sub.planPrice).toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Member Profile Bar */}
            {selectedSubscription ? (
              <div className="p-3.5 rounded-2xl bg-zinc-50/80 border border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-950 text-white flex items-center justify-center font-black text-sm relative">
                    <span>{selectedSubscription.member?.name ? selectedSubscription.member.name.charAt(0) : 'ع'}</span>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-zinc-950">{selectedSubscription.member?.name}</h4>
                      <span className="text-[10px] font-mono text-zinc-500 bg-white border border-zinc-200 px-1.5 py-0.5 rounded">
                        {selectedSubscription.member?.memberCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mt-0.5">
                      <span>{selectedSubscription.member?.phone}</span>
                      <span>•</span>
                      <span className="font-cairo text-zinc-600">اشتراك {selectedSubscription.planName}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSearchQuery(' ')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-xs font-bold hover:bg-zinc-100 transition-colors self-start sm:self-auto shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                  <span>تغيير الاشتراك</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold text-center">
                لم يتم تحديد اشتراك حتى الآن. اختر اشتراكاً من القائمة أعلاه.
              </div>
            )}
          </div>

          {/* CARD 2: الاشتراك المرتبط بالدفعة */}
          {selectedSubscription && (
            <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-zinc-900" />
                  <h3 className="text-sm sm:text-base font-black text-zinc-950">
                    الاشتراك المرتبط بالدفعة
                  </h3>
                </div>
                {totalDue > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                    <AlertTriangle className="w-3 h-3" />
                    <span>عليه مبلغ مستحق</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>مدفوع بالكامل</span>
                  </span>
                )}
              </div>

              {/* Plan Details 3 Columns */}
              <div className="p-4 rounded-2xl bg-zinc-50/80 border border-zinc-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 block font-bold">الخطة التدريبية:</span>
                  <p className="font-black text-zinc-950 mt-0.5">{selectedSubscription.planName}</p>
                  <p className="text-[10px] text-zinc-500">المدة: {selectedSubscription.durationDays} يوم</p>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 block font-bold">فترة الاشتراك:</span>
                  <p className="font-mono font-bold text-zinc-900 mt-0.5">
                    {selectedSubscription.startDate ? selectedSubscription.startDate.split('T')[0] : ''} ←{' '}
                    {selectedSubscription.endDate ? selectedSubscription.endDate.split('T')[0] : ''}
                  </p>
                  <p className="text-[10px] text-zinc-500">الحالة: {selectedSubscription.effectiveStatus || selectedSubscription.status}</p>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 block font-bold">إجمالي قيمة الاشتراك:</span>
                  <p className="font-mono font-black text-zinc-950 text-base mt-0.5">
                    {totalSubAmount.toLocaleString('ar-EG')} ج.م
                  </p>
                  <p className="text-[10px] text-zinc-400">سعر تاريخي ثابت</p>
                </div>
              </div>

              {/* Financial Progress & Dues */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Box 1: Previously Paid */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                  <span className="text-[11px] text-zinc-500">المسدد سابقاً:</span>
                  <p className="text-xl font-black text-zinc-950 font-mono">
                    {previouslyPaid.toLocaleString('ar-EG')} <span className="text-xs font-normal">ج.م</span>
                  </p>
                  <p className="text-[10px] text-zinc-400">إجمالي الدفعات المسجلة</p>
                </div>

                {/* Box 2: Currently Due */}
                <div className="p-3.5 rounded-2xl bg-[#FEFCE8] border border-[#F4D76A] space-y-1">
                  <span className="text-[11px] text-amber-900 font-bold">المبلغ المستحق حالياً:</span>
                  <p className="text-2xl font-black text-zinc-950 font-mono">
                    {totalDue.toLocaleString('ar-EG')} <span className="text-xs font-normal">ج.م</span>
                  </p>
                  <p className="text-[10px] text-amber-900 font-medium">الحد الأقصى للتحصيل</p>
                </div>

                {/* Box 3: Payment Progress Bar */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-1.5 flex flex-col justify-center">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">نسبة السداد:</span>
                    <span className="font-bold text-zinc-900 font-mono">{paymentPercentage}%</span>
                  </div>
                  <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#F4D76A] h-full rounded-full transition-all duration-300"
                      style={{ width: `${paymentPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CARD 3: بيانات الدفعة */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-zinc-900" />
                <h3 className="text-sm sm:text-base font-black text-zinc-950">بيانات الدفعة</h3>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">
                العملة: الجنيه المصري (ج.م)
              </span>
            </div>

            {/* Field: Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800">
                  المبلغ المراد تحصيله <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FEFCE8] text-amber-900 border border-[#F4D76A]/60 font-mono">
                  المبلغ المستحق: {totalDue} ج.م
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={totalDue}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  className="w-full pr-4 pl-16 py-3 text-lg font-black font-mono bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all text-zinc-900"
                />
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-xs font-bold text-zinc-500 pointer-events-none">
                  ج.م
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 text-xs pt-1">
                <span className="text-[10px] text-zinc-400 font-medium">سداد سريع:</span>
                <button
                  type="button"
                  onClick={() => setPaidAmount(totalDue)}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-[11px] font-bold transition-colors font-mono"
                >
                  سداد كامل المستحق ({totalDue} ج.م)
                </button>
                {totalDue > 1 && (
                  <button
                    type="button"
                    onClick={() => setPaidAmount(Math.round(totalDue / 2))}
                    className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-[11px] font-bold transition-colors font-mono"
                  >
                    سداد نصف المبلغ ({Math.round(totalDue / 2)} ج.م)
                  </button>
                )}
              </div>
            </div>

            {/* Field: Payment Method */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-zinc-800">
                طريقة الدفع <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Cash */}
                <div
                  onClick={() => setPaymentMethod('CASH')}
                  className={cn(
                    'p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between',
                    paymentMethod === 'CASH'
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Coins className={cn('w-5 h-5', paymentMethod === 'CASH' ? 'text-gym-gold' : 'text-zinc-500')} />
                    <div>
                      <h4 className="text-xs font-bold">نقدي (كاش بالدرج)</h4>
                      <p className={cn('text-[10px]', paymentMethod === 'CASH' ? 'text-zinc-400' : 'text-zinc-500')}>
                        توريد مباشر لعهدة الخزينة
                      </p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border flex items-center justify-center',
                      paymentMethod === 'CASH' ? 'border-gym-gold bg-gym-gold' : 'border-zinc-300'
                    )}
                  >
                    {paymentMethod === 'CASH' && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />}
                  </div>
                </div>

                {/* E-Wallet */}
                <div
                  onClick={() => setPaymentMethod('WALLET')}
                  className={cn(
                    'p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between',
                    paymentMethod === 'WALLET'
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Wallet className={cn('w-5 h-5', paymentMethod === 'WALLET' ? 'text-gym-gold' : 'text-zinc-500')} />
                    <div>
                      <h4 className="text-xs font-bold">محفظة إلكترونية</h4>
                      <p className={cn('text-[10px]', paymentMethod === 'WALLET' ? 'text-zinc-400' : 'text-zinc-500')}>
                        فودافون كاش / إنستاباي / أورنج / وي / اتصالات
                      </p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border flex items-center justify-center',
                      paymentMethod === 'WALLET' ? 'border-gym-gold bg-gym-gold' : 'border-zinc-300'
                    )}
                  >
                    {paymentMethod === 'WALLET' && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Provider selection (if WALLET) */}
            {paymentMethod === 'WALLET' && (
              <div className="space-y-2 pt-2 animate-in fade-in duration-200">
                <label className="block text-xs font-bold text-zinc-800">
                  مزوّد المحفظة الإلكترونية <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'VODAFONE_CASH', label: 'فودافون كاش' },
                    { id: 'INSTAPAY', label: 'إنستاباي (InstaPay)' },
                    { id: 'ORANGE_CASH', label: 'أورنج كاش' },
                    { id: 'ETISALAT_CASH', label: 'اتصالات كاش' },
                    { id: 'WE', label: 'وي باي (WE Pay)' },
                    { id: 'OTHER', label: 'محفظة أخرى' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setWalletProvider(p.id as WalletProvider)}
                      className={cn(
                        'p-2.5 rounded-xl border text-xs font-bold transition-all text-center',
                        walletProvider === p.id
                          ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                          : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reference & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  رقم المرجع / العملية الخارجية
                </label>
                <input
                  type="text"
                  placeholder={paymentMethod === 'WALLET' ? 'مثال: WLT-829341 أو رقم التحويل' : 'اختياري'}
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-mono focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">تاريخ الدفع</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-mono font-bold text-zinc-900"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-zinc-800">ملاحظات إضافية</label>
                <span className="text-[10px] text-zinc-400">اختياري</span>
              </div>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف أي تفاصيل أو ملاحظات عن عملية الدفع أو التوريد..."
                className="w-full p-3 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: Sticky Live Summary Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-5 order-1 lg:order-2 lg:sticky lg:top-4">
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-zinc-950" />
                <h3 className="text-sm font-black text-zinc-950">ملخص الدفعة</h3>
              </div>
              <span className="text-[10px] font-bold text-zinc-400">معاينة فورية</span>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-600">
                <span>المبلغ المستحق حالياً:</span>
                <span className="font-mono font-bold text-zinc-900">{totalDue.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span>الدفعة الحالية المسددة:</span>
                <span className="font-mono font-bold text-rose-600">-{paidAmount} ج.م</span>
              </div>

              {/* Remaining Result Box */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">المتبقي بعد الدفع:</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-zinc-950 font-mono">
                      {remainingAfterPayment.toLocaleString('ar-EG')}
                    </span>
                    <span className="text-xs font-bold text-zinc-500">ج.م</span>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-200/60 flex items-center justify-between">
                  <span>طريقة السداد:</span>
                  <span className="font-bold text-zinc-800">
                    {paymentMethod === 'CASH' ? 'نقدي (كاش)' : `محفظة (${walletProvider})`}
                  </span>
                </div>
              </div>
            </div>

            {/* Status notification banner */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-950 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span className="font-black text-amber-900">
                  {remainingAfterPayment === 0 ? 'سداد كامل المبلغ' : 'سداد دفعة جزئية'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F4D76A] text-amber-950 mr-auto">
                  {remainingAfterPayment === 0 ? 'خالص' : 'متبقي'}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed pr-6">
                {remainingAfterPayment === 0
                  ? 'سيتم إغلاق المديونية بالكامل وتحديث حالة الاشتراك إلى خالص.'
                  : `سيظل متبقي مبلغ ${remainingAfterPayment} ج.م على ذمة الاشتراك لحين سداده.`}
              </p>
            </div>

            {/* Action CTA Button */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                disabled={isSubmitting || isLoading || !selectedSubscription}
                onClick={() => setShowConfirmModal(true)}
                className="w-full py-3 px-4 rounded-xl bg-[#F4D76A] hover:bg-gym-gold text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ الدفعة وتأكيد العملية'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/app/payments')}
                className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 text-center transition-colors block"
              >
                إلغاء العملية
              </button>
            </div>

            {/* Signature footer */}
            <div className="pt-2 border-t border-zinc-100 flex items-center gap-1.5 text-[10px] text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-gym-gold shrink-0" />
              <span>معاملة مالية معتمدة ومحصنة ضد التعديل أو الحذف.</span>
            </div>
          </div>

          {/* Cashier Policy Reminder Box */}
          <div className="p-4 rounded-2xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-zinc-800">
              <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>سياسة الخزينة في GymVIP:</span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed pr-5">
              تُقيد المبالغ المحصلة فوراً في الإيرادات، ويتم إصدار رقم إيصال معتمد للطباعة الحرارية.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL 1: Payment Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FEFCE8] text-gym-gold-dark flex items-center justify-center mx-auto border border-[#F4D76A]">
              <FileCheck className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black text-zinc-950 text-center">
              تأكيد استلام وتوثيق الدفعة
            </h3>

            <p className="text-xs text-zinc-500 text-center leading-relaxed">
              أنت على وشك توثيق استلام مبلغ{' '}
              <span className="font-black text-zinc-950 font-mono">{paidAmount} ج.م</span> من العضو{' '}
              <span className="font-bold text-zinc-900">{selectedSubscription?.member?.name}</span>.
            </p>

            <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">طريقة الدفع:</span>
                <span className="font-bold">
                  {paymentMethod === 'CASH' ? 'نقدي (كاش)' : `محفظة (${walletProvider})`}
                </span>
              </div>
              {transactionReference && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">المرجع:</span>
                  <span className="font-mono font-bold">{transactionReference}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">المتبقي بعد هذه الدفعة:</span>
                <span className="font-mono font-bold text-emerald-700">{remainingAfterPayment} ج.م</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={isSubmitting}
                onClick={handleSavePayment}
                className="flex-1 py-2.5 rounded-xl bg-[#F4D76A] hover:bg-gym-gold text-zinc-950 text-xs font-black transition-all shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'جاري التأكيد...' : 'تأكيد واستخراج الإيصال'}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50"
              >
                مراجعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-zinc-900 text-center">
              تنبيه: توجد بيانات دفعة لم يتم حفظها
            </h3>
            <p className="text-xs text-zinc-500 text-center leading-relaxed">
              هل تريد مغادرة صفحة تسجيل الدفعة دون حفظ المبلغ في الخزينة؟
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800"
              >
                متابعة التسجيل
              </button>
              <button
                onClick={() => navigate('/app/payments')}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50"
              >
                مغادرة بدون حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentCreatePage
