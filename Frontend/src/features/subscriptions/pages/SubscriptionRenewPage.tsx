import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Wallet,
  Coins,
  Check,
  ExternalLink,
  Info,
  Clock,
  CheckCheck,
  User,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/feedback/Toast'
import { useAuth } from '@/features/auth/context/AuthContext'
import { subscriptionsApi } from '../services/subscriptionsApi'
import type { SubscriptionItem } from '../types/subscription.types'
import { plansApi } from '@/features/plans/services/plansApi'
import type { PlanItem } from '@/features/plans/types/plan.types'
import { membersApi } from '@/features/members/services/membersApi'
import { paymentsApi } from '@/features/payments/services/paymentsApi'

interface RenewalPlan {
  id: string
  name: string
  tag: string
  tagType: 'gold' | 'amber' | 'slate' | 'vip'
  durationDays: number
  durationText: string
  price: number
  dailyRate: string
}

const DEFAULT_RENEWAL_PLANS: RenewalPlan[] = [
  {
    id: 'monthly',
    name: 'باقة شهري (كلاسيك)',
    tag: 'الأكثر طلباً',
    tagType: 'gold',
    durationDays: 30,
    durationText: 'صلاحية 30 يوماً كاملة',
    price: 500,
    dailyRate: '16.67 ج.م / يوم',
  },
  {
    id: 'quarterly',
    name: 'باقة 3 شهور',
    tag: 'الأعلى توفيراً',
    tagType: 'slate',
    durationDays: 90,
    durationText: 'صلاحية 90 يوماً',
    price: 1300,
    dailyRate: '14.44 ج.م / يوم',
  },
  {
    id: 'semi_annual',
    name: 'باقة 6 شهور',
    tag: 'نصف سنوي',
    tagType: 'slate',
    durationDays: 180,
    durationText: 'صلاحية 180 يوماً',
    price: 2400,
    dailyRate: '13.33 ج.م / يوم',
  },
  {
    id: 'annual_vip',
    name: 'باقة سنوي VIP',
    tag: 'باقة مميزة VIP',
    tagType: 'vip',
    durationDays: 365,
    durationText: 'صلاحية 365 يوماً + 4 جلسات خاصة',
    price: 4000,
    dailyRate: '10.95 ج.م / يوم',
  },
]

export const SubscriptionRenewPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const querySubId = searchParams.get('subscriptionId')
  const queryMemberId = searchParams.get('memberId')
  const { user } = useAuth()
  const toast = useToast()

  // Real Subscription & Plan states
  const [previousSubscription, setPreviousSubscription] = useState<SubscriptionItem | null>(null)
  const [availablePlans, setAvailablePlans] = useState<PlanItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingSub, setIsLoadingSub] = useState(false)

  // Member search state if no subscription is initially provided
  const [memberSearchTerm, setMemberSearchTerm] = useState('')
  const [searchedMembers, setSearchedMembers] = useState<any[]>([])
  const [isSearchingMembers, setIsSearchingMembers] = useState(false)

  // Modals state
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)

  // Current Subscription State
  const [isCurrentSubActive, setIsCurrentSubActive] = useState(false)
  const [currentSubEndDate, setCurrentSubEndDate] = useState('')

  // Selected Renewal Plan
  const [selectedPlanId, setSelectedPlanId] = useState<string>('monthly')

  const effectiveSubId = id || querySubId

  const loadSubById = async (subId: string) => {
    try {
      setIsLoadingSub(true)
      const sub = await subscriptionsApi.getById(subId)
      setPreviousSubscription(sub)
      const effActive = sub.effectiveStatus === 'ACTIVE' || sub.status === 'ACTIVE'
      setIsCurrentSubActive(effActive)
      if (sub.endDate) {
        setCurrentSubEndDate(sub.endDate.split('T')[0])
      }
    } catch {
      toast.error('تعذر تحميل بيانات الاشتراك السابق')
    } finally {
      setIsLoadingSub(false)
    }
  }

  const loadSubByMemberId = async (mId: string) => {
    try {
      setIsLoadingSub(true)
      const current = await subscriptionsApi.getMemberCurrent(mId).catch(() => null)
      if (current) {
        setPreviousSubscription(current)
        const effActive = current.effectiveStatus === 'ACTIVE' || current.status === 'ACTIVE'
        setIsCurrentSubActive(effActive)
        if (current.endDate) {
          setCurrentSubEndDate(current.endDate.split('T')[0])
        }
        return
      }

      const list = await subscriptionsApi.getMemberSubscriptions(mId).catch(() => [])
      if (list && list.length > 0) {
        const newest = list[0]
        setPreviousSubscription(newest)
        const effActive = newest.effectiveStatus === 'ACTIVE' || newest.status === 'ACTIVE'
        setIsCurrentSubActive(effActive)
        if (newest.endDate) {
          setCurrentSubEndDate(newest.endDate.split('T')[0])
        }
      } else {
        setPreviousSubscription(null)
        toast.info('هذا العضو ليس لديه أي اشتراكات سابقة لتجديدها')
      }
    } catch {
      toast.error('تعذر جلب بيانات اشتراك العضو')
    } finally {
      setIsLoadingSub(false)
    }
  }

  // Load Real Data
  useEffect(() => {
    if (effectiveSubId && effectiveSubId !== 'SUB-00841') {
      loadSubById(effectiveSubId)
    } else if (queryMemberId) {
      loadSubByMemberId(queryMemberId)
    }

    plansApi
      .list({ limit: 100 })
      .then((res) => {
        if (res.plans && res.plans.length > 0) {
          const activePlans = res.plans.filter((p) => p.isActive)
          setAvailablePlans(activePlans)
          if (activePlans.length > 0) {
            setSelectedPlanId(activePlans[0].id)
          }
        }
      })
      .catch(() => {})
  }, [effectiveSubId, queryMemberId])

  const handleSearchMembers = async (term: string) => {
    setMemberSearchTerm(term)
    if (!term.trim()) {
      setSearchedMembers([])
      return
    }
    try {
      setIsSearchingMembers(true)
      const res = await membersApi.list({ search: term.trim(), limit: 6 })
      setSearchedMembers(res.members)
    } catch {
      // ignore
    } finally {
      setIsSearchingMembers(false)
    }
  }

  const dynamicRenewalPlans: RenewalPlan[] = useMemo(() => {
    if (availablePlans.length > 0) {
      return availablePlans.map((p, idx) => {
        const pr = parseFloat(p.price)
        const daily = (pr / p.durationDays).toFixed(2)
        return {
          id: p.id,
          name: p.name,
          tag: idx === 0 ? 'الأكثر طلباً' : 'معتمد',
          tagType: (idx === 0 ? 'gold' : 'slate') as 'gold' | 'slate',
          durationDays: p.durationDays,
          durationText: `صلاحية ${p.durationDays} يوماً`,
          price: pr,
          dailyRate: `${daily} ج.م / يوم`,
        }
      })
    }
    return DEFAULT_RENEWAL_PLANS
  }, [availablePlans])

  const selectedPlan = useMemo(
    () => dynamicRenewalPlans.find((p) => p.id === selectedPlanId) || dynamicRenewalPlans[0],
    [selectedPlanId, dynamicRenewalPlans]
  )

  // Start Date Mode: 'auto' | 'custom'
  const [startDateMode, setStartDateMode] = useState<'auto' | 'custom'>('auto')
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0])

  // Financial State
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'WALLET'>('CASH')
  const [paidAmount, setPaidAmount] = useState<number>(selectedPlan.price)

  useEffect(() => {
    setPaidAmount(selectedPlan.price)
  }, [selectedPlan])

  // Notes
  const [notes, setNotes] = useState('')

  // Calculations
  const finalPrice = useMemo(() => {
    return Math.max(0, selectedPlan.price - (discountAmount || 0))
  }, [selectedPlan.price, discountAmount])

  const remainingDebt = useMemo(() => {
    return Math.max(0, finalPrice - (paidAmount || 0))
  }, [finalPrice, paidAmount])

  // Computed Renewal Start Date (Deterministic)
  const computedStartDate = useMemo(() => {
    if (startDateMode === 'custom') {
      return customStartDate
    }
    if (previousSubscription && isCurrentSubActive && previousSubscription.endDate) {
      const prevEnd = new Date(previousSubscription.endDate)
      const nextDay = new Date(prevEnd)
      nextDay.setDate(prevEnd.getDate() + 1)
      return nextDay.toISOString().split('T')[0]
    }
    return new Date().toISOString().split('T')[0]
  }, [startDateMode, customStartDate, previousSubscription, isCurrentSubActive])

  // Computed End Date
  const renewalEndDate = useMemo(() => {
    const days = selectedPlan.durationDays || 30
    const start = new Date(computedStartDate)
    const end = new Date(start)
    end.setDate(start.getDate() + days - 1)
    return end.toLocaleDateString('ar-EG', { day: '2-digit', month: 'long', year: 'numeric' })
  }, [computedStartDate, selectedPlan.durationDays])

  const handleRenewSubmit = async () => {
    if (paidAmount < 0) {
      toast.error('المبلغ المدفوع غير صحيح')
      return
    }

    const targetSubId = previousSubscription?.id || effectiveSubId
    if (!targetSubId) {
      toast.error('يرجى تحديد العضو والاشتراك المراد تجديده')
      return
    }

    if (previousSubscription?.status === 'CANCELLED') {
      toast.error('لا يمكن تجديد اشتراك ملغى مباشرة، يرجى إنشاء اشتراك جديد')
      return
    }

    try {
      setIsSubmitting(true)
      const created = await subscriptionsApi.renew(targetSubId, {
        planId: selectedPlan.id,
        notes: notes.trim() || undefined,
        startDate: computedStartDate,
      })

      // Create Payment if paidAmount > 0
      if (paidAmount > 0) {
        try {
          await paymentsApi.create({
            subscriptionId: created.id,
            amount: Number(paidAmount),
            method: paymentMethod === 'WALLET' ? 'WALLET' : 'CASH',
            walletProvider: paymentMethod === 'WALLET' ? 'INSTAPAY' : undefined,
            notes: 'سداد رسوم تجديد الاشتراك',
          })
        } catch (payErr: any) {
          console.error('Payment error on renewal:', payErr)
        }
      }

      setShowSuccessModal(true)
      toast.success('تم تجديد الاشتراك وتوثيق السداد بنجاح!')
      setTimeout(() => {
        navigate(`/app/subscriptions/${created.id}`)
      }, 1200)
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'تعذر تجديد الاشتراك')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-20 font-cairo">

      {/* 2. Breadcrumbs & Header */}
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
              onClick={() => navigate('/app/subscriptions')}
              className="hover:text-zinc-700 cursor-pointer"
            >
              الاشتراكات
            </span>
            <span>&gt;</span>
            <span className="text-zinc-900 font-bold">تجديد الاشتراك</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-950 text-gym-gold flex items-center justify-center shrink-0 shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950">تجديد الاشتراك</h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            جدّد اشتراك العضو، حدد الباقة المعتمدة، وثّق الدفعة النقدية بسهولة وأمان.
          </p>
        </div>

        {/* Back Button */}
        <button
          type="button"
          onClick={() => {
            navigate('/app/subscriptions')
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-xs sm:text-sm font-bold hover:bg-zinc-50 transition-colors shadow-2xs"
        >
          <span>العودة إلى الاشتراكات</span>
          <ArrowLeft className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* Warning banner if subscription is cancelled */}
      {previousSubscription?.status === 'CANCELLED' && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">هذا الاشتراك ملغي نهائياً</p>
              <p className="text-xs text-rose-700 mt-0.5">
                وفقاً لقواعد النظام، لا يمكن تجديد اشتراك ملغى مباشرة. يرجى إنشاء اشتراك جديد للمشترك.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              navigate(
                previousSubscription?.memberId
                  ? `/app/subscriptions/new?memberId=${previousSubscription.memberId}`
                  : '/app/subscriptions/new'
              )
            }
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm transition"
          >
            + إنشاء اشتراك جديد للمشترك
          </button>
        </div>
      )}

      {/* 3. Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* RIGHT COLUMN: Form Sections (8 cols) */}
        <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
          {/* CARD 1: Member Header Card or Member Search */}
          {!previousSubscription ? (
            <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
                <User className="w-4 h-4 text-gym-gold" />
                <h3 className="text-sm font-black text-zinc-950">تحديد العضو المراد تجديد اشتراكه</h3>
              </div>
              <p className="text-xs text-zinc-500">
                اختر العضو لعرض اشتراكه الحالي وتجديده مباشرة:
              </p>
              {isLoadingSub && (
                <p className="text-xs text-amber-700 font-bold">جاري تحميل بيانات الاشتراك...</p>
              )}
              <div className="relative">
                <input
                  type="text"
                  value={memberSearchTerm}
                  onChange={(e) => handleSearchMembers(e.target.value)}
                  placeholder="ابحث بالاسم، أو رقم الهاتف، أو كود العضوية..."
                  className="w-full px-4 py-3 pr-10 bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none transition-all"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Search className="w-4 h-4" />
                </div>
              </div>
              {isSearchingMembers && (
                <p className="text-xs text-zinc-500 font-bold">جاري البحث في الأعضاء...</p>
              )}
              {searchedMembers.length > 0 && (
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  {searchedMembers.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        setMemberSearchTerm('')
                        setSearchedMembers([])
                        loadSubByMemberId(m.id)
                      }}
                      className="p-3 bg-white hover:bg-amber-50/50 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="font-bold text-xs text-zinc-900">{m.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{m.memberCode} • {m.phone}</p>
                      </div>
                      <button
                        type="button"
                        className="px-3 py-1 bg-zinc-900 text-white text-[11px] font-bold rounded-lg hover:bg-zinc-800"
                      >
                        اختيار وتجديد
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-zinc-950 text-white flex items-center justify-center font-black text-sm relative border border-zinc-800">
                  <span>{previousSubscription.member?.name ? previousSubscription.member.name.slice(0, 2) : 'ع'}</span>
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#F4D76A] border-2 border-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-zinc-950 stroke-[3]" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-zinc-950">
                      {previousSubscription.member?.name || 'عضو المشترك'}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      {previousSubscription.member?.isActive ? 'نشط' : 'عضو'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono mt-0.5">
                    <span>{previousSubscription.member?.memberCode || '-'}</span>
                    <span>•</span>
                    <span dir="ltr">{previousSubscription.member?.phone || ''}</span>
                    <span>•</span>
                    <span className="font-cairo">فرع النادي</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviousSubscription(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <span>تغيير العضو</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (previousSubscription.memberId) {
                      navigate(`/app/members/${previousSubscription.memberId}`)
                    } else {
                      navigate('/app/members')
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                  <span>الملف الكامل</span>
                </button>
              </div>
            </div>
          )}

          {/* CARD 2: الاشتراك الحالي للمشترك */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-900" />
                <h3 className="text-sm font-black text-zinc-950">الاشتراك السابق / الحالي</h3>
              </div>
              <span
                className={cn(
                  'text-[10px] font-bold px-2.5 py-0.5 rounded-full',
                  isCurrentSubActive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                )}
              >
                {isCurrentSubActive ? 'سارٍ حالياً' : 'منتهي الصلاحية'}
              </span>
            </div>

            {/* Current Sub Info Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-zinc-50/80 border border-zinc-200/80 text-xs">
              <div className="space-y-0.5">
                <span className="text-zinc-500 text-[11px]">الباقة السابقة:</span>
                <p className="font-bold text-zinc-900">{previousSubscription?.planName || 'بدون اشتراك سابق'}</p>
                <p className="text-[10px] text-zinc-400">{previousSubscription?.durationDays ? `${previousSubscription.durationDays} يوماً` : '—'}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-zinc-500 text-[11px]">تاريخ البدء:</span>
                <p className="font-mono font-bold text-zinc-800">
                  {previousSubscription?.startDate ? previousSubscription.startDate.split('T')[0] : '—'}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-zinc-500 text-[11px]">تاريخ الانتهاء:</span>
                <p className="font-mono font-black text-rose-600">{currentSubEndDate || '—'}</p>
              </div>
            </div>

            {/* No-Waste Smart Protection Notice */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
              <div className="w-6 h-6 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-xs text-amber-900">
                  نظام الحفاظ الذكي على الفترات (No-Waste System)
                </h4>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {isCurrentSubActive && currentSubEndDate
                    ? `الاشتراك الحالي سارٍ حتى ${currentSubEndDate}. التجديد الجديد سيبدأ تلقائياً في اليوم التالي (${computedStartDate}) بدون ضياع أي أيام.`
                    : `الاشتراك الحالي منتهٍ بالفعل. التجديد الجديد سيبدأ ابتداءً من (${computedStartDate}).`}
                </p>
              </div>
            </div>
          </div>

          {/* CARD 3: اختيار خطة التجديد المعتمدة */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-zinc-900" />
                <h3 className="text-sm font-black text-zinc-950">اختيار خطة التجديد المعتمدة</h3>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500">
              حدد الباقة المطلوبة للعضو:
            </p>

            {/* 2x2 Plan Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {dynamicRenewalPlans.map((plan) => {
                const isSelected = selectedPlanId === plan.id
                return (
                  <div
                    key={plan.id}
                    onClick={() => {
                      setSelectedPlanId(plan.id)
                      setPaidAmount(plan.price)
                    }}
                    className={cn(
                      'rounded-2xl p-4 border text-right cursor-pointer transition-all duration-200 relative',
                      isSelected
                        ? 'bg-[#FEFCE8] border-[#F4D76A] ring-2 ring-[#F4D76A]/40 shadow-xs'
                        : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/60'
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-md',
                          plan.tagType === 'gold' && 'bg-[#F4D76A] text-amber-950',
                          plan.tagType === 'slate' && 'bg-zinc-100 text-zinc-700',
                          plan.tagType === 'vip' && 'bg-zinc-950 text-[#F4D76A]'
                        )}
                      >
                        {plan.tag}
                      </span>
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center transition-all',
                          isSelected
                            ? 'bg-zinc-950 text-white'
                            : 'border-2 border-zinc-300 bg-white'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Title & Sub */}
                    <div className="space-y-0.5 mb-3">
                      <h4 className="text-sm font-black text-zinc-950">{plan.name}</h4>
                      <p className="text-[10px] text-zinc-500">{plan.durationText}</p>
                    </div>

                    {/* Price & Daily Rate */}
                    <div className="flex items-baseline justify-between pt-2 border-t border-zinc-200/60">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-zinc-950 font-mono">
                          {plan.price.toLocaleString('ar-EG')}
                        </span>
                        <span className="text-xs font-bold text-zinc-500">ج.م</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">{plan.dailyRate}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CARD 4: تحديد موعد بدء التجديد واحتساب الصلاحية */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
              <Clock className="w-4 h-4 text-zinc-900" />
              <h3 className="text-sm font-black text-zinc-950">
                تحديد موعد بدء التجديد واحتساب الصلاحية
              </h3>
            </div>

            {/* Option 1: Auto immediately */}
            <div
              onClick={() => setStartDateMode('auto')}
              className={cn(
                'p-4 rounded-2xl border cursor-pointer transition-all space-y-3',
                startDateMode === 'auto'
                  ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/40'
                  : 'bg-zinc-50 border-zinc-200'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border flex items-center justify-center',
                      startDateMode === 'auto'
                        ? 'border-zinc-950 bg-zinc-950'
                        : 'border-zinc-400 bg-white'
                    )}
                  >
                    {startDateMode === 'auto' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-zinc-950">
                    تلقائياً فور انتهاء الاشتراك الحالي (موصى به)
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F4D76A] text-amber-950">
                  حفظ الأيام
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 pr-6">
                يبدأ فوراً من تاريخ انتهاء الفترة الحالية لضمان استمرارية العضوية بدون أي ثغرات زمنية.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white border border-zinc-200">
                  <span className="text-[10px] text-zinc-400 block font-cairo">تاريخ انتهاء الحالي:</span>
                  <span className="font-bold text-zinc-800">{currentSubEndDate || 'منتهٍ'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-zinc-200">
                  <span className="text-[10px] text-zinc-400 block font-cairo">تاريخ بدء التجديد:</span>
                  <span className="font-bold text-amber-900">{computedStartDate}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-zinc-200">
                  <span className="text-[10px] text-zinc-400 block font-cairo">تاريخ انتهاء التجديد:</span>
                  <span className="font-bold text-emerald-800">{renewalEndDate}</span>
                </div>
              </div>
            </div>

            {/* Option 2: Custom date */}
            <div
              onClick={() => setStartDateMode('custom')}
              className={cn(
                'p-4 rounded-2xl border cursor-pointer transition-all space-y-2',
                startDateMode === 'custom'
                  ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/40'
                  : 'bg-zinc-50 border-zinc-200'
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border flex items-center justify-center',
                    startDateMode === 'custom'
                      ? 'border-zinc-950 bg-zinc-950'
                      : 'border-zinc-400 bg-white'
                  )}
                >
                  {startDateMode === 'custom' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <span className="text-xs font-bold text-zinc-950">تحديد تاريخ مخصص يدوياً</span>
              </div>
              <p className="text-[11px] text-zinc-500 pr-6">
                في حال رغبة العضو ببدء الاشتراك من يوم محدد (تجميد مسبق أو سفر مؤقت).
              </p>
              {startDateMode === 'custom' && (
                <div className="pt-2 pr-6 max-w-xs">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-xl font-mono font-bold"
                  />
                </div>
              )}
            </div>

            {/* Timeline track */}
            <div className="pt-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">تسلسل العضوية الزمني:</span>
                <span className="font-bold text-zinc-900 font-mono">
                  فترة اشتراك جديدة ({selectedPlan.durationDays} يوماً)
                </span>
              </div>
              <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden">
                <div className="bg-gym-gold h-full rounded-full w-full" />
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                <span>سابق: {previousSubscription?.startDate ? previousSubscription.startDate.split('T')[0] : '—'}</span>
                <span className="text-amber-900 font-bold">بداية التجديد: {computedStartDate}</span>
                <span>نهاية: {renewalEndDate}</span>
              </div>
            </div>
          </div>

          {/* CARD 5: الحساب المالي وطريقة السداد */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
              <Coins className="w-4 h-4 text-zinc-900" />
              <h3 className="text-sm font-black text-zinc-950">الحساب المالي وطريقة السداد</h3>
            </div>

            {/* 3 boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 space-y-1">
                <span className="text-zinc-500 text-[11px]">سعر الباقة الأساسي:</span>
                <p className="text-xl font-black text-zinc-950 font-mono">
                  {selectedPlan.price} <span className="text-xs font-normal">ج.م</span>
                </p>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 space-y-1">
                <span className="text-zinc-500 text-[11px]">الخصم الإضافي (ج.م):</span>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1 bg-white border border-zinc-300 rounded-lg text-sm font-mono font-bold"
                />
              </div>

              <div className="bg-[#FEFCE8] border border-[#F4D76A] rounded-2xl p-3 space-y-1">
                <span className="text-amber-950 text-[11px] font-bold">المبلغ الصافي المطلوب:</span>
                <p className="text-2xl font-black text-zinc-950 font-mono">
                  {finalPrice} <span className="text-xs font-normal">ج.م</span>
                </p>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-800">طريقة الدفع:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={cn(
                    'p-3 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-xs transition-all',
                    paymentMethod === 'CASH'
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  )}
                >
                  <Coins className="w-4 h-4 text-gym-gold" />
                  <span>نقدي (كاش بالدرج)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('WALLET')}
                  className={cn(
                    'p-3 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-xs transition-all',
                    paymentMethod === 'WALLET'
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  )}
                >
                  <Wallet className="w-4 h-4 text-gym-gold" />
                  <span>محفظة إلكترونية / إنستاباي</span>
                </button>
              </div>
            </div>

            {/* Paid Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  المبلغ المدفوع الآن (ج.م):
                </label>
                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl font-mono font-black text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  حالة المديونية المتبقية:
                </label>
                <div className="w-full px-4 py-2.5 rounded-xl border flex items-center justify-between text-xs bg-zinc-50">
                  <span className="font-mono font-bold text-zinc-900">{remainingDebt} ج.م</span>
                  {remainingDebt === 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F4D76A] text-amber-950">
                      خالص بالكامل
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      مديونية متبقية
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                ملاحظات إضافية على التجديد أو الكابتن (اختياري):
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف أي تفاصيل خاصة (مثلاً: رغبة العضو في تثبيت جدول الكوتش كابتن تامر)..."
                className="w-full p-3 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: Sticky Summary Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-5 order-1 lg:order-2 lg:sticky lg:top-4">
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-sm font-black text-zinc-950">ملخص التجديد والاعتماد</h3>
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-600">
                <span>العضو:</span>
                <span className="font-bold text-zinc-900">
                  {previousSubscription?.member?.name || 'عضو المشترك'}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span>كود العضوية:</span>
                <span className="font-mono font-bold text-zinc-900">
                  {previousSubscription?.member?.memberCode || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span>الباقة المختارة:</span>
                <span className="font-bold text-gym-gold-dark">{selectedPlan.name}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span>تاريخ بدء السريان:</span>
                <span className="font-mono font-bold text-zinc-900">
                  {currentSubEndDate || 'فوراً'}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span>تاريخ انتهاء الصلاحية:</span>
                <span className="font-mono font-bold text-zinc-900">{renewalEndDate}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span>طريقة السداد:</span>
                <span className="font-bold text-zinc-900">
                  {paymentMethod === 'CASH' ? 'نقدي (كاش)' : 'محفظة إلكترونية'}
                </span>
              </div>
            </div>

            {/* Financial breakdown */}
            <div className="pt-3 border-t border-zinc-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-600">
                <span>سعر الباقة:</span>
                <span className="font-mono font-bold text-zinc-900">{selectedPlan.price} ج.م</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span>قيمة الخصم:</span>
                <span className="font-mono font-bold text-rose-600">-{discountAmount} ج.م</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700">الإجمالي المطلوب:</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-zinc-950 font-mono">
                    {finalPrice}
                  </span>
                  <span className="text-xs font-bold text-zinc-500">ج.م</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-zinc-600 pt-1">
                <span>المدفوع الآن:</span>
                <span className="font-mono font-bold text-emerald-700">{paidAmount} ج.م</span>
              </div>

              <div className="flex items-center justify-between text-zinc-600">
                <span>المبلغ المتبقي:</span>
                <span
                  className={cn(
                    'font-mono font-bold',
                    remainingDebt > 0 ? 'text-rose-600' : 'text-zinc-900'
                  )}
                >
                  {remainingDebt} ج.م {remainingDebt === 0 && '(خالص)'}
                </span>
              </div>
            </div>

            {/* Action CTA */}
            <div className="pt-2 space-y-2">
              {previousSubscription?.status === 'CANCELLED' ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      previousSubscription?.memberId
                        ? `/app/subscriptions/new?memberId=${previousSubscription.memberId}`
                        : '/app/subscriptions/new'
                    )
                  }
                  className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>+ إنشاء اشتراك جديد للمشترك</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRenewSubmit}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-[#F4D76A] hover:bg-gym-gold text-amber-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>تأكيد التجديد وتوثيق الدفع</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate('/app/subscriptions')}
                className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 text-center transition-colors block"
              >
                إلغاء والعودة للقائمة
              </button>
            </div>

            {/* Footer note */}
            <div className="pt-2 border-t border-zinc-100 flex items-center gap-1.5 text-[10px] text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-gym-gold shrink-0" />
              <span>معاملة موثقة برقم قيد مالي باسم: {user?.name || 'كاشير الصالة'}</span>
            </div>
          </div>

          {/* SMS Notification Info Box */}
          <div className="p-4 rounded-2xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              عند إتمام التجديد، سيتم إرسال إشعار فوري عبر الرسائل النصية القصيرة وتطبيق العضو بتفاصيل الاشتراك الجديد.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL: Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
              <CheckCheck className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <h3 className="text-lg font-black text-zinc-950">تم تجديد الاشتراك بنجاح!</h3>
              <p className="text-xs text-zinc-500 mt-1">
                تم تمديد عضوية{' '}
                <span className="font-bold text-zinc-900">
                  {previousSubscription?.member?.name || 'العضو'}
                </span>{' '}
                حتى{' '}
                <span className="font-bold text-zinc-900 font-mono">{renewalEndDate}</span>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-right space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">رقم الإيصال:</span>
                <span className="font-mono font-bold">REC-2026-9812</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">المبلغ المدفوع:</span>
                <span className="font-mono font-bold text-emerald-700">{paidAmount} ج.م</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => navigate('/app/subscriptions')}
                className="flex-1 py-2.5 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 transition-colors"
              >
                العودة للاشتراكات
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Unsaved Changes */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-zinc-900 text-center mb-1.5">
              تنبيه: توجد بيانات تجديد غير محفوظة
            </h3>
            <p className="text-xs text-zinc-500 text-center leading-relaxed mb-6">
              هل أنت متأكد من مغادرة صفحة التجديد؟ لن يتم توثيق هذه الدفعة في السجلات المالية.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-colors"
              >
                متابعة التجديد
              </button>
              <button
                onClick={() => navigate('/app/subscriptions')}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors"
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

export default SubscriptionRenewPage
