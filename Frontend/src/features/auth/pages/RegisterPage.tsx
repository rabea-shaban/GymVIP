import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Mail,
  User,
  Smartphone,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Receipt,
  Shield,
  Award,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type RegisterViewState =
  | 'default'       // الافتراضية
  | 'mismatch'      // عدم تطابق المرور
  | 'duplicate'     // مسجل مسبقاً
  | 'loading'       // جاري الإنشاء
  | 'success'       // تم بنجاح

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()

  // State preview switcher matching the screenshot exactly
  const [viewState, setViewState] = useState<RegisterViewState>('default')

  // Form states
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (viewState === 'mismatch' || viewState === 'duplicate') return

    setViewState('loading')
    setTimeout(() => {
      setViewState('success')
      setTimeout(() => {
        navigate('/app/dashboard')
      }, 1000)
    }, 1200)
  }

  // Password rules validation simulation
  const hasMinLength = password.length >= 8 || viewState === 'default'
  const hasUpperCase = /[A-Z]/.test(password) || viewState === 'default'
  const hasLowerCase = /[a-z]/.test(password) || viewState === 'default'
  const hasNumber = /[0-9]/.test(password)

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:flex-row text-right font-body selection:bg-gym-primary selection:text-gym-black" dir="rtl">
      {/* =========================================================================
          DARK BRAND PANEL (Visual Left in LTR / RTL Start)
          ========================================================================= */}
      <div className="lg:w-[48%] xl:w-[50%] bg-[#0B0B0B] text-white p-6 sm:p-10 lg:p-14 flex flex-col justify-between relative overflow-hidden shrink-0 border-l border-zinc-800/80">
        {/* Ambient Subtle Golden Lighting */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/3" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#D4AF37]/8 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header of Dark Panel */}
        <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
          {/* Tag 1: Egyptian Fitness Association Endorsement */}
          <div className="inline-flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
            <Award className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>معتمد من الجمعية المصرية للياقة</span>
          </div>

          {/* Tag 2: Top Pill Badge */}
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
            {/* Stat Card 1: Active Members */}
            <div className="bg-[#141414]/90 border border-zinc-800/90 rounded-2xl p-5 flex flex-col justify-between">
              <span className="text-3xl font-bold font-cairo text-[#D4AF37]">+١٢,٠٠٠</span>
              <span className="text-xs text-zinc-400 mt-2 font-medium">عضو رياضي نشط شهرياً</span>
            </div>

            {/* Stat Card 2: Server Uptime */}
            <div className="bg-[#141414]/90 border border-zinc-800/90 rounded-2xl p-5 flex flex-col justify-between">
              <span className="text-3xl font-bold font-cairo text-[#D4AF37]">٪٩٩.٩</span>
              <span className="text-xs text-zinc-400 mt-2 font-medium">جاهزية واستقرار السيرفرات السحابية</span>
            </div>
          </div>
        </div>

        {/* Bottom Footer of Dark Panel */}
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
          WHITE FORM PANEL (Visual Right in LTR / RTL Form Side)
          ========================================================================= */}
      <div className="flex-1 bg-white p-6 sm:p-10 lg:p-14 flex flex-col justify-between overflow-y-auto">
        {/* Top Header Bar inside Form Side */}
        <div className="space-y-4 pb-6 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            {/* Country Selector on Right (in RTL) */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
              <Globe className="w-4 h-4 text-zinc-500" />
              <span>مصر (EGP)</span>
            </div>

            {/* Brand Logo on Left */}
            <div className="flex items-center gap-2">
              <span className="text-xl font-black font-cairo tracking-tight text-zinc-950">
                Gym<span className="text-[#D4AF37]">VIP</span>
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#0B0B0B] border border-zinc-800 flex items-center justify-center shadow-xs">
                <svg className="w-4 h-4 text-[#D4AF37]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 5H5v14h2V5zm12 0h-2v14h2V5zM3 9H1v6h2V9zm20 0h-2v6h2V9zM15 11H9v2h6v-2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Interactive State Switcher */}
          <div className="p-1 bg-zinc-100 rounded-lg border border-zinc-200/80 flex items-center justify-between text-xs overflow-x-auto">
            <span className="text-zinc-500 font-semibold px-2 whitespace-nowrap">معاينة الحالات:</span>
            <div className="flex items-center gap-1">
              {[
                { id: 'default', label: 'الافتراضية' },
                { id: 'mismatch', label: 'عدم تطابق المرور' },
                { id: 'duplicate', label: 'مسجل مسبقاً' },
                { id: 'loading', label: 'جاري الإنشاء' },
                { id: 'success', label: 'تم بنجاح ✓' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewState(tab.id as RegisterViewState)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap',
                    viewState === tab.id
                      ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/70 font-bold'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Main Form */}
        <div className="max-w-md w-full mx-auto py-6 space-y-5">
          {/* Top Badges & Heading */}
          <div className="space-y-2 text-right">
            <div className="flex items-center gap-2 justify-start">
              <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-zinc-950 text-white font-mono">
                SaaS Enterprise
              </span>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-[11px] text-zinc-600 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span dir="ltr">اتصال آمن ومشفّر bit-256</span>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black font-cairo text-zinc-950 tracking-tight pt-1">
              إنشاء حساب جديد
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 font-body">
              أنشئ حسابك وابدأ إدارة جيمك بسهولة وكفاءة فائقة.
            </p>
          </div>

          {/* Error Banner for Duplicate Phone/Email */}
          {viewState === 'duplicate' && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>رقم الهاتف أو البريد الإلكتروني مسجل بالفعل لصالة رياضية أخرى.</span>
            </div>
          )}

          {/* Success Banner */}
          {viewState === 'success' && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تم إنشاء الحساب بنجاح! جاري تحويلك إلى لوحة الإدارة...</span>
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Full Name */}
            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-zinc-900 block">الاسم بالكامل</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أدخل اسمك بالكامل"
                  className="w-full h-11 pr-3.5 pl-10 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 transition-all font-body focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-[#D4AF37]/20 shadow-xs"
                  required
                />
                <div className="absolute left-3 text-zinc-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* 2. Phone Number with Egypt (+20) Pill */}
            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-zinc-900 block">رقم الهاتف</label>
              <div className="relative flex items-center">
                <div className="absolute right-2 flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 font-semibold select-none">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                  <span dir="ltr">مصر (20+)</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className={cn(
                    'w-full h-11 pr-28 pl-10 text-sm bg-white border rounded-lg text-zinc-900 placeholder:text-zinc-400 transition-all font-body focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-[#D4AF37]/20 shadow-xs',
                    viewState === 'duplicate' ? 'border-red-400 bg-red-50/20' : 'border-zinc-200'
                  )}
                  required
                />
                <div className="absolute left-3 text-zinc-400 pointer-events-none">
                  <Smartphone className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* 3. Email */}
            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-zinc-900 block">البريد الإلكتروني</label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gymdomain.com"
                  className={cn(
                    'w-full h-11 pr-3.5 pl-10 text-sm bg-white border rounded-lg text-zinc-900 placeholder:text-zinc-400 transition-all font-body focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-[#D4AF37]/20 shadow-xs',
                    viewState === 'duplicate' ? 'border-red-400 bg-red-50/20' : 'border-zinc-200'
                  )}
                  required
                />
                <div className="absolute left-3 text-zinc-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* 4. Password */}
            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-zinc-900 block">كلمة المرور</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أنشئ كلمة مرور قوية"
                  className="w-full h-11 pr-10 pl-10 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 transition-all font-body focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-[#D4AF37]/20 shadow-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-zinc-400 hover:text-zinc-700 transition-colors"
                  title={showPassword ? 'إخفاء' : 'إظهار'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <div className="absolute left-3 text-zinc-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Password Strength Card Indicator */}
            <div className="p-3.5 bg-zinc-50 rounded-lg border border-zinc-200/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-zinc-600">
                <span className="font-semibold text-zinc-700">قوة كلمة المرور:</span>
                <span className="font-bold text-amber-700">متوسطة</span>
              </div>

              {/* Strength Meter Bar */}
              <div className="grid grid-cols-3 gap-1.5 h-1.5">
                <div className="bg-[#997D1A] rounded-full" />
                <div className="bg-[#997D1A] rounded-full" />
                <div className="bg-zinc-200 rounded-full" />
              </div>

              {/* Password Rules Check List */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-700">
                  <CheckCircle2 className={cn('w-3.5 h-3.5', hasMinLength ? 'text-amber-700' : 'text-zinc-300')} />
                  <span>8 أحرف على الأقل</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-700">
                  <CheckCircle2 className={cn('w-3.5 h-3.5', hasUpperCase ? 'text-amber-700' : 'text-zinc-300')} />
                  <span>حرف كبير (A-Z)</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-700">
                  <CheckCircle2 className={cn('w-3.5 h-3.5', hasLowerCase ? 'text-amber-700' : 'text-zinc-300')} />
                  <span>حرف صغير (a-z)</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-700">
                  <span className={cn('w-3.5 h-3.5 rounded-full border flex items-center justify-center', hasNumber ? 'border-amber-700 text-amber-700' : 'border-zinc-300')} />
                  <span>رقم واحد على الأقل</span>
                </div>
              </div>
            </div>

            {/* 5. Confirm Password */}
            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-zinc-900 block">تأكيد كلمة المرور</label>
              <div className="relative flex items-center">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  className={cn(
                    'w-full h-11 pr-10 pl-10 text-sm bg-white border rounded-lg text-zinc-900 placeholder:text-zinc-400 transition-all font-body focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-[#D4AF37]/20 shadow-xs',
                    viewState === 'mismatch' ? 'border-red-400 bg-red-50/20' : 'border-zinc-200'
                  )}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 text-zinc-400 hover:text-zinc-700 transition-colors"
                  title={showConfirmPassword ? 'إخفاء' : 'إظهار'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <div className="absolute left-3 text-zinc-400 pointer-events-none">
                  <RotateCcw className="w-4 h-4" />
                </div>
              </div>
              {viewState === 'mismatch' && (
                <span className="text-[11px] text-red-600 font-semibold block mt-0.5">
                  كلمتا المرور غير متطابقتين، يرجى إعادة التحقق.
                </span>
              )}
            </div>

            {/* Terms Agreement Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <div
                onClick={() => setAgreedToTerms(!agreedToTerms)}
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer mt-0.5 shrink-0',
                  agreedToTerms
                    ? 'bg-zinc-950 border-zinc-950 text-white'
                    : 'border-zinc-300 bg-white'
                )}
              >
                {agreedToTerms && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <label
                onClick={() => setAgreedToTerms(!agreedToTerms)}
                className="text-xs text-zinc-700 leading-relaxed cursor-pointer select-none"
              >
                أوافق تماماً على{' '}
                <a href="#terms" className="font-bold text-zinc-900 underline">
                  شروط الاستخدام
                </a>{' '}
                و{' '}
                <a href="#privacy" className="font-bold text-[#D4AF37] underline">
                  سياسة الخصوصية
                </a>{' '}
                الخاصة بمنظومة GymVIP مصر.
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={viewState === 'loading'}
                className="w-full h-12 rounded-lg bg-[#F4D76A] hover:bg-[#D4AF37] active:bg-[#B8941F] text-zinc-950 font-bold font-cairo text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none"
              >
                {viewState === 'loading' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-950" />
                    <span>جاري إعداد حساب الصالة...</span>
                  </>
                ) : (
                  <>
                    <span>إنشاء الحساب</span>
                    <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Sign In Link */}
          <div className="text-center text-xs text-zinc-600 pt-2">
            لديك حساب بالفعل؟{' '}
            <Link to="/login" className="font-bold text-zinc-950 hover:underline">
              تسجيل الدخول
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5 text-zinc-600 font-medium">
            <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>نظام سحابي آمن وموثوق</span>
          </div>

          <div>© 2025 GymVIP مصر. جميع الحقوق محفوظة.</div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
