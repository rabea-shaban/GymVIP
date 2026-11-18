import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Search,
  Plus,
  RefreshCw,
  Wallet,
  Coins,
  Check,
  HelpCircle,
  FileCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/feedback/Toast'
import { plansApi } from '@/features/plans/services/plansApi'
import { membersApi } from '@/features/members/services/membersApi'
import { subscriptionsApi } from '../services/subscriptionsApi'
import { paymentsApi } from '@/features/payments/services/paymentsApi'
import { useAuth } from '@/features/auth/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'

interface PlanOption {
  id: string
  name: string
  tag: string
  tagType: 'gold' | 'amber' | 'slate' | 'vip'
  durationDays: number
  durationText: string
  price: number
  featureNote: string
}

const fallbackPlan: PlanOption = {
  id: '',
  name: 'لا توجد خطة محددة',
  tag: '',
  tagType: 'slate',
  durationDays: 30,
  durationText: '30 يوم',
  price: 0,
  featureNote: '',
}

export const SubscriptionCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  // Plans state
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modals state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)

  // Member State
  const [selectedMember, setSelectedMember] = useState<{
    id: string
    name: string
    code: string
    phone: string
    avatarUrl?: string | null
    hasActiveSub: boolean
    activeSubEndDate: string
    activeSubRawEndDate?: string
  } | null>(null)

  // Live Member Search
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [searchedMembers, setSearchedMembers] = useState<any[]>([])
  const [isSearchingMembers, setIsSearchingMembers] = useState(false)
  const [showMemberResults, setShowMemberResults] = useState(false)

  // Selected Plan State
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const selectedPlan = useMemo(
    () => availablePlans.find((p) => p.id === selectedPlanId) || availablePlans[0] || fallbackPlan,
    [availablePlans, selectedPlanId]
  )

  // Dates State
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])

  // Financial & Discount State
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'WALLET'>('CASH')
  const [paidAmount, setPaidAmount] = useState<number>(0)

  // Notes State
  const [notes, setNotes] = useState('')

  // Load Real Plans & Member if query param exists
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const plansRes = await plansApi.list({ status: 'active' })
        if (plansRes.plans && plansRes.plans.length > 0) {
          const mapped: PlanOption[] = plansRes.plans.map((p) => ({
            id: p.id,
            name: p.name,
            tag: p.durationDays >= 365 ? 'باقة مميزة VIP' : p.durationDays <= 30 ? 'الأكثر طلباً' : 'توفير ومرونة',
            tagType: p.durationDays >= 365 ? 'vip' : p.durationDays <= 30 ? 'gold' : 'slate',
            durationDays: p.durationDays,
            durationText: `${p.durationDays} يوم صلاحية متواصلة`,
            price: parseFloat(p.price) || 0,
            featureNote: p.description || 'دخول لكافة المرافق الرياضية والأجهزة',
          }))
          setAvailablePlans(mapped)
          setSelectedPlanId(mapped[0]?.id ?? '')
          setPaidAmount(mapped[0]?.price ?? 0)
        }
      } catch {
        // ignore
      }

      const memberIdParam = searchParams.get('memberId')
      if (memberIdParam) {
        try {
          const member = await membersApi.getById(memberIdParam)
          const currentSub = await subscriptionsApi.getMemberCurrent(memberIdParam)
          setSelectedMember({
            id: member.id,
            name: member.name,
            code: member.memberCode,
            phone: member.phone,
            avatarUrl: member.avatarUrl || null,
            hasActiveSub: !!currentSub,
            activeSubEndDate: currentSub?.endDate
              ? new Date(currentSub.endDate).toLocaleDateString('ar-EG-u-nu-latn', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : '',
            activeSubRawEndDate: currentSub?.endDate || undefined,
          })
        } catch {
          // ignore
        }
      }
    }

    fetchInitialData()
  }, [searchParams])

  // Debounced member search
  useEffect(() => {
    if (!memberSearchQuery.trim()) {
      setSearchedMembers([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingMembers(true)
      try {
        const res = await membersApi.list({ search: memberSearchQuery.trim(), limit: 5 })
        setSearchedMembers(res.members || [])
        setShowMemberResults(true)
      } catch {
        setSearchedMembers([])
      } finally {
        setIsSearchingMembers(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [memberSearchQuery])

  const handleSelectMember = async (member: any) => {
    try {
      const currentSub = await subscriptionsApi.getMemberCurrent(member.id)
      setSelectedMember({
        id: member.id,
        name: member.name,
        code: member.memberCode,
        phone: member.phone,
        avatarUrl: member.avatarUrl || null,
        hasActiveSub: !!currentSub,
        activeSubEndDate: currentSub?.endDate
          ? new Date(currentSub.endDate).toLocaleDateString('ar-EG-u-nu-latn', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : '',
        activeSubRawEndDate: currentSub?.endDate || undefined,
      })
    } catch {
      setSelectedMember({
        id: member.id,
        name: member.name,
        code: member.memberCode,
        phone: member.phone,
        avatarUrl: member.avatarUrl || null,
        hasActiveSub: false,
        activeSubEndDate: '',
        activeSubRawEndDate: undefined,
      })
    }
    setShowMemberResults(false)
    setMemberSearchQuery('')
  }

  // Calculations
  const calculatedDiscountAmount = useMemo(() => {
    if (!discountValue || discountValue <= 0) return 0
    if (discountType === 'PERCENT') {
      return Math.round((selectedPlan.price * Math.min(100, discountValue)) / 100)
    }
    return Math.min(selectedPlan.price, Math.round(discountValue))
  }, [selectedPlan.price, discountType, discountValue])

  const finalPrice = useMemo(() => {
    return Math.max(0, selectedPlan.price - calculatedDiscountAmount)
  }, [selectedPlan.price, calculatedDiscountAmount])

  // Auto-sync paid amount with final price when plan or discount changes
  useEffect(() => {
    setPaidAmount(finalPrice)
  }, [finalPrice])

  const remainingDebt = useMemo(() => {
    return Math.max(0, finalPrice - (Number(paidAmount) || 0))
  }, [finalPrice, paidAmount])

  // Computed Start and End Dates in clean Arabic with Western numbers
  const startDateFormatted = useMemo(() => {
    if (!startDate) return ''
    const start = new Date(startDate)
    if (isNaN(start.getTime())) return ''
    return start.toLocaleDateString('ar-EG-u-nu-latn', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [startDate])

  const endDateFormatted = useMemo(() => {
    if (!startDate) return ''
    const start = new Date(startDate)
    if (isNaN(start.getTime())) return ''
    const end = new Date(start)
    end.setDate(end.getDate() + (selectedPlan.durationDays || 30) - 1)
    return end.toLocaleDateString('ar-EG-u-nu-latn', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [startDate, selectedPlan.durationDays])

  // Handle setting start date to the day after active sub ends
  const handleSetStartAfterActive = () => {
    if (!selectedMember?.activeSubRawEndDate) return
    const currentEnd = new Date(selectedMember.activeSubRawEndDate)
    if (!isNaN(currentEnd.getTime())) {
      currentEnd.setDate(currentEnd.getDate() + 1)
      setStartDate(currentEnd.toISOString().split('T')[0])
      toast.info('تم ضبط تاريخ البداية ليبدأ فور انتهاء الاشتراك الحالي')
    }
  }

  // Handle Submit
  const handleFinalSubmit = async () => {
    if (!selectedMember) {
      toast.error('يرجى اختيار العضو المشترك')
      return
    }

    if (!selectedPlan.id) {
      toast.error('يرجى اختيار باقة اشتراك صالحة')
      return
    }

    setIsSubmitting(true)
    try {
      const created = await subscriptionsApi.create({
        memberId: selectedMember.id,
        planId: selectedPlan.id,
        startDate: startDate || undefined,
        notes: notes.trim() || undefined,
      })

      if (paidAmount > 0) {
        try {
          await paymentsApi.create({
            subscriptionId: created.id,
            amount: Number(paidAmount),
            method: paymentMethod,
            notes: 'دفعة أولى عند إنشاء الاشتراك',
          })
        } catch {
          toast.warning('تم إنشاء الاشتراك ولكن تعذر تقييد الدفعة تلقائياً')
        }
      }

      setShowConfirmModal(false)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      toast.success('تم إنشاء الاشتراك واعتماده بنجاح')
      setTimeout(() => {
        navigate('/app/subscriptions')
      }, 500)
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'فشل في إنشاء الاشتراك'
      toast.error(msg)
      setShowConfirmModal(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-20 font-cairo">
      {/* 1. Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
        <div>
          {/* Breadcrumbs */}
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
            <span className="text-zinc-900 font-bold">إنشاء اشتراك جديد</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950">إنشاء اشتراك جديد</h1>
            <span className="text-[11px] font-black text-amber-900 bg-[#F4D76A] px-2.5 py-0.5 rounded-full shadow-2xs">
              بوابة النخبة
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            تسجيل وتوثيق اشتراك رياضي جديد وتخصيص الدفعات والحساب المالي للفرع الحالي.
          </p>
        </div>

        {/* Back Button */}
        <button
          type="button"
          onClick={() => {
            if (selectedMember) {
              setShowUnsavedModal(true)
            } else {
              navigate('/app/subscriptions')
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-xs sm:text-sm font-bold hover:bg-zinc-50 transition-colors shadow-2xs active:scale-95"
        >
          <span>العودة إلى الاشتراكات</span>
          <ArrowLeft className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* 2. Main Form & Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* RIGHT COLUMN: Step Cards (8 cols) */}
        <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
          {/* STEP 1: بيانات العضو المشترك */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white border border-zinc-800 flex items-center justify-center font-black text-xs">
                  1
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-zinc-950">
                    بيانات العضو المشترك
                  </h3>
                </div>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">خطوة إلزامية</span>
            </div>

            {/* Member Search input */}
            {!selectedMember && (
              <div className="relative">
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => {
                    setMemberSearchQuery(e.target.value)
                    setShowMemberResults(true)
                  }}
                  onFocus={() => setShowMemberResults(true)}
                  placeholder="ابحث باسم العضو أو رقم الهاتف أو كود العضو..."
                  className="w-full pr-10 pl-4 py-2.5 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all font-bold text-zinc-900"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                  {isSearchingMembers ? (
                    <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </div>

                {/* Autocomplete dropdown */}
                {showMemberResults && memberSearchQuery.trim() && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden divide-y divide-zinc-100 max-h-60 overflow-y-auto">
                    {searchedMembers.length > 0 ? (
                      searchedMembers.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => handleSelectMember(m)}
                          className="p-3 hover:bg-zinc-50 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={m.avatarUrl}
                              name={m.name}
                              size="sm"
                              className="border border-gym-gold/40"
                            />
                            <div>
                              <p className="text-xs font-black text-zinc-900">{m.name}</p>
                              <p className="text-[10px] text-zinc-500 font-mono">
                                {m.memberCode} • {m.phone}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            {m.status === 'ACTIVE' ? 'نشط' : m.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      !isSearchingMembers && (
                        <div className="p-3 text-center text-xs text-zinc-500">
                          لا توجد نتائج مطابقة
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Selected Member Details Card */}
            {selectedMember ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/90 border border-zinc-200/90 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <Avatar
                      src={selectedMember.avatarUrl || undefined}
                      name={selectedMember.name}
                      size="lg"
                      className="border-2 border-gym-gold shadow-sm"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-black text-zinc-950">
                          {selectedMember.name}
                        </h4>
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2.5 py-0.5 rounded-full',
                            selectedMember.hasActiveSub
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          )}
                        >
                          {selectedMember.hasActiveSub ? 'عضو مجدد' : 'عضو جديد'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-zinc-500 font-mono mt-1">
                        <span className="bg-zinc-200/80 px-2 py-0.5 rounded font-bold text-zinc-700">
                          {selectedMember.code}
                        </span>
                        <span>•</span>
                        <span dir="ltr" className="font-semibold text-zinc-700">
                          {selectedMember.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMember(null)
                      setMemberSearchQuery('')
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-xs font-bold hover:bg-zinc-100 hover:border-zinc-300 transition-all shadow-2xs self-start sm:self-auto active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                    <span>تغيير العضو</span>
                  </button>
                </div>

                {/* Active Sub Warning inside Member Card */}
                {selectedMember.hasActiveSub && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-black text-xs text-amber-950">
                          تنبيه: العضو لديه اشتراك سارٍ بالفعل
                        </p>
                        <p className="text-[11px] text-amber-800">
                          الاشتراك الحالي ينتهي بتاريخ:{' '}
                          <span className="font-bold font-mono">{selectedMember.activeSubEndDate}</span>
                        </p>
                      </div>
                    </div>

                    {selectedMember.activeSubRawEndDate && (
                      <button
                        type="button"
                        onClick={handleSetStartAfterActive}
                        className="px-3 py-1.5 rounded-lg bg-amber-200/80 hover:bg-amber-300/80 text-amber-950 text-xs font-bold transition-colors shrink-0 self-start sm:self-auto"
                      >
                        بدء بعد انتهاء الحالي مباشرة
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 text-center space-y-1">
                <p className="text-xs font-bold text-zinc-700">لم يتم اختيار أي عضو بعد</p>
                <p className="text-[11px] text-zinc-400">
                  يرجى البحث باسم العضو أو رقم الهاتف في الحقل أعلاه لتحديد المشترك
                </p>
              </div>
            )}

            {/* Quick Register New Member Link */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => navigate('/app/members/new')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-950 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-gym-gold" />
                <span>تسجيل عضو جديد سريعاً</span>
              </button>
            </div>
          </div>

          {/* STEP 2: اختيار باقة الاشتراك */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white border border-zinc-800 flex items-center justify-center font-black text-xs">
                  2
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-zinc-950">
                    اختيار باقة الاشتراك
                  </h3>
                </div>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">
                باقات الجيم الرسمية
              </span>
            </div>

            {/* Plans Grid: Responsive 3 Columns with Balanced Card Heights */}
            {availablePlans.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availablePlans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id
                  return (
                    <div
                      key={plan.id}
                      onClick={() => {
                        setSelectedPlanId(plan.id)
                      }}
                      className={cn(
                        'rounded-2xl p-5 border text-right cursor-pointer transition-all duration-200 flex flex-col justify-between relative group min-h-[175px]',
                        isSelected
                          ? 'bg-amber-50/50 border-gym-gold ring-2 ring-gym-gold/40 shadow-sm'
                          : 'bg-white border-zinc-200/90 hover:border-zinc-300 hover:bg-zinc-50/70 shadow-2xs'
                      )}
                    >
                      {/* Top Header: Tag Badge + Radio Check */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span
                            className={cn(
                              'text-[11px] font-bold px-2.5 py-1 rounded-lg truncate',
                              plan.tagType === 'vip' && 'bg-zinc-950 text-white border border-zinc-800',
                              plan.tagType === 'gold' && 'bg-amber-100 text-amber-900',
                              plan.tagType === 'slate' && 'bg-zinc-100 text-zinc-700'
                            )}
                          >
                            {plan.tag}
                          </span>
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all',
                              isSelected
                                ? 'bg-zinc-950 text-white border border-zinc-800'
                                : 'border-2 border-zinc-300 bg-white group-hover:border-zinc-400'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Title & Duration */}
                        <div className="space-y-1.5 mb-3">
                          <h4 className="text-sm font-black text-zinc-950 leading-snug">{plan.name}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{plan.durationDays} يوم صلاحية</span>
                          </div>
                        </div>
                      </div>

                      {/* Price & Description */}
                      <div className="pt-3 border-t border-zinc-100 space-y-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-zinc-950 font-mono tracking-tight">
                            {plan.price.toLocaleString('en-US')}
                          </span>
                          <span className="text-xs font-bold text-zinc-500">ج.م</span>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 min-h-[2.5rem]">
                          {plan.featureNote}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-zinc-700">لا توجد خطط اشتراك مسجلة حالياً في النظام</p>
                <p className="text-[11px] text-zinc-400">
                  يرجى إضافة باقة اشتراك جديدة أولاً لتمكين تسجيل واختيار العضويات.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/app/plans/new')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-gym-gold" />
                  <span>إضافة باقة اشتراك الآن</span>
                </button>
              </div>
            )}
          </div>

          {/* STEP 3: تحديد التواريخ والفترة الزمنية */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white border border-zinc-800 flex items-center justify-center font-black text-xs">
                  3
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-zinc-950">
                    تحديد التواريخ والفترة الزمنية
                  </h3>
                </div>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">
                {selectedPlan.durationDays} يوم مدة سارية
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-800">
                    تاريخ بدء الاشتراك <span className="text-rose-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all font-mono font-bold text-zinc-900"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">
                  يبدأ تلقائياً من اليوم أو تاريخ محدد لاحقاً.
                </p>
              </div>

              {/* End Date (Auto Computed) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-800">
                    تاريخ انتهاء الاشتراك (تلقائي)
                  </label>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded">
                    محسوب برمجياً
                  </span>
                </div>
                <div className="relative">
                  <div className="w-full px-4 py-2.5 text-xs sm:text-sm bg-zinc-100/80 border border-zinc-200 rounded-xl font-mono font-black text-zinc-900 flex items-center justify-between">
                    <span>{endDateFormatted || '—'}</span>
                    <Calendar className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">
                  يتم حسابه تلقائياً استناداً إلى أيام الباقة المختارة.
                </p>
              </div>
            </div>

            {/* Timeline Bar (Dynamic Live Ribbon) */}
            <div className="bg-zinc-950 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border border-zinc-800 shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">تاريخ البداية:</span>
                <span className="font-bold text-white bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 font-mono">
                  {startDateFormatted || 'غير محدد'}
                </span>
              </div>
              <div className="px-3 py-1.5 bg-zinc-800 text-white border border-zinc-700 rounded-xl font-bold text-xs">
                الصلاحية: {selectedPlan.durationDays} يوماً تدريبياً
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">تاريخ الانتهاء:</span>
                <span className="font-bold text-white bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 font-mono">
                  {endDateFormatted || 'غير محدد'}
                </span>
              </div>
            </div>
          </div>

          {/* STEP 4: الحساب المالي وطريقة السداد */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white border border-zinc-800 flex items-center justify-center font-black text-xs">
                  4
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-zinc-950">
                    الحساب المالي وطريقة السداد
                  </h3>
                </div>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">جنيه مصري (EGP)</span>
            </div>

            {/* 3 Price calculation boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Box 1: Original Price */}
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] text-zinc-500 font-medium">سعر الباقة الأصلي</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-zinc-950 font-mono">
                    {selectedPlan.price.toLocaleString('en-US')}
                  </span>
                  <span className="text-xs text-zinc-500 font-bold">ج.م</span>
                </div>
              </div>

              {/* Box 2: Direct Discount with Toggle */}
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500 font-medium">خصم مباشر / ترويجي</span>
                  <div className="flex items-center bg-zinc-200/80 rounded-lg p-0.5 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDiscountType('PERCENT')}
                      className={cn(
                        'px-1.5 py-0.5 rounded transition-colors',
                        discountType === 'PERCENT' ? 'bg-white text-zinc-950 shadow-2xs' : 'text-zinc-500'
                      )}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('FIXED')}
                      className={cn(
                        'px-1.5 py-0.5 rounded transition-colors',
                        discountType === 'FIXED' ? 'bg-white text-zinc-950 shadow-2xs' : 'text-zinc-500'
                      )}
                    >
                      ج.م
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'PERCENT' ? 100 : selectedPlan.price}
                    value={discountValue || ''}
                    placeholder="0"
                    onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full pr-3 pl-8 py-1.5 text-sm bg-white border border-zinc-200 rounded-xl font-mono font-bold text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs font-bold text-zinc-400 pointer-events-none">
                    {discountType === 'PERCENT' ? '%' : 'ج.م'}
                  </span>
                </div>
                {calculatedDiscountAmount > 0 && (
                  <p className="text-[10px] text-emerald-700 font-bold">
                    قيمة الخصم: {calculatedDiscountAmount.toLocaleString('en-US')} ج.م
                  </p>
                )}
              </div>

              {/* Box 3: Total Payable */}
              <div className="bg-[#FEFCE8] border border-[#F4D76A] rounded-2xl p-4 space-y-1">
                <span className="text-[11px] text-amber-900 font-bold">إجمالي المبلغ المستحق</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-zinc-950 font-mono">
                    {finalPrice.toLocaleString('en-US')}
                  </span>
                  <span className="text-xs text-zinc-600 font-bold">ج.م</span>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-800">
                وسيلة الدفع المعتمدة
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={cn(
                    'p-3.5 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-xs sm:text-sm transition-all',
                    paymentMethod === 'CASH'
                      ? 'bg-zinc-950 text-white border-zinc-900 shadow-md ring-2 ring-zinc-700'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
                  )}
                >
                  <Coins className={cn('w-4 h-4 transition-colors', paymentMethod === 'CASH' ? 'text-white' : 'text-zinc-400')} />
                  <span>نقدي (كاش)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('WALLET')}
                  className={cn(
                    'p-3.5 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-xs sm:text-sm transition-all',
                    paymentMethod === 'WALLET'
                      ? 'bg-zinc-950 text-white border-zinc-900 shadow-md ring-2 ring-zinc-700'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
                  )}
                >
                  <Wallet className={cn('w-4 h-4 transition-colors', paymentMethod === 'WALLET' ? 'text-white' : 'text-zinc-400')} />
                  <span>محفظة إلكترونية / إنستاباي</span>
                </button>
              </div>
            </div>

            {/* Paid Amount & Payment Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  المبلغ المدفوع الآن <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={finalPrice}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                    className="w-full pr-4 pl-12 py-2.5 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl font-mono font-black text-zinc-900 focus:bg-white focus:border-zinc-900 focus:outline-none"
                  />
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-zinc-500 pointer-events-none">
                    ج.م
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">حالة السداد</label>
                <div className="w-full px-4 py-2.5 rounded-xl border flex items-center justify-between text-xs bg-zinc-50">
                  <span className="text-zinc-500">حالة السداد:</span>
                  {remainingDebt === 0 ? (
                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      خالص بالكامل (0 ج.م متبقي)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-bold text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-amber-600" />
                      سداد جزئي ({remainingDebt.toLocaleString('en-US')} ج.م متبقي)
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">
                  في حال السداد الجزئي، سيرحل المتبقي كدين لحساب العضو لعضويته.
                </p>
              </div>
            </div>
          </div>

          {/* STEP 5: ملاحظات الاستقبال والمكتب الإداري */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white border border-zinc-800 flex items-center justify-center font-black text-xs">
                  5
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-zinc-950">
                    ملاحظات الاستقبال والمكتب الإداري
                  </h3>
                </div>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">سري داخلي</span>
            </div>

            <div>
              <textarea
                rows={3}
                value={notes}
                maxLength={250}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي شروط خاصة، ملاحظات كابتن التدريب، أرقام إيصالات ورقية يدوية، أو مواعيد تفضيلية..."
                className="w-full p-3.5 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                <span>تظهر هذه الملاحظات لموظفي الاستقبال فقط في كشف الحضور اليومي.</span>
                <span className="font-mono">{notes.length} / 250 حرف</span>
              </div>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: Sticky Summary Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-5 order-1 lg:order-2 lg:sticky lg:top-4">
          {/* Main Summary Card */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-zinc-950" />
                <h3 className="text-sm font-black text-zinc-950">ملخص الاشتراك والاعتماد</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                مسودة
              </span>
            </div>

            {/* Member Mini Block */}
            {selectedMember ? (
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={selectedMember.avatarUrl || undefined}
                    name={selectedMember.name}
                    size="sm"
                    className="border border-gym-gold/60"
                  />
                  <div>
                    <h4 className="text-xs font-black text-zinc-900">{selectedMember.name}</h4>
                    <p className="text-[10px] font-mono text-zinc-500">
                      كود: {selectedMember.code}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded',
                    selectedMember.hasActiveSub
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  )}
                >
                  {selectedMember.hasActiveSub ? 'تجديد اشتراك' : 'عضوية جديدة'}
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-zinc-50 border border-dashed border-zinc-200 text-center text-xs text-zinc-400">
                لم يتم اختيار عضو بعد
              </div>
            )}

            {/* Details List */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-zinc-600">
                <span>نوع الباقة المختارة:</span>
                <span className="font-bold text-zinc-900">{selectedPlan.name}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span>فترة الصلاحية:</span>
                <span className="font-bold text-zinc-900 font-mono">
                  {startDateFormatted || '—'} - {endDateFormatted || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span>المدة الزمنية:</span>
                <span className="font-bold text-zinc-900">
                  {selectedPlan.durationDays} يوم تدريب
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span>وسيلة الدفع:</span>
                <span className="font-bold text-zinc-900">
                  {paymentMethod === 'CASH' ? 'نقدي (كاش)' : 'محفظة إلكترونية'}
                </span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="pt-3 border-t border-zinc-100 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-zinc-600">
                <span>سعر الباقة الأساسي:</span>
                <span className="font-mono font-bold text-zinc-900">
                  {selectedPlan.price.toLocaleString('en-US')} ج.م
                </span>
              </div>

              {calculatedDiscountAmount > 0 && (
                <div className="flex items-center justify-between text-zinc-600">
                  <span>الخصم المطبق:</span>
                  <span className="font-mono font-bold text-rose-600">
                    -{calculatedDiscountAmount.toLocaleString('en-US')} ج.م
                  </span>
                </div>
              )}

              {/* Big Total */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700">الإجمالي المستحق:</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-zinc-950 font-mono">
                    {finalPrice.toLocaleString('en-US')}
                  </span>
                  <span className="text-xs font-bold text-zinc-500">ج.م</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-zinc-600 pt-1">
                <span>المبلغ المسدد الآن:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {paidAmount.toLocaleString('en-US')} ج.م
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-600">
                <span>المتبقي (مديونية):</span>
                <span
                  className={cn(
                    'font-mono font-bold',
                    remainingDebt > 0 ? 'text-rose-600' : 'text-zinc-900'
                  )}
                >
                  {remainingDebt.toLocaleString('en-US')} ج.م
                </span>
              </div>
            </div>

            {/* Action CTA Button */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isSubmitting || !selectedMember || !selectedPlan.id}
                className={cn(
                  'w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]',
                  !selectedMember || !selectedPlan.id
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                    : 'bg-zinc-950 hover:bg-zinc-900 text-white border border-zinc-800 shadow-lg'
                )}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>إنشاء الاشتراك وتأكيد الدفع</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/app/subscriptions')}
                className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 text-center transition-colors block"
              >
                إلغاء والعودة للقائمة
              </button>
            </div>

            {/* Footer encryption badge */}
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-gym-gold" />
                معاملة مشفرة ومسجلة
              </span>
              <span>الموظف: {user?.name || 'مسؤول النظام'}</span>
            </div>
          </div>

          {/* Guidelines Box */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-1.5">
            <div className="flex items-center gap-2 font-bold">
              <HelpCircle className="w-4 h-4 text-amber-800 shrink-0" />
              <span className="font-black text-amber-900">إرشادات تفعيل العضوية:</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed pr-6">
              بمجرد الضغط على تأكيد الدفع، سيتم تفعيل رمز الـ QR الخاص بالعضو للدخول عبر البوابات الذكية وتوليد فاتورة إلكترونية بصيغة PDF فوراً.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL: Confirmation Modal with Portal */}
      {showConfirmModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-14 h-14 rounded-2xl bg-zinc-950 text-white flex items-center justify-center mx-auto mb-4 border border-zinc-800 shadow-sm">
                <FileCheck className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-zinc-950 text-center mb-1.5">
                تأكيد تسجيل الاشتراك واستلام المبلغ
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 text-center leading-relaxed mb-5">
                أنت على وشك تسجيل اشتراك "{selectedPlan.name}" للعضو{' '}
                <span className="font-black text-zinc-900">{selectedMember?.name}</span> بقيمة{' '}
                <span className="font-black text-zinc-900 font-mono">
                  {finalPrice.toLocaleString('en-US')} ج.م
                </span>.
              </p>

              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 text-xs space-y-2 mb-6">
                <div className="flex justify-between text-zinc-600">
                  <span>المبلغ المستلم الآن:</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {paidAmount.toLocaleString('en-US')} ج.م
                  </span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>المتبقي في الحساب:</span>
                  <span className="font-bold text-zinc-900 font-mono">
                    {remainingDebt.toLocaleString('en-US')} ج.م
                  </span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>وسيلة الدفع:</span>
                  <span className="font-bold text-zinc-900">
                    {paymentMethod === 'CASH' ? 'نقدي (كاش)' : 'محفظة إلكترونية'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-black transition-all shadow-md border border-zinc-800 active:scale-95"
                >
                  {isSubmitting ? 'جاري الاعتماد...' : 'تأكيد واعتماد الاشتراك'}
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors"
                >
                  مراجعة البيانات
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: Unsaved Changes with Portal */}
      {showUnsavedModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-zinc-950 text-center mb-1.5">
                تنبيه: توجد بيانات غير محفوظة
              </h3>
              <p className="text-xs text-zinc-500 text-center leading-relaxed mb-6">
                لديك بيانات مدخلة في نموذج الاشتراك لم يتم حفظها واعتمادها بعد. هل تريد مغادرة الصفحة وإلغاء التسجيل؟
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowUnsavedModal(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 transition-colors"
                >
                  متابعة التسجيل
                </button>
                <button
                  onClick={() => navigate('/app/subscriptions')}
                  className="flex-1 py-3 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors"
                >
                  مغادرة بدون حفظ
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default SubscriptionCreatePage
