import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Ban,
  Eye,
  Check,
  RotateCcw,
  Users,
  Info,
  Edit3,
  FileText,
  Save,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/feedback/Toast'
import { plansApi } from '@/features/plans/services/plansApi'
import type { PlanItem } from '@/features/plans/types/plan.types'
import { validateName, extractBackendErrors } from '@/lib/validation'
import { FieldError } from '@/components/ui/FieldError'

export const PlanEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [planErrors, setPlanErrors] = useState<Record<string, string>>({})

  // Modals state
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)

  // Plan Data
  const [planCode, setPlanCode] = useState('PLN-30D')
  const [planName, setPlanName] = useState('')
  const [durationValue, setDurationValue] = useState<number>(30)
  const [durationUnit, setDurationUnit] = useState<'DAYS' | 'MONTHS' | 'YEARS'>('DAYS')
  const [price, setPrice] = useState<number>(500)
  const [description, setDescription] = useState('')
  const [isAvailableForNew, setIsAvailableForNew] = useState(true)
  const [currentPlan, setCurrentPlan] = useState<PlanItem | null>(null)

  // Stats Data
  const activeMembers = 0
  const activeMembersPercentage = 0
  const totalRevenue = '0'
  const createdAt = currentPlan ? new Date(currentPlan.createdAt).toLocaleDateString('ar-EG') : '-'
  const lastUpdatedAt = currentPlan ? new Date(currentPlan.updatedAt).toLocaleDateString('ar-EG') : '-'

  // Calculated Days
  const totalDays = useMemo(() => {
    const val = Number(durationValue) || 0
    if (durationUnit === 'MONTHS') return val * 30
    if (durationUnit === 'YEARS') return val * 365
    return val
  }, [durationValue, durationUnit])

  // Calculated Daily Rate
  const dailyRate = useMemo(() => {
    if (totalDays <= 0 || !price) return '0.00'
    return (price / totalDays).toFixed(2)
  }, [price, totalDays])

  useEffect(() => {
    if (!id) return
    const fetchPlan = async () => {
      setIsLoading(true)
      try {
        const plan = await plansApi.getById(id)
        setCurrentPlan(plan)
        setPlanName(plan.name)
        setPlanCode(`PLN-${plan.durationDays}D`)
        setDescription(plan.description || '')
        setDurationValue(plan.durationDays)
        setDurationUnit('DAYS')
        setPrice(Number(plan.price) || 0)
        setIsAvailableForNew(plan.isActive)
      } catch (err: any) {
        toast.error('تعذر جلب تفاصيل الباقة')
      } finally {
        setIsLoading(false)
      }
    }
    fetchPlan()
  }, [id])

  const handlePlanNameChange = (val: string) => {
    setPlanName(val)
    if (!val.trim()) {
      setPlanErrors((prev) => ({ ...prev, name: 'اسم الخطة مطلوب' }))
    } else {
      const res = validateName(val, 'اسم الخطة', 2, 100)
      setPlanErrors((prev) => ({ ...prev, name: res.isValid ? '' : (res.error || '') }))
    }
  }

  const handlePriceChange = (val: number) => {
    setPrice(val)
    let err = ''
    if (val < 0) {
      err = 'سعر الاشتراك لا يمكن أن يكون سالباً'
    } else if (val > 1000000) {
      err = 'سعر الاشتراك يتجاوز الحد الأقصى المسموح به'
    }
    setPlanErrors((prev) => ({ ...prev, price: err }))
  }

  const handleDurationChange = (val: number, unit = durationUnit) => {
    setDurationValue(val)
    let days = val
    if (unit === 'MONTHS') days = val * 30
    else if (unit === 'YEARS') days = val * 365
    let err = ''
    if (days < 1) {
      err = 'مدة الاشتراك يجب أن تكون يوماً واحداً على الأقل'
    } else if (days > 3650) {
      err = 'مدة الاشتراك يجب ألا تتجاوز 10 سنوات'
    }
    setPlanErrors((prev) => ({ ...prev, durationDays: err }))
  }

  // Save changes
  const handleSave = async () => {
    const errs: Record<string, string> = {}
    const nameRes = validateName(planName, 'اسم الخطة', 2, 100)
    if (!nameRes.isValid && nameRes.error) errs.name = nameRes.error

    if (totalDays < 1) {
      errs.durationDays = 'مدة الاشتراك يجب أن تكون يوماً واحداً على الأقل'
    } else if (totalDays > 3650) {
      errs.durationDays = 'مدة الاشتراك يجب ألا تتجاوز 10 سنوات'
    }

    if (price === undefined || price === null || price < 0) {
      errs.price = 'سعر الاشتراك لا يمكن أن يكون سالباً'
    } else if (price > 1000000) {
      errs.price = 'سعر الاشتراك يتجاوز الحد الأقصى المسموح به'
    }

    if (description.trim().length > 500) {
      errs.description = 'الوصف طويل جداً (الحد الأقصى 500 حرف)'
    }

    setPlanErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast.error(Object.values(errs)[0])
      return
    }

    if (!id) return
    setIsSaving(true)
    try {
      await plansApi.update(id, {
        name: planName.trim(),
        description: description.trim() || null,
        durationDays: totalDays,
        price: Number(price),
      })
      toast.success('تم تحديث الباقة بنجاح')
      setTimeout(() => {
        navigate('/app/plans')
      }, 500)
    } catch (err: any) {
      const { fieldErrors: backendErrors, generalMessage } = extractBackendErrors(err)
      if (Object.keys(backendErrors).length > 0) {
        setPlanErrors(backendErrors)
      }
      toast.error(generalMessage || 'فشل تحديث الباقة')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async () => {
    if (!id) return
    try {
      const newStatus = !isAvailableForNew
      await plansApi.updateStatus(id, newStatus)
      setIsAvailableForNew(newStatus)
      setShowDisableModal(false)
      toast.success(newStatus ? 'تم تفعيل الباقة بنجاح' : 'تم تعطيل الباقة بنجاح')
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'فشل تحديث حالة الباقة'
      toast.error(msg)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-zinc-950 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 font-cairo">
      {/* 2. Breadcrumbs & Header */}
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
            <span
              onClick={() => navigate('/app/plans')}
              className="hover:text-zinc-700 cursor-pointer"
            >
              خطط الاشتراك
            </span>
            <span>&gt;</span>
            <span className="text-zinc-900 font-bold">تعديل خطة</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950">تعديل خطة الاشتراك</h1>
            <span className="text-[11px] font-mono font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-lg">
              {planCode}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full',
                isAvailableForNew
                  ? 'text-emerald-800 bg-emerald-100/80'
                  : 'text-zinc-700 bg-zinc-200'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isAvailableForNew ? 'bg-emerald-600' : 'bg-zinc-500'
                )}
              />
              {isAvailableForNew ? 'نشطة' : 'معطلة'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            عدّل بيانات الخطة مع الحفاظ على الاشتراكات الحالية للأعضاء وتاريخ سريانها.
          </p>
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate('/app/plans')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-xs sm:text-sm font-bold hover:bg-zinc-50 transition-colors shadow-2xs"
        >
          <span>العودة إلى خطط الاشتراك</span>
          <ArrowLeft className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* 3. Main Grid (2 Columns: Right is Form Sections, Left is Sticky Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* RIGHT COLUMN: Form Sections (8 cols) */}
        <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
          {/* WARNING SYSTEM NOTICE BANNER */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-3 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-950">
                    تنبيه نظام: هذه الخطة مستخدمة حالياً من {activeMembers} عضو نشط
                  </h3>
                  <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                    تعديل السعر أو المدة سيطبّق على الاشتراكات الجديدة والتجديدات القادمة فقط، ولن يغيّر أي اشتراك سارٍ للأعضاء الحاليين للحفاظ على دقة الحسابات المحاسبية.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md shrink-0">
                تأثير مالي مقيّد
              </span>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-amber-200/60 text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span className="text-[11px] font-medium">
                  الأعضاء الحاليون يحتفظون بسعرهم الأصلي (500 ج.م) حتى نهاية اشتراكهم.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-2.5 h-2.5 stroke-[2.5]" />
                </div>
                <span className="text-[11px] font-medium">
                  المشتركون الجدد سيشاهدون البيانات والقيمة المحدثة فوراً بالاستقبال.
                </span>
              </div>
            </div>
          </div>

          {/* CARD 1: بيانات الخطة الأساسية */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-zinc-900" />
                <h3 className="text-sm sm:text-base font-black text-zinc-950">بيانات الخطة الأساسية</h3>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">
                البيانات الإلزامية مميزة بـ *
              </span>
            </div>

            <div className="space-y-4">
              {/* Field: Plan Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-800">
                    اسم الخطة <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-zinc-400">يظهر في بطاقات الاستقبال والإيصالات</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => handlePlanNameChange(e.target.value)}
                    placeholder="مثال: الاشتراك الشهري"
                    className={cn(
                      'w-full px-4 py-2.5 text-xs sm:text-sm bg-zinc-50 border rounded-xl focus:bg-white focus:outline-none transition-all font-bold',
                      planErrors.name
                        ? 'border-rose-400 bg-rose-50/50 text-rose-900'
                        : 'border-zinc-200 focus:border-zinc-900 text-zinc-900'
                    )}
                  />
                </div>
                <FieldError error={planErrors.name} />
              </div>

              {/* Field Grid: Price (Right in RTL) & Duration (Left in RTL) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Price (سعر الاشتراك) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-800">
                      سعر الاشتراك <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={price}
                      onChange={(e) => handlePriceChange(Number(e.target.value) || 0)}
                      className={cn(
                        'w-full pr-4 pl-16 py-2.5 text-xs sm:text-sm bg-zinc-50 border rounded-xl focus:bg-white focus:outline-none transition-all font-mono font-black text-lg',
                        planErrors.price
                          ? 'border-rose-400 bg-rose-50/50 text-rose-900'
                          : 'border-zinc-200 focus:border-zinc-900 text-zinc-900'
                      )}
                    />
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-zinc-500 pointer-events-none">
                      ج.م
                    </span>
                  </div>
                  <FieldError error={planErrors.price} />
                  <p className="text-[10px] text-zinc-400 mt-1">السعر الصافي شامل صلاحية الصالة</p>
                </div>

                {/* Duration (مدة الاشتراك) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-800">
                      مدة الاشتراك <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="1"
                        value={durationValue}
                        onChange={(e) => handleDurationChange(Number(e.target.value) || 0)}
                        className={cn(
                          'w-full px-4 py-2.5 text-xs sm:text-sm bg-zinc-50 border rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all font-mono font-bold',
                          planErrors.durationDays ? 'border-rose-400 bg-rose-50/50' : 'border-zinc-200'
                        )}
                      />
                    </div>
                    <select
                      value={durationUnit}
                      onChange={(e) => {
                        const newUnit = e.target.value as any
                        setDurationUnit(newUnit)
                        handleDurationChange(durationValue, newUnit)
                      }}
                      className="w-24 px-3 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold cursor-pointer"
                    >
                      <option value="DAYS">أيام</option>
                      <option value="MONTHS">شهور</option>
                      <option value="YEARS">سنوات</option>
                    </select>
                  </div>
                  <FieldError error={planErrors.durationDays} />
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                    <span>الحد الأدنى: 1 يوم</span>
                    <span className="font-mono text-zinc-500">يعادل {totalDays} يوماً فعلياً في النظام</span>
                  </div>
                </div>
              </div>

              {/* Computed Daily Cost Banner */}
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-zinc-700 font-bold">
                  <CreditCard className="w-4 h-4 text-zinc-500" />
                  <span>معدل التكلفة اليومي المحسوب:</span>
                </div>
                <div className="font-mono font-black text-sm text-zinc-950">
                  {dailyRate} ج.م / يوم
                </div>
              </div>

              {/* Description & Features */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-800">
                    وصف الخطة والمميزات
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اشتراك شهري مفتوح للجيم..."
                  className="w-full p-3 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all resize-none leading-relaxed text-zinc-800"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  يظهر هذا الوصف للأعضاء وموظفي الاستقبال أثناء إتمام التسجيل.
                </p>
              </div>

              {/* Bottom Information Note */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2 text-xs text-slate-600">
                <Info className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  سيتم تطبيق التعديلات على الخطة نفسها فور الحفظ، ولن تتأثر الاشتراكات المسجلة مسبقاً.
                </span>
              </div>
            </div>
          </div>

          {/* CARD 2: حالة الخطة وإعدادات الإتاحة */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-zinc-900" />
                <h3 className="text-sm sm:text-base font-black text-zinc-950">حالة الخطة وإعدادات الإتاحة</h3>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                متاحة حالياً
              </span>
            </div>

            {/* Switch 1: Available for new subscriptions */}
            <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/80 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-zinc-900">
                  الخطة متاحة للاشتراكات الجديدة
                </h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed max-w-xl">
                  عند تعطيل الخطة لن تظهر للأعضاء الجدد عند إنشاء أو تجديد اشتراك من قبل موظف الاستقبال أو شاشة الكاونتر.
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleActive}
                className={cn(
                  'w-12 h-6.5 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 relative flex items-center',
                  isAvailableForNew ? 'bg-amber-600' : 'bg-zinc-300'
                )}
              >
                <div
                  className={cn(
                    'w-4.5 h-4.5 rounded-full bg-white transition-transform duration-200 shadow-xs',
                    isAvailableForNew ? 'translate-x-0' : '-translate-x-5.5'
                  )}
                />
              </button>
            </div>

            {/* Item 2: Financial Integrity Safeguard */}
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-900">
                    حماية سلامة البيانات المالية
                  </h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed max-w-lg">
                    لا يمكن حذف هذه الخطة نهائياً نظراً لوجود {activeMembers} عضو نشط مرتبطين بها حالياً. يمكنك تعطيل الخطة بدلاً من حذفها.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDisableModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-white text-rose-700 text-xs font-bold hover:bg-rose-50 transition-colors shrink-0 shadow-2xs"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>تعطيل الخطة مؤقتاً</span>
              </button>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: Sidebar Cards (4 cols) */}
        <div className="lg:col-span-4 space-y-5 order-1 lg:order-2 lg:sticky lg:top-4">
          {/* 1. Live Preview Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600">
                <Eye className="w-3.5 h-3.5 text-zinc-500" />
                <span>معاينة مباشرة</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                نشطة
              </span>
            </div>

            {/* Dark Gym VIP Card Mockup (matching screenshot) */}
            <div className="bg-[#0B0B0B] text-white rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 border border-zinc-800 relative overflow-hidden">
              {/* Badges */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md font-mono">
                  {totalDays} يوم
                </span>
                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-full">
                  خطة صالة معتمدة
                </span>
              </div>

              {/* Title & description */}
              <div>
                <h3 className="text-xl font-black text-white">{planName || 'الاشتراك الشهري'}</h3>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                  {description || 'اشتراك شهري مفتوح للجيم، يشمل استخدام الصالة الرياضية كاملة.'}
                </p>
              </div>

              {/* Big Price */}
              <div className="flex items-baseline justify-between pt-1 border-t border-zinc-800/80">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[#F4D76A]">
                    {price.toLocaleString('ar-EG')}
                  </span>
                  <span className="text-xs font-bold text-zinc-400">ج.م</span>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  {dailyRate} ج.م / يوم
                </span>
              </div>

              {/* Features List */}
              <div className="space-y-1.5 text-xs text-zinc-300 pt-1">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-gym-gold shrink-0 stroke-[3]" />
                  <span className="text-[11px]">دخول كامل لصالة الحديد والأجهزة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-gym-gold shrink-0 stroke-[3]" />
                  <span className="text-[11px]">أجهزة الكارديو وتدريبات اللياقة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-gym-gold shrink-0 stroke-[3]" />
                  <span className="text-[11px]">استخدام غرف التبديل والخزائن الذكية</span>
                </div>
              </div>

              {/* Active Members Bar inside card */}
              <div className="pt-3 border-t border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 text-[11px]">المشتركون النشطون:</span>
                  <span className="font-bold text-zinc-200 text-[11px] font-mono">
                    {activeMembers} عضو ({activeMembersPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#F4D76A] h-full rounded-full transition-all duration-500"
                    style={{ width: `${activeMembersPercentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-500 text-left font-mono">
                  تمثل {activeMembersPercentage}% من إجمالي أعضاء النادي النشطين
                </p>
              </div>
            </div>
          </div>

          {/* 2. Historical Plan Stats Card (إحصائيات الخطة التاريخية) */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
              <FileText className="w-4 h-4 text-zinc-900" />
              <h3 className="text-xs sm:text-sm font-black text-zinc-950">
                إحصائيات الخطة التاريخية
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              {/* Stat 1: Active Members */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50">
                <div className="flex items-center gap-2 text-zinc-600">
                  <Users className="w-4 h-4 text-zinc-500" />
                  <span>الأعضاء النشطين</span>
                </div>
                <span className="font-black text-zinc-950 font-mono text-sm">
                  {activeMembers}
                </span>
              </div>

              {/* Stat 2: Total Revenue */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-900">
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold">إجمالي الإيرادات المحققة</span>
                </div>
                <span className="font-black text-emerald-900 font-mono text-sm">
                  {totalRevenue} ج.م
                </span>
              </div>

              {/* Stat 3: Created At */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50">
                <div className="flex items-center gap-2 text-zinc-600">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span>تاريخ إنشاء الخطة</span>
                </div>
                <span className="font-bold text-zinc-700 font-mono text-xs">
                  {createdAt}
                </span>
              </div>

              {/* Stat 4: Last Updated */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50">
                <div className="flex items-center gap-2 text-zinc-600">
                  <RotateCcw className="w-4 h-4 text-zinc-500" />
                  <span>آخر تعديل معتمد</span>
                </div>
                <span className="font-bold text-zinc-700 font-mono text-xs">
                  {lastUpdatedAt}
                </span>
              </div>
            </div>

            {/* Note */}
            <div className="pt-2 border-t border-zinc-100 flex items-center gap-2 text-[10px] text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-gym-gold shrink-0" />
              <span>التعديلات تُسجّل تلقائياً في سجل تدقيق العمليات المحاسبي.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Sticky Action Toolbar */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20">
        {/* Right Action (تعطيل/تفعيل الخطة) */}
        <button
          type="button"
          onClick={() => setShowDisableModal(true)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors shadow-2xs',
            isAvailableForNew
              ? 'border-zinc-200 text-zinc-700 hover:text-rose-700 hover:border-rose-300'
              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
          )}
        >
          {isAvailableForNew ? (
            <>
              <Ban className="w-3.5 h-3.5" />
              <span>تعطيل الخطة</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>تفعيل الخطة</span>
            </>
          )}
        </button>

        {/* Middle Info */}
        <div className="text-[11px] text-zinc-500 font-medium">
          تعديل تفاصيل باقة الاشتراك الرياضية وتحديث قيمتها المالية
        </div>

        {/* Left Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => navigate('/app/plans')}
            className="px-4 py-2.5 text-xs sm:text-sm font-bold text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-[#524419] hover:bg-[#3d3313] text-[#F4D76A] text-xs sm:text-sm font-black transition-all shadow-xs active:scale-[0.98] flex items-center gap-2"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-[#F4D76A] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MODAL: Disable/Enable Plan Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <div
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4',
                isAvailableForNew ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
              )}
            >
              {isAvailableForNew ? <Ban className="w-6 h-6" /> : <Check className="w-6 h-6" />}
            </div>
            <h3 className="text-base font-black text-zinc-900 text-center mb-1.5">
              {isAvailableForNew ? 'تأكيد تعطيل خطة الاشتراك' : 'تأكيد تفعيل خطة الاشتراك'}
            </h3>
            <p className="text-xs text-zinc-500 text-center leading-relaxed mb-6">
              {isAvailableForNew
                ? `هل أنت متأكد من تعطيل خطة "${planName}"؟ لن تظهر في قائمة الاشتراكات الجديدة لموظفي الاستقبال، بينما سيستمر الأعضاء المشتركون مسبقاً حتى نهاية اشتراكاتهم.`
                : `هل أنت متأكد من إعادة تفعيل خطة "${planName}"؟ ستصبح متاحة فوراً لموظفي الاستقبال لاختيارها عند تسجيل وتجديد الأعضاء.`}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleActive}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-colors',
                  isAvailableForNew ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                )}
              >
                {isAvailableForNew ? 'تأكيد التعطيل' : 'تأكيد التفعيل'}
              </button>
              <button
                onClick={() => setShowDisableModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors"
              >
                إلغاء
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
              تنبيه: توجد تعديلات غير محفوظة
            </h3>
            <p className="text-xs text-zinc-500 text-center leading-relaxed mb-6">
              لديك تعديلات على خطة الاشتراك لم يتم حفظها. هل تريد مغادرة الصفحة وإلغاء هذه التعديلات؟
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-colors"
              >
                متابعة التعديل
              </button>
              <button
                onClick={() => navigate('/app/plans')}
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

export default PlanEditPage
