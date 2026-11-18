import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  CreditCard,
  Lightbulb,
  ShieldCheck,
  Award,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/feedback/Toast'
import { plansApi } from '@/features/plans/services/plansApi'
import { validateName, extractBackendErrors } from '@/lib/validation'
import { FieldError } from '@/components/ui/FieldError'

export const PlanCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const toast = useToast()

  const [isSaving, setIsSaving] = useState(false)

  // Form Fields State
  const [planName, setPlanName] = useState('')
  const [durationValue, setDurationValue] = useState<number>(30)
  const [durationUnit, setDurationUnit] = useState<'DAYS' | 'MONTHS' | 'YEARS'>('DAYS')
  const [price, setPrice] = useState<number>(500)
  const [description, setDescription] = useState('')
  const [isAvailableForNew, setIsAvailableForNew] = useState(true)
  const [isVipFeatured, setIsVipFeatured] = useState(false)
  const [planErrors, setPlanErrors] = useState<Record<string, string>>({})

  // Unsaved Modal
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)

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

  // Quick Presets Handler
  const handleApplyPreset = (preset: {
    name: string
    days: number
    price: number
    vip?: boolean
    desc: string
  }) => {
    setPlanName(preset.name)
    setDurationValue(preset.days)
    setDurationUnit('DAYS')
    setPrice(preset.price)
    setIsVipFeatured(!!preset.vip)
    setDescription(preset.desc)
    setPlanErrors({})
    toast.success(`تم تطبيق نموذج "${preset.name}" بنجاح`)
  }

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
      err = 'مدة الاشتراك يجب ألا تتجاوز 10 سنوات (3650 يوماً)'
    }
    setPlanErrors((prev) => ({ ...prev, durationDays: err }))
  }

  const validatePlan = () => {
    const errs: Record<string, string> = {}
    const nameRes = validateName(planName, 'اسم الخطة', 2, 100)
    if (!nameRes.isValid && nameRes.error) errs.name = nameRes.error

    if (totalDays < 1) {
      errs.durationDays = 'مدة الاشتراك يجب أن تكون يوماً واحداً على الأقل'
    } else if (totalDays > 3650) {
      errs.durationDays = 'مدة الاشتراك يجب ألا تتجاوز 10 سنوات (3650 يوماً)'
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
    return { isValid: Object.keys(errs).length === 0, errors: errs }
  }

  const handleSavePlan = async (addAnother: boolean = false) => {
    const { isValid, errors: validationErrors } = validatePlan()
    if (!isValid) {
      toast.error(Object.values(validationErrors)[0])
      return
    }

    setIsSaving(true)
    try {
      await plansApi.create({
        name: planName.trim(),
        description: description.trim() || null,
        durationDays: totalDays,
        price: Number(price),
      })

      toast.success('تم إنشاء الباقة بنجاح')

      if (addAnother) {
        setPlanName('')
        setPrice(500)
        setDurationValue(30)
        setDescription('')
        setIsVipFeatured(false)
        setPlanErrors({})
      } else {
        setTimeout(() => navigate('/app/plans'), 400)
      }
    } catch (err: any) {
      const { fieldErrors: backendErrors, generalMessage } = extractBackendErrors(err)
      if (Object.keys(backendErrors).length > 0) {
        setPlanErrors(backendErrors)
      }
      toast.error(generalMessage || 'فشل إنشاء الباقة')
    } finally {
      setIsSaving(false)
    }
  }

  const isFormDirty = Boolean(planName || description || price !== 500)

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
            <span className="text-zinc-900 font-bold">إضافة خطة</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950">إضافة خطة اشتراك</h1>
            <span className="text-[11px] font-black text-amber-900 bg-[#F4D76A] px-2.5 py-0.5 rounded-full shadow-2xs">
              باقة معتمدة
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            أنشئ خطة جديدة ليتمكن موظفو الاستقبال من اختيارها فوراً وسلاسة عند تسجيل أو تجديد الأعضاء.
          </p>
        </div>

        {/* Back Button */}
        <button
          onClick={() => {
            if (isFormDirty) {
              setShowUnsavedModal(true)
            } else {
              navigate('/app/plans')
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-xs sm:text-sm font-bold hover:bg-zinc-50 transition-colors shadow-2xs"
        >
          <span>العودة إلى خطط الاشتراك</span>
          <ArrowLeft className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* 3. Main Grid (2 Columns: Right is Form Sections, Left is Sticky Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* RIGHT COLUMN: Form Sections (7-8 cols) */}
        <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
          {/* Quick Presets Bar */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gym-gold-dark" />
                <h3 className="text-xs sm:text-sm font-black text-zinc-950">
                  النماذج السريعة المعتمدة (Quick Presets)
                </h3>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium">تعبئة البيانات بنقرة واحدة</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Preset 1: Monthly */}
              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    name: 'الاشتراك الشهري المميز',
                    days: 30,
                    price: 650,
                    vip: false,
                    desc: 'تشمل الدخول الكامل إلى الصالة الرياضية، حصص الكارديو، غرف البخار والساونا مجاناً طوال فترة الاشتراك.',
                  })
                }
                className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-zinc-100 text-right transition-all group"
              >
                <p className="text-xs font-bold text-zinc-900 group-hover:text-zinc-950">شهري أساسي</p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">30 يوماً • 650 ج.م</p>
              </button>

              {/* Preset 2: 3 Months */}
              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    name: 'اشتراك 3 شهور (ربع سنوي)',
                    days: 90,
                    price: 1650,
                    vip: false,
                    desc: 'تغطية شاملة لمدة 90 يوماً لكافة الأجهزة والمنطقة الحرة وحصص اللياقة الجماعية.',
                  })
                }
                className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-zinc-100 text-right transition-all group"
              >
                <p className="text-xs font-bold text-zinc-900 group-hover:text-zinc-950">3 شهور ربع سنوي</p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">90 يوماً • 1650 ج.م</p>
              </button>

              {/* Preset 3: 6 Months */}
              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    name: 'اشتراك 6 شهور (نصف سنوي)',
                    days: 180,
                    price: 2900,
                    vip: false,
                    desc: 'باقة تدريبية نصف سنوية تشمل دخول كافة الأقسام مع إمكانية التجميد حتى 30 يوماً.',
                  })
                }
                className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-zinc-100 text-right transition-all group"
              >
                <p className="text-xs font-bold text-zinc-900 group-hover:text-zinc-950">6 شهور نصف سنوي</p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">180 يوماً • 2900 ج.م</p>
              </button>

              {/* Preset 4: VIP Annual */}
              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    name: 'اشتراك سنوي VIP النخبة',
                    days: 365,
                    price: 4800,
                    vip: true,
                    desc: 'عضوية VIP سنوية كاملة بدون حدود مع استشارة تدريب وتغذية مجانية وخزانة خاصة.',
                  })
                }
                className="p-2.5 rounded-xl border border-amber-300 bg-[#F4D76A]/30 hover:bg-[#F4D76A]/50 text-right transition-all group"
              >
                <p className="text-xs font-black text-amber-950 flex items-center justify-between">
                  <span>VIP السنوي</span>
                  <Award className="w-3.5 h-3.5 text-gym-gold-dark" />
                </p>
                <p className="text-[10px] text-amber-900 font-mono mt-0.5">365 يوماً • 4800 ج.م</p>
              </button>
            </div>
          </div>

          {/* SECTION 1: بيانات الخطة الأساسية */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black text-xs">
                1
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-zinc-950">بيانات الخطة الأساسية</h3>
                <p className="text-[11px] text-zinc-500">
                  البيانات الإلزامية التي تحدد هيكل الخطة وقيمتها المالية والزمنية
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Field: Plan Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-800">
                    اسم الخطة <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-zinc-400">يظهر في بطاقات المشتركين والعقود</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => handlePlanNameChange(e.target.value)}
                    placeholder="مثال: الاشتراك الشهري المميز"
                    className={cn(
                      'w-full pr-4 pl-10 py-2.5 text-xs sm:text-sm bg-zinc-50 border rounded-xl focus:bg-white focus:outline-none transition-all font-bold',
                      planErrors.name
                        ? 'border-rose-400 bg-rose-50/50 text-rose-900'
                        : 'border-zinc-200 focus:border-zinc-900 text-zinc-900'
                    )}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <FieldError error={planErrors.name} />
              </div>

              {/* Field Grid: Duration & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Duration */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-800">
                      مدة الاشتراك <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                      يعادل {totalDays} يوماً
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="1"
                        value={durationValue}
                        onChange={(e) => handleDurationChange(Number(e.target.value) || 0)}
                        className="w-full pr-4 pl-10 py-2.5 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all font-mono font-bold"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                    </div>
                    <select
                      value={durationUnit}
                      onChange={(e) => {
                        const newUnit = e.target.value as any
                        setDurationUnit(newUnit)
                        handleDurationChange(durationValue, newUnit)
                      }}
                      className="w-28 px-3 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold cursor-pointer"
                    >
                      <option value="DAYS">يوم</option>
                      <option value="MONTHS">شهر</option>
                      <option value="YEARS">سنة</option>
                    </select>
                  </div>
                  <FieldError error={planErrors.durationDays} />
                </div>

                {/* Price */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-800">
                      سعر الاشتراك الإجمالي <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-zinc-400">شامل الصلاحيات المحددة</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={price}
                      onChange={(e) => handlePriceChange(Number(e.target.value) || 0)}
                      className={cn(
                        'w-full pr-4 pl-20 py-2.5 text-xs sm:text-sm bg-zinc-50 border rounded-xl focus:bg-white focus:outline-none transition-all font-mono font-black text-lg',
                        planErrors.price
                          ? 'border-rose-400 bg-rose-50/50 text-rose-900'
                          : 'border-zinc-200 focus:border-zinc-900 text-zinc-900'
                      )}
                    />
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-zinc-500 pointer-events-none">
                      ج.م (EGP)
                    </span>
                  </div>
                  <FieldError error={planErrors.price} />
                </div>
              </div>

              {/* Computed Daily Cost Banner */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  <span>معدل التكلفة اليومية للعضو:</span>
                </div>
                <div className="font-mono font-black text-sm text-zinc-950">
                  {dailyRate} ج.م / اليوم
                </div>
              </div>

              {/* Description & Features */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-800">
                    وصف الخطة ومميزاتها <span className="text-zinc-400">(اختياري)</span>
                  </label>
                  <span className="text-[10px] text-zinc-400">يظهر لموظف الاستقبال لسهولة التوجيه</span>
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="أضف وصفاً شاملاً لمميزات الباقة وما تشتمله من خدمات..."
                  className="w-full p-3 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: إعدادات وظهور الخطة */}
          <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black text-xs">
                2
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-zinc-950">إعدادات وظهور الخطة</h3>
                <p className="text-[11px] text-zinc-500">
                  التحكم في إتاحة الخطة لطاقم العمل وتمييزها في شاشات التسجيل
                </p>
              </div>
            </div>

            {/* Switch Item 1: Available */}
            <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/80 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-900">
                    الخطة متاحة للاشتراكات الجديدة
                  </h4>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full',
                      isAvailableForNew
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-zinc-200 text-zinc-600'
                    )}
                  >
                    {isAvailableForNew ? 'نشطة' : 'معطلة'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed max-w-xl">
                  عند تعطيل الخطة، لن تظهر في القائمة المنسدلة لموظف الاستقبال عند إضافة أو تجديد اشتراك أي عضو جديد.
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setIsAvailableForNew(!isAvailableForNew)}
                className={cn(
                  'w-12 h-6.5 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 relative flex items-center',
                  isAvailableForNew ? 'bg-zinc-950' : 'bg-zinc-300'
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

            {/* Switch Item 2: VIP Featured */}
            <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/80 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-900">
                    إظهار الخطة كخيار مميز (VIP Featured)
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    شارة ذهبية
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed max-w-xl">
                  تظهر الخطة ببريق ذهبي وأيقونة النجمة في مقدمة الخيارات لترويجها كأفضل قيمة للمشتركين.
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setIsVipFeatured(!isVipFeatured)}
                className={cn(
                  'w-12 h-6.5 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 relative flex items-center',
                  isVipFeatured ? 'bg-gym-gold' : 'bg-zinc-300'
                )}
              >
                <div
                  className={cn(
                    'w-4.5 h-4.5 rounded-full bg-white transition-transform duration-200 shadow-xs',
                    isVipFeatured ? 'translate-x-0' : '-translate-x-5.5'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: Sticky Live Preview Card (4-5 cols) */}
        <div className="lg:col-span-4 space-y-4 order-1 lg:order-2 lg:sticky lg:top-4">
          {/* Live Preview Header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-zinc-600">معاينة حية وفورية</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              مباشر (Live)
            </span>
          </div>

          {/* Live Card Mockup (matching screenshot left preview) */}
          <div
            className={cn(
              'rounded-3xl border p-5 sm:p-6 shadow-xl transition-all duration-300 space-y-5',
              isVipFeatured
                ? 'bg-white border-gym-gold/60 ring-2 ring-gym-gold/20'
                : 'bg-white border-zinc-200/90'
            )}
          >
            {/* Header badges */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-medium">
                {isVipFeatured ? 'باقة VIP النخبة' : 'خطة رياضية قياسية'}
              </span>
              <span
                className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full',
                  isAvailableForNew
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-zinc-200 text-zinc-600'
                )}
              >
                {isAvailableForNew ? 'نشطة' : 'معطلة'}
              </span>
            </div>

            {/* Plan Title */}
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-zinc-950 truncate">
                {planName || 'اسم الخطة...'}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium mt-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  صلاحية لمدة {totalDays} يوماً ({totalDays} يوم)
                </span>
              </div>
            </div>

            {/* Price Box */}
            <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-medium">قيمة الاشتراك</span>
                <span className="text-[10px] font-bold text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded-md">
                  شامل الضريبة والخدمات
                </span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-zinc-950">
                  {price.toLocaleString('ar-EG')}
                </span>
                <span className="text-sm font-bold text-zinc-500">ج.م</span>
              </div>

              <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-1 border-t border-slate-200/60 font-mono">
                <span>التكلفة الفعلية المقدرة:</span>
                <span className="font-bold text-zinc-900">{dailyRate} ج.م / يومياً</span>
              </div>
            </div>

            {/* Features Description */}
            <div className="space-y-1.5 text-xs">
              <p className="font-bold text-zinc-800">المميزات والخدمات المشمولة:</p>
              <p className="text-zinc-600 text-[11px] leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-100 min-h-16">
                {description || 'لا توجد مميزات مضافة بعد...'}
              </p>
            </div>

            {/* Mock CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled
                className="w-full py-2.5 rounded-xl bg-zinc-950 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-default opacity-95"
              >
                <User className="w-3.5 h-3.5 text-gym-gold" />
                <span>تسكين عضو في هذه الخطة</span>
              </button>
              <p className="text-[10px] text-zinc-400 text-center mt-1.5 font-medium">
                شكل الخطة في شاشة كابتن الاستقبال
              </p>
            </div>
          </div>

          {/* Pricing Pro-Tip Box */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-950 space-y-1.5">
            <div className="flex items-center gap-2 font-bold">
              <div className="w-6 h-6 rounded-lg bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0">
                <Lightbulb className="w-3.5 h-3.5" />
              </div>
              <span className="font-black text-amber-900">نصيحة تسعير احترافية:</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed pr-8">
              الخطط نصف السنوية والسنوية المميزة بشارة VIP تحقق معدل تجديد أعلى بنسبة 35% في أندية القاهرة والإسكندرية.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Bottom Action Toolbar (matching screenshot bottom bar) */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20">
        {/* Right Info message */}
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>الخطة تضاف فوراً دون الحاجة لإعادة تشغيل النظام أو الخروج</span>
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
            onClick={() => handleSavePlan(true)}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl border border-zinc-900 bg-zinc-900 text-white text-xs sm:text-sm font-bold hover:bg-zinc-800 transition-colors"
          >
            + حفظ وإضافة خطة أخرى
          </button>

          <button
            type="button"
            onClick={() => handleSavePlan(false)}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-[#F4D76A] hover:bg-gym-gold text-zinc-950 text-xs sm:text-sm font-black transition-all shadow-xs active:scale-[0.98] flex items-center gap-2"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>حفظ الخطة</span>
              </>
            )}
          </button>
        </div>
      </div>

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
              لديك بيانات مدخلة في نموذج الخطة لم يتم حفظها بعد. هل تريد مغادرة الصفحة وإلغاء الإنشاء؟
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

export default PlanCreatePage
