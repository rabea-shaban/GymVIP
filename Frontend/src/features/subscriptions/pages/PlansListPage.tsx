import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  RotateCcw,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  PauseCircle,
  CheckCircle2,
  X,
  Award,
  Layers,
  GripVertical,
  ShieldAlert,
  Flame,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/feedback/Toast'
import { plansApi } from '@/features/plans/services/plansApi'
import { ExportDropdown } from '@/components/ui/ExportDropdown'
import type { PlanItem as BackendPlanItem } from '@/features/plans/types/plan.types'
import { useRealtimeSync } from '@/services/socket'

export type PlansViewState =
  | 'default'               // الافتراضية (البيانات)
  | 'skeleton'              // تحميل هيكلي (Skeleton)
  | 'empty'                 // لا توجد خطط (Empty)
  | 'error'                 // حالة خطأ (Error)
  | 'disable_modal'         // نافذة تعطيل خطة
  | 'delete_linked_modal'   // حذف (مرتبطة بعضويات)
  | 'delete_safe_modal'     // حذف (بدون عضويات)

interface PlanItem {
  id: string
  name: string
  price: number
  durationDays: number
  dailyRateText: string
  activeMembersCount: number
  percentageOfMembers: number
  isVip?: boolean
  popularBadge?: string
  savingsBadge?: string
  status: 'active' | 'inactive'
  features: Array<{ text: string; iconType?: 'check' | 'tag' | 'trophy' }>
}

function mapBackendPlanToUi(plan: BackendPlanItem): PlanItem {
  const priceNum = parseFloat(plan.price) || 0
  const dailyRate = plan.durationDays > 0 ? (priceNum / plan.durationDays).toFixed(2) : '0'
  const isVip = plan.durationDays >= 365 || plan.name.toLowerCase().includes('vip')

  return {
    id: plan.id,
    name: plan.name,
    price: priceNum,
    durationDays: plan.durationDays,
    dailyRateText: `${dailyRate} ج.م / يوم تقريباً`,
    activeMembersCount: 0,
    percentageOfMembers: 0,
    isVip,
    status: plan.isActive ? 'active' : 'inactive',
    features: [
      { text: `مدة الصلاحية: ${plan.durationDays} يوماً`, iconType: 'check' },
      ...(plan.description ? [{ text: plan.description, iconType: 'check' as const }] : []),
    ],
  }
}

export const PlansListPage: React.FC = () => {
  const navigate = useNavigate()
  const toast = useToast()

  const [isLoading, setIsLoading] = useState(true)

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('MOST_POPULAR')

  // Active Menu
  const [activeMenuPlanId, setActiveMenuPlanId] = useState<string | null>(null)

  // Modals state
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false)
  const [selectedPlanForAction, setSelectedPlanForAction] = useState<PlanItem | null>(null)
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false)
  const [isDeleteLinkedModalOpen, setIsDeleteLinkedModalOpen] = useState(false)
  const [isDeleteSafeModalOpen, setIsDeleteSafeModalOpen] = useState(false)

  // Reorder / Plans list state
  const [plansList, setPlansList] = useState<PlanItem[]>([])

  const loadPlans = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await plansApi.list({
        search: searchQuery.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : (statusFilter === 'ACTIVE' ? 'active' : 'inactive'),
      })
      if (res.plans) {
        setPlansList(res.plans.map(mapBackendPlanToUi))
      }
    } catch {
      toast.error('تعذر جلب باقات الاشتراك من الخادم')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, statusFilter, toast])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  // Instant Real-Time WebSocket updates for Plans List
  useRealtimeSync(undefined, () => {
    loadPlans()
  })

  // Filtered & Sorted Plans
  const filteredPlans = useMemo(() => {
    let result = [...plansList].filter((plan) => {
      const matchSearch = plan.name.includes(searchQuery)
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTIVE'
          ? plan.status === 'active'
          : plan.status === 'inactive'
      return matchSearch && matchStatus
    })

    if (sortBy === 'PRICE_LOW') {
      result.sort((a, b) => a.price - b.price)
    } else if (sortBy === 'PRICE_HIGH') {
      result.sort((a, b) => b.price - a.price)
    } else if (sortBy === 'DURATION') {
      result.sort((a, b) => b.durationDays - a.durationDays)
    } else {
      // MOST_POPULAR
      result.sort((a, b) => b.activeMembersCount - a.activeMembersCount)
    }

    return result
  }, [plansList, searchQuery, statusFilter, sortBy])

  const handleResetFilters = () => {
    setSearchQuery('')
    setStatusFilter('ALL')
    setSortBy('MOST_POPULAR')
    toast.info('تمت إعادة ضبط جميع الفلاتر بنجاح')
  }

  return (
    <div className="space-y-6 pb-16 font-cairo">

      {/* 2. Breadcrumbs & Page Header */}
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
            <span className="text-zinc-900 font-bold">خطط الاشتراك</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950">خطط الاشتراك</h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            أنشئ وأدر خطط الاشتراك المتاحة لأعضاء الجيم وتتبع أداء ونسب إقبال كل باقة رياضية.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <ExportDropdown endpoint="plans" />

          <button
            onClick={() => setIsReorderModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-xs sm:text-sm font-bold hover:bg-zinc-50 transition-colors shadow-2xs"
          >
            <GripVertical className="w-4 h-4 text-zinc-600" />
            <span>إعادة ترتيب الخطط</span>
          </button>

          <button
            onClick={() => navigate('/app/plans/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F4D76A] hover:bg-gym-gold text-zinc-950 text-xs sm:text-sm font-black transition-all shadow-2xs active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ إضافة خطة جديدة</span>
          </button>
        </div>
      </div>

      {/* 3. KPI Stat Cards (4 Cards Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Plans */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-500">إجمالي الخطط</p>
              <h3 className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1">4</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400 font-medium">
            خطط مسجلة ومعتمدة بالنظام
          </div>
        </div>

        {/* Card 2: Active Plans */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-500">الخطط النشطة</p>
              <h3 className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1">4</h3>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              100% نشط
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400 font-medium">
            متاحة فوراً لتسجيل المشتركين
          </div>
        </div>

        {/* Card 3: Most Popular Plan */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-500">أكثر خطة اشتراك</p>
              <div className="flex items-center gap-2 mt-1">
                <h3 className="text-xl sm:text-2xl font-black text-zinc-950">الشهري</h3>
                <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                  46% من الأعضاء
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-100 text-gym-gold-dark flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400 font-medium">
            285 مشترك حالي نشط
          </div>
        </div>

        {/* Card 4: Total Active Subscriptions */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-500">إجمالي الاشتراكات النشطة</p>
              <h3 className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1">620</h3>
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              +8% هذا الشهر
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400 font-medium">
            عبر كافة الباقات الحالية
          </div>
        </div>
      </div>

      {/* 4. Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-3.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن خطة اشتراك..."
                className="w-full pr-10 pl-4 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all placeholder:text-zinc-400"
              />
            </div>

            {/* Status Dropdown */}
            <div className="w-full sm:w-36">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:bg-white focus:border-zinc-900 focus:outline-none transition-all cursor-pointer font-bold"
              >
                <option value="ALL">الحالة: الكل</option>
                <option value="ACTIVE">نشطة</option>
                <option value="INACTIVE">معطلة</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="w-full sm:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:bg-white focus:border-zinc-900 focus:outline-none transition-all cursor-pointer font-bold"
              >
                <option value="MOST_POPULAR">الترتيب: الأكثر استخداماً</option>
                <option value="PRICE_LOW">السعر: من الأقل للأعلى</option>
                <option value="PRICE_HIGH">السعر: من الأعلى للأقل</option>
                <option value="DURATION">المدة: الأطول أولاً</option>
              </select>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-xs sm:text-sm font-bold hover:bg-zinc-50 transition-colors shrink-0"
              title="إعادة ضبط الفلاتر"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
              <span>إعادة ضبط</span>
            </button>
          </div>

          {/* Count Badge */}
          <div className="text-xs font-bold text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-xl self-end sm:self-center">
            عرض {filteredPlans.length} من أصل {plansList.length} خطط
          </div>
        </div>
      </div>

      {/* 5. Main Plans Cards Grid */}
      {isLoading ? (
        // Skeleton Loader
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-96 bg-white rounded-3xl border border-zinc-200 p-6 animate-pulse space-y-4"
            >
              <div className="h-6 w-20 bg-zinc-200 rounded-full" />
              <div className="h-10 w-32 bg-zinc-200 rounded-xl" />
              <div className="h-4 w-full bg-zinc-100 rounded" />
              <div className="h-2 w-full bg-zinc-200 rounded-full my-6" />
              <div className="space-y-2 pt-4">
                <div className="h-4 w-3/4 bg-zinc-100 rounded" />
                <div className="h-4 w-2/3 bg-zinc-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        // Empty State
        <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 mb-1">
            {searchQuery ? 'لا توجد خطة مطابقة للبحث' : 'لا توجد خطط اشتراك مسجلة حالياً'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mb-6">
            {searchQuery
              ? `لم يتم العثور على أي باقة تطابق "${searchQuery}". جرب كلمة بحث أخرى.`
              : 'ابدأ بإنشاء أول باقة اشتراك لصالتك الرياضية لتتمكن من تسجيل الأعضاء وربطهم بالخطط.'}
          </p>
          <button
            onClick={() => navigate('/app/plans/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gym-gold text-zinc-950 text-xs font-extrabold hover:bg-gym-gold-light"
          >
            <Plus className="w-4 h-4" />
            + إضافة أول باقة
          </button>
        </div>
      ) : (
        // 4 Plan Cards in a Row (matching screenshot layout and order)
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {filteredPlans.map((plan) => {
            const isVipCard = plan.isVip

            return (
              <div
                key={plan.id}
                className={cn(
                  'rounded-3xl border p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 relative shadow-2xs hover:shadow-md group',
                  isVipCard
                    ? 'bg-white border-zinc-300'
                    : 'bg-white border-zinc-200/90'
                )}
              >
                <div>
                  {/* Top Badges & 3 Dots Menu */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    {/* 3 Dots Menu (RTL Right side in header) */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveMenuPlanId(
                            activeMenuPlanId === plan.id ? null : plan.id
                          )
                        }}
                        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuPlanId === plan.id && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-2xl border border-zinc-200 py-1 z-30 text-xs font-semibold text-zinc-700 divide-y divide-zinc-100 animate-in fade-in zoom-in-95 duration-100">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                setActiveMenuPlanId(null)
                                navigate(`/app/plans/${plan.id}/edit`)
                              }}
                              className="w-full px-3 py-1.5 text-right hover:bg-zinc-50 flex items-center gap-2 text-zinc-800"
                            >
                              <Edit className="w-3.5 h-3.5 text-zinc-500" />
                              تعديل الباقة
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuPlanId(null)
                                toast.success(`تم نسخ باقة "${plan.name}" بنجاح`)
                              }}
                              className="w-full px-3 py-1.5 text-right hover:bg-zinc-50 flex items-center gap-2 text-zinc-800"
                            >
                              <Copy className="w-3.5 h-3.5 text-zinc-500" />
                              تكرار الباقة
                            </button>
                          </div>
                          <div className="py-1">
                            {plan.status === 'inactive' ? (
                              <button
                                onClick={async () => {
                                  setActiveMenuPlanId(null)
                                  try {
                                    await plansApi.updateStatus(plan.id, true)
                                    setPlansList((prev) =>
                                      prev.map((p) =>
                                        p.id === plan.id ? { ...p, status: 'active' } : p
                                      )
                                    )
                                    toast.success(`تم تفعيل باقة "${plan.name}" بنجاح`)
                                  } catch {
                                    toast.error('فشل تفعيل الباقة')
                                  }
                                }}
                                className="w-full px-3 py-1.5 text-right hover:bg-emerald-50 flex items-center gap-2 text-emerald-700 font-bold"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                تفعيل الباقة
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveMenuPlanId(null)
                                  setSelectedPlanForAction(plan)
                                  setIsDisableModalOpen(true)
                                }}
                                className="w-full px-3 py-1.5 text-right hover:bg-zinc-50 flex items-center gap-2 text-zinc-800"
                              >
                                <PauseCircle className="w-3.5 h-3.5 text-zinc-500" />
                                تعطيل الباقة
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setActiveMenuPlanId(null)
                                setSelectedPlanForAction(plan)
                                if (plan.activeMembersCount > 0) {
                                  setIsDeleteLinkedModalOpen(true)
                                } else {
                                  setIsDeleteSafeModalOpen(true)
                                }
                              }}
                              className="w-full px-3 py-1.5 text-right hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-bold"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              حذف الباقة
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Top Badges (RTL Left side in header) */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {plan.popularBadge && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 shadow-2xs">
                          <Flame className="w-3 h-3 text-amber-600" />
                          {plan.popularBadge}
                        </span>
                      )}

                      {plan.savingsBadge && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 shadow-2xs">
                          {plan.savingsBadge}
                        </span>
                      )}

                      {isVipCard && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-zinc-950 text-white border border-zinc-700 shadow-xs">
                          <Award className="w-3 h-3 text-white" />
                          باقة VIP السنوية
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                        نشطة
                      </span>
                    </div>
                  </div>

                  {/* Duration Badge on side */}
                  <div className="mb-2">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold font-mono',
                        isVipCard
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-zinc-100 text-zinc-700'
                      )}
                    >
                      {plan.durationDays} يوم
                    </span>
                  </div>

                  {/* Plan Name */}
                  <h3 className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1">
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-zinc-950">
                      {plan.price.toLocaleString('ar-EG')}
                    </span>
                    <span className="text-xs font-bold text-zinc-500">ج.م</span>
                  </div>

                  {/* Daily / Monthly rate note */}
                  <p className="text-[11px] font-mono text-zinc-400 mt-1">
                    {plan.dailyRateText}
                  </p>

                  {/* Share & Active Members Progress Bar */}
                  <div className="mt-5 p-3 rounded-2xl bg-zinc-50/80 border border-zinc-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-zinc-700">{plan.activeMembersCount} عضو نشط</span>
                      <span className="text-zinc-500 font-mono">
                        {plan.percentageOfMembers}% من الأعضاء
                      </span>
                    </div>

                    <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          isVipCard
                            ? 'bg-gradient-to-l from-gym-gold-light to-gym-gold'
                            : 'bg-zinc-900'
                        )}
                        style={{ width: `${plan.percentageOfMembers}%` }}
                      />
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="mt-5 space-y-2.5 text-xs text-zinc-700 border-t border-zinc-100 pt-4">
                    {plan.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2">
                        {feature.iconType === 'trophy' ? (
                          <Award className="w-4 h-4 text-gym-gold-dark shrink-0" />
                        ) : feature.iconType === 'tag' ? (
                          <Tag className="w-4 h-4 text-gym-gold-dark shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-zinc-700 shrink-0" />
                        )}
                        <span
                          className={cn(
                            'font-medium',
                            feature.iconType === 'trophy' && 'font-black text-zinc-900',
                            feature.iconType === 'tag' && 'font-bold text-zinc-800'
                          )}
                        >
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom CTA Button */}
                <div className="mt-6 pt-2">
                  <button
                    onClick={() => navigate(`/app/plans/${plan.id}/edit`)}
                    className={cn(
                      'w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-2xs',
                      isVipCard
                        ? 'bg-zinc-950 text-white hover:bg-zinc-800'
                        : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
                    )}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>تعديل الخطة</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 6. Bottom Promo / Custom Plan Banner (matching screenshot bottom) */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-center sm:text-right">
          <div className="w-12 h-12 rounded-2xl bg-[#F4D76A] text-zinc-950 flex items-center justify-center shrink-0 shadow-xs">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-zinc-950">
              هل تود إضافة خطة باشتراك مخصص؟
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              حدد السعر وعدد الأيام والحد الأقصى للتجميد لتوسيع خيارات الاشتراك لأعضاء جيمك.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/app/plans/new')}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ إنشاء خطة الآن</span>
        </button>
      </div>

      {/* MODAL 1: Disable Plan Modal */}
      {isDisableModalOpen && selectedPlanForAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <PauseCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-zinc-900 text-center mb-2">
              تعطيل باقة "{selectedPlanForAction.name}"
            </h3>
            <p className="text-xs text-zinc-500 text-center leading-relaxed mb-6">
              عند تعطيل الخطة، لن تظهر في قائمة الخيارات المتاحة لتسجيل المشتركين الجدد. الاشتراكات السارية حالياً ستظل مفعلة دون أي تأثير حتى تاريخ انتهائها.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDisableModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  try {
                    await plansApi.updateStatus(selectedPlanForAction.id, false)
                    setPlansList((prev) =>
                      prev.map((p) =>
                        p.id === selectedPlanForAction.id ? { ...p, status: 'inactive' } : p
                      )
                    )
                    toast.success(`تم تعطيل باقة "${selectedPlanForAction.name}" مؤقتاً`)
                  } catch {
                    toast.error('فشل في تعطيل الباقة عبر الخادم')
                  } finally {
                    setIsDisableModalOpen(false)
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors shadow-xs"
              >
                تأكيد التعطيل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Cannot Delete Plan (Linked to active members) */}
      {isDeleteLinkedModalOpen && selectedPlanForAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-zinc-900 text-center mb-2">
              لا يمكن حذف هذه الباقة
            </h3>
            <p className="text-xs text-zinc-600 text-center leading-relaxed mb-4">
              الباقة <strong className="text-zinc-950">"{selectedPlanForAction.name}"</strong> مرتبطة حالياً بـ{' '}
              <strong className="text-amber-700 font-bold">{selectedPlanForAction.activeMembersCount} عضو نشط</strong> في قاعدة البيانات.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 mb-6">
              ملاحظة: للحفاظ على سلامة القيود المالية وسجلات المشتركين، يمكنك <strong>تعطيل الباقة</strong> بدلاً من حذفها لمنع اختيارها للمشتركين الجدد.
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDeleteLinkedModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors"
              >
                فهمت ذلك
              </button>
              <button
                onClick={() => {
                  setIsDeleteLinkedModalOpen(false)
                  setIsDisableModalOpen(true)
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-colors shadow-xs"
              >
                تعطيل الباقة الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Safe Plan (No active members) */}
      {isDeleteSafeModalOpen && selectedPlanForAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-zinc-900 text-center mb-2">
              تأكيد حذف باقة الاشتراك
            </h3>
            <p className="text-xs text-zinc-500 text-center leading-relaxed mb-6">
              هل أنت متأكد من حذف الباقة <strong className="text-zinc-900">"{selectedPlanForAction.name}"</strong> نهائياً؟ لا يوجد مشتركون مرتبطون بهذه الخطة حالياً.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDeleteSafeModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors"
              >
                إلغاء التراجع
              </button>
              <button
                onClick={async () => {
                  try {
                    await plansApi.delete(selectedPlanForAction.id)
                    setPlansList((prev) => prev.filter((p) => p.id !== selectedPlanForAction.id))
                    toast.success(`تم حذف الباقة "${selectedPlanForAction.name}" نهائياً`)
                    setIsDeleteSafeModalOpen(false)
                  } catch (err: any) {
                    const msg = err.response?.data?.message || err.message || 'فشل حذف الباقة'
                    toast.error(msg)
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs"
              >
                نعم، احذف الباقة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Reorder Plans Modal */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gym-gold-dark" />
                <h3 className="text-base font-bold text-zinc-900">إعادة ترتيب ظهور الخطط</h3>
              </div>
              <button
                onClick={() => setIsReorderModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-2">
              <p className="text-xs text-zinc-500 mb-3">
                اسحب الخطط لتغيير ترتيب ظهورها في صفحة الخطط وشاشة تسجيل الأعضاء:
              </p>
              {plansList.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 cursor-grab active:cursor-grabbing hover:bg-zinc-100 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span>{p.name}</span>
                  </div>
                  <span className="font-mono text-zinc-500">{p.price} ج.م</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
              <button
                onClick={() => setIsReorderModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  setPlansList([...plansList])
                  setIsReorderModalOpen(false)
                  toast.success('تم حفظ ترتيب الخطط الجديد بنجاح!')
                }}
                className="px-5 py-2 rounded-xl bg-gym-gold text-zinc-950 text-xs font-black hover:bg-gym-gold-light"
              >
                حفظ الترتيب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlansListPage
