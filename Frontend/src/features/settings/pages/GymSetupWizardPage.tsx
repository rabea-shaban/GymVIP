import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Building2,
  Smartphone,
  MapPin,
  RotateCcw,
  Trash2,
  Copy,
  LogOut,
  Lock,
  Receipt,
  Shield,
  Award,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { gymApi } from '@/features/gym/services/gymApi'
import { useAuth } from '@/features/auth/context/AuthContext'

export type WizardViewState =
  | 'default'       // الافتراضية
  | 'validation'    // أخطاء التحقق
  | 'saving'        // جاري الحفظ
  | 'saved'         // تم الحفظ بنجاح

export type LogoUploadState = 'empty' | 'uploading' | 'uploaded'

interface DaySchedule {
  day: string
  isOpen: boolean
  from: string
  to: string
}

export const GymSetupWizardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // State preview switchers matching the screenshot
  const [viewState, setViewState] = useState<WizardViewState>('default')
  const [logoState, setLogoState] = useState<LogoUploadState>('uploaded')

  // Form states matching screenshot
  const [gymName, setGymName] = useState('GymVIP Fitness Club')
  const [phone, setPhone] = useState('01012345678')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('القاهرة الجديدة')
  const [address, setAddress] = useState('شارع التسعين الشمالي، التجمع الخامس، القاهرة الجديدة')
  const [description, setDescription] = useState(
    'نادي رياضي متكامل مجهز بأحدث أجهزة اللياقة البدنية ومنطقة كروس فيت وحمام سباحة استشفائي في قلب التجمع الخامس.'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch existing gym data if available
  useEffect(() => {
    gymApi
      .getProfile()
      .then((gym) => {
        if (gym.name) setGymName(gym.name)
        if (gym.phone) setPhone(gym.phone)
        if (gym.email) setEmail(gym.email)
        if (gym.city) setCity(gym.city)
        if (gym.address) setAddress(gym.address)
      })
      .catch(() => {
        // Fallback to defaults if not logged in / preview mode
      })
  }, [])

  // 7-day schedule state
  const [schedule, setSchedule] = useState<DaySchedule[]>([
    { day: 'السبت', isOpen: true, from: '06:00 ص', to: '11:00 م' },
    { day: 'الأحد', isOpen: true, from: '06:00 ص', to: '11:00 م' },
    { day: 'الإثنين', isOpen: true, from: '06:00 ص', to: '11:00 م' },
    { day: 'الثلاثاء', isOpen: true, from: '06:00 ص', to: '11:00 م' },
    { day: 'الأربعاء', isOpen: true, from: '06:00 ص', to: '11:00 م' },
    { day: 'الخميس', isOpen: true, from: '06:00 ص', to: '12:00 منتصف الليل' },
    { day: 'الجمعة', isOpen: true, from: '01:00 م', to: '10:00 م' },
  ])

  // Apply Saturday schedule to all weekdays
  const handleApplyToAll = () => {
    const firstDay = schedule[0]
    setSchedule(
      schedule.map((item, idx) =>
        idx === 6 ? item : { ...item, from: firstDay.from, to: firstDay.to, isOpen: true }
      )
    )
  }

  const handleDayTimeChange = (index: number, field: 'from' | 'to', value: string) => {
    const next = [...schedule]
    next[index][field] = value
    setSchedule(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setViewState('saving')
    setErrorMessage(null)

    try {
      await gymApi.completeSetup({
        name: gymName,
        phone,
        email: email || undefined,
        address,
        city,
        currency: 'EGP',
        timezone: 'Africa/Cairo',
      })

      setViewState('saved')
      setTimeout(() => {
        navigate('/app/dashboard')
      }, 1000)
    } catch (err: any) {
      setViewState('validation')
      setErrorMessage(err.response?.data?.message || err.message || 'حدث خطأ أثناء حفظ الإعدادات')
    }
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:flex-row text-right font-body selection:bg-gym-primary selection:text-gym-black" dir="rtl">
      {/* =========================================================================
          DARK BRAND PANEL (Visual Left in LTR / RTL Start)
          ========================================================================= */}
      <div className="lg:w-[46%] xl:w-[48%] bg-[#0B0B0B] text-white p-6 sm:p-10 lg:p-14 flex flex-col justify-between relative overflow-hidden shrink-0 border-l border-zinc-800/80">
        {/* Subtle Golden Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/3" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#D4AF37]/8 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
            <Award className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>معتمد من الجمعية المصرية للياقة</span>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181818] border border-[#2B2618] text-xs font-semibold text-zinc-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.8)] shrink-0" />
            <span>المنصة الأولى لإدارة الصالات الرياضية بمصر</span>
          </div>
        </div>

        {/* Center Hero Typography */}
        <div className="relative z-10 my-10 lg:my-14 space-y-5">
          <span className="text-xs font-bold text-[#D4AF37] tracking-wider block">
            منظومة احترافية متكاملة
          </span>

          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black font-cairo leading-[1.25] tracking-tight text-white">
            قيادة ذكية لأكبر الأندية والصالات
            <br />
            الرياضية في مصر
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 font-body leading-relaxed max-w-xl">
            تحكم متكامل في الاشتراكات، بوابات الدخول الذكية، كشوف المدربين، وإحصائيات الإيرادات اليومية في لوحة قيادة واحدة مصممة لدعم نموك المؤسسي.
          </p>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="bg-[#141414]/90 border border-zinc-800/90 rounded-2xl p-5 flex flex-col justify-between">
              <span className="text-3xl font-bold font-cairo text-[#D4AF37]">+١٢,٠٠٠</span>
              <span className="text-xs text-zinc-400 mt-2 font-medium">عضو رياضي نشط شهرياً</span>
            </div>

            <div className="bg-[#141414]/90 border border-zinc-800/90 rounded-2xl p-5 flex flex-col justify-between">
              <span className="text-3xl font-bold font-cairo text-[#D4AF37]">٪٩٩.٩</span>
              <span className="text-xs text-zinc-400 mt-2 font-medium">جاهزية واستقرار السيرفرات السحابية</span>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 pt-6 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-[#D4AF37]" />
            <span>حماية بيانات الأعضاء</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-zinc-400" />
            <span>متوافق مع الفاتورة الإلكترونية المصرية</span>
          </div>

          <div className="text-[11px] font-mono text-zinc-500">
            الإصدار 4.2 Enterprise
          </div>
        </div>
      </div>

      {/* =========================================================================
          WHITE FORM WIZARD PANEL (Visual Right in LTR / RTL Form Side)
          ========================================================================= */}
      <div className="flex-1 bg-white p-6 sm:p-10 lg:p-14 flex flex-col justify-between overflow-y-auto">
        {/* User Profile and Brand Header */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-100 pt-1">
          {/* User Profile on Left (in RTL) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                await logout()
                navigate('/login')
              }}
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-zinc-900">{user?.name || 'المالك الرئيسي'}</span>
              <span className="text-[11px] text-zinc-400">
                {user?.role === 'OWNER' ? 'المالك الرئيسي' : user?.role === 'MANAGER' ? 'مدير النادي' : 'فريق العمل'}
              </span>
            </div>
          </div>

            {/* Brand Logo & Bit-256 Badge on Right (in RTL) */}
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-600 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span dir="ltr">اتصال آمن ومشفّر bit-256</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col text-left">
                  <span className="text-sm font-black font-cairo text-zinc-950">GymVIP</span>
                  <span className="text-[9px] text-zinc-400 font-mono -mt-1">Enterprise OS</span>
                </div>
                <div className="w-7 h-7 rounded-lg bg-[#0B0B0B] border border-zinc-800 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-[#D4AF37]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 5H5v14h2V5zm12 0h-2v14h2V5zM3 9H1v6h2V9zm20 0h-2v6h2V9zM15 11H9v2h6v-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

        {/* Step Progress Container */}
        <div className="my-6 p-5 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black font-cairo text-zinc-900">إعداد الجيم</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F4D76A] text-zinc-950 border border-amber-300">
                الخطوة 1 من 3
              </span>
            </div>
            <span className="text-xs font-bold text-zinc-400 font-cairo">٪٣٣ مكتمل</span>
          </div>

          {/* Progress Visual Bar */}
          <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#8B6D1B] h-full w-1/3 rounded-full" />
          </div>

          {/* 3 Step Trackers */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* Step 1: Active */}
            <div className="flex flex-col items-center text-center p-2 rounded-xl bg-white border border-zinc-200 shadow-xs">
              <div className="w-6 h-6 rounded-full bg-zinc-950 text-white font-bold font-cairo text-xs flex items-center justify-center mb-1">
                1
              </div>
              <span className="text-xs font-bold text-zinc-900">بيانات الجيم</span>
              <span className="text-[10px] text-zinc-400 mt-0.5">الاسم، العنوان، والمواعيد</span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-2 rounded-xl bg-transparent opacity-60">
              <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 font-bold font-cairo text-xs flex items-center justify-center mb-1">
                2
              </div>
              <span className="text-xs font-bold text-zinc-700">إعدادات أساسية</span>
              <span className="text-[10px] text-zinc-400 mt-0.5">خيارات النظام والعملة</span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-2 rounded-xl bg-transparent opacity-60">
              <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 font-bold font-cairo text-xs flex items-center justify-center mb-1">
                3
              </div>
              <span className="text-xs font-bold text-zinc-700">جاهز للبدء</span>
              <span className="text-[10px] text-zinc-400 mt-0.5">لوحة التحكم الفورية</span>
            </div>
          </div>
        </div>

        {/* Main Form Area */}
        <div className="max-w-2xl w-full mx-auto space-y-6">
          {/* Greeting */}
          <div className="space-y-1 text-right">
            <div className="flex items-center gap-2 justify-start">
              <h2 className="text-2xl sm:text-3xl font-black font-cairo text-zinc-950 tracking-tight">
                خلينا نجهز جيمك
              </h2>
              <span className="text-2xl">👋</span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 font-body">
              أدخل بعض البيانات الأساسية لنبدأ إعداد GymVIP لجيمك بكل سلاسة واحترافية.
            </p>
          </div>

          {/* Validation Alert when state is 'validation' */}
          {viewState === 'validation' && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage || 'يرجى استكمال كافة الحقول المطلوبة والتأكد من صحة رقم الهاتف.'}</span>
            </div>
          )}

          {/* Success Banner when state is 'saved' */}
          {viewState === 'saved' && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تم حفظ بيانات الجيم بنجاح! جاري الانتقال للخطوة التالية...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Grid Row: Gym Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Gym Name */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-zinc-900 block">
                  اسم الجيم <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    placeholder="أدخل اسم الصالة الرياضية"
                    className={cn(
                      'w-full h-11 pr-3.5 pl-10 text-sm bg-white border rounded-lg text-zinc-900 placeholder:text-zinc-400 transition-all font-body focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-[#D4AF37]/20 shadow-xs',
                      viewState === 'validation' && !gymName ? 'border-red-400 bg-red-50/20' : 'border-zinc-200'
                    )}
                    required
                  />
                  <div className="absolute left-3 text-zinc-400 pointer-events-none">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Gym Phone */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-zinc-900 block">
                  رقم هاتف الجيم <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute right-2 flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 font-semibold select-none">
                    <span className="text-sm">🇪🇬</span>
                    <span dir="ltr">20+</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className={cn(
                      'w-full h-11 pr-24 pl-10 text-sm bg-white border rounded-lg text-zinc-900 placeholder:text-zinc-400 transition-all font-body focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-[#D4AF37]/20 shadow-xs',
                      viewState === 'validation' && !phone ? 'border-red-400 bg-red-50/20' : 'border-zinc-200'
                    )}
                    required
                  />
                  <div className="absolute left-3 text-zinc-400 pointer-events-none">
                    <Smartphone className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Gym Address */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-zinc-900 block">
                عنوان الجيم <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المدينة، الحي، اسم الشارع، أو علامة مميزة"
                  className={cn(
                    'w-full h-11 pr-3.5 pl-10 text-sm bg-white border rounded-lg text-zinc-900 placeholder:text-zinc-400 transition-all font-body focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-[#D4AF37]/20 shadow-xs',
                    viewState === 'validation' && !address ? 'border-red-400 bg-red-50/20' : 'border-zinc-200'
                  )}
                  required
                />
                <div className="absolute left-3 text-zinc-400 pointer-events-none">
                  <MapPin className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Gym Logo Upload Section */}
            <div className="space-y-1.5 text-right">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-zinc-900">شعار الجيم (اختياري)</label>
                <span className="text-zinc-400 text-[11px]">PNG أو JPG بحد أقصى 5 ميجابايت</span>
              </div>

              {logoState === 'uploaded' && (
                <div className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                  {/* Right side: Image thumbnail + Name */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-[#0B0B0B] border-2 border-[#D4AF37] flex items-center justify-center shrink-0 p-1.5 shadow-xs">
                      <svg className="w-full h-full text-[#D4AF37]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 5H5v14h2V5zm12 0h-2v14h2V5zM3 9H1v6h2V9zm20 0h-2v6h2V9zM15 11H9v2h6v-2z" />
                      </svg>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-zinc-900 font-mono" dir="ltr">
                        gymvip-brand-logo.png
                      </span>
                      <span className="text-[11px] text-emerald-600 font-medium">
                        1.2 ميجابايت • تم التحقق والضغط بنجاح
                      </span>
                    </div>
                  </div>

                  {/* Left side actions: Change button + Delete */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLogoState('uploading')}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>تغيير الشعار</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLogoState('empty')}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="حذف الشعار"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {logoState === 'empty' && (
                <div
                  onClick={() => setLogoState('uploaded')}
                  className="border-2 border-dashed border-zinc-200 rounded-xl p-6 text-center cursor-pointer hover:bg-zinc-50 transition-colors"
                >
                  <p className="text-xs font-bold text-zinc-800">انقر هنا لاختيار شعار الجيم</p>
                  <p className="text-[11px] text-zinc-400 mt-1">يظهر الشعار في إيصالات الدفع وكشوف الحضور</p>
                </div>
              )}

              {logoState === 'uploading' && (
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-zinc-700">
                  <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                  <span>جاري معالجة الشعار وضغطه...</span>
                </div>
              )}
            </div>

            {/* Gym Description */}
            <div className="space-y-1.5 text-right">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-zinc-900">وصف الجيم (اختياري)</label>
                <span className="text-zinc-400 text-[11px] font-mono" dir="ltr">
                  {description.length} / 200 حرف
                </span>
              </div>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                className="w-full p-3 text-xs sm:text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 transition-all font-body focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-[#D4AF37]/20 shadow-xs resize-y"
              />
            </div>

            {/* Weekly Operating Schedule */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-right">
                  <h4 className="text-sm font-bold font-cairo text-zinc-950">ساعات العمل الأسبوعية</h4>
                  <p className="text-[11px] text-zinc-400">
                    حدد أوقات استقبال الأعضاء والتدريب لكل يوم (يمكن تعديلها بأي وقت)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleApplyToAll}
                  className="px-3 py-1.5 rounded-lg bg-[#F4D76A] hover:bg-[#D4AF37] text-zinc-950 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>تطبيق على كل أيام الأسبوع</span>
                </button>
              </div>

              {/* 7-Days Schedule Grid */}
              <div className="space-y-2">
                {schedule.map((dayItem, idx) => (
                  <div
                    key={dayItem.day}
                    className="flex items-center justify-between p-2.5 bg-blue-50/40 border border-blue-100/80 rounded-xl text-xs"
                  >
                    {/* Day Name */}
                    <div className="w-20 font-bold text-zinc-900 text-right">{dayItem.day}</div>

                    {/* Open Status Pill */}
                    <div className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#F4D76A] text-zinc-950 border border-amber-300">
                      مفتوح
                    </div>

                    {/* Time Range */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500 text-[11px]">من:</span>
                        <input
                          type="text"
                          value={dayItem.from}
                          onChange={(e) => handleDayTimeChange(idx, 'from', e.target.value)}
                          className="w-20 h-7 px-2 text-center text-xs font-bold rounded bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:border-zinc-900 shadow-2xs"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500 text-[11px]">إلى:</span>
                        <input
                          type="text"
                          value={dayItem.to}
                          onChange={(e) => handleDayTimeChange(idx, 'to', e.target.value)}
                          className="w-28 h-7 px-2 text-center text-xs font-bold rounded bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:border-zinc-900 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="pt-4 flex items-center justify-between border-t border-zinc-100">
              <button
                type="button"
                onClick={() => navigate('/app/dashboard')}
                className="text-xs font-bold text-zinc-600 hover:text-zinc-950 hover:underline"
              >
                تخطي الآن
              </button>

              <button
                type="submit"
                disabled={viewState === 'saving'}
                className="px-8 h-11 rounded-lg bg-[#7E6316] hover:bg-[#685210] active:bg-[#52410D] text-white font-bold font-cairo text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none"
              >
                {viewState === 'saving' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>جاري حفظ الإعدادات...</span>
                  </>
                ) : (
                  <>
                    <span>حفظ ومتابعة</span>
                    <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5 text-zinc-600 font-medium">
            <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>نظام سحابي آمن وموثوق</span>
          </div>

          <div>© 2025 GymVIP مصر. جميع الحقوق محفوظة لشركة المنظومات الرياضية المتطورة.</div>
        </div>
      </div>
    </div>
  )
}

export default GymSetupWizardPage
