import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Mail,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Award,
  Dumbbell,
  Server,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '@/types'

interface RoleCredential {
  id: string
  label: string
  email: string
  roleName: string
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  // Form states
  const [email, setEmail] = useState('capt.ahmed@gymvip.eg')
  const [password, setPassword] = useState('GymVIP2025#')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState('صاحب النادي')

  const roles: RoleCredential[] = [
    { id: 'owner', label: 'صاحب النادي', email: 'capt.ahmed@gymvip.eg', roleName: 'Owner / Admin' },
    { id: 'manager', label: 'المدير التنفيذي', email: 'manager@gymvip.eg', roleName: 'Branch Manager' },
    { id: 'reception', label: 'موظف الاستقبال', email: 'reception@gymvip.eg', roleName: 'Receptionist' },
    { id: 'trainer', label: 'المدرب الرياضي', email: 'amlb31388@gmail.com', roleName: 'Fitness Coach' },
  ]

  const handleRoleSelect = (role: RoleCredential) => {
    setSelectedRole(role.label)
    setEmail(role.email)
    setPassword('GymVIP2025#')
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      let role: UserRole = 'OWNER'
      if (selectedRole.includes('مدير') || selectedRole.includes('المدير')) {
        role = 'MANAGER'
      } else if (selectedRole.includes('استقبال')) {
        role = 'RECEPTIONIST'
      } else if (selectedRole.includes('مدرب') || selectedRole.includes('المدرب')) {
        role = 'TRAINER'
      }

      await login({ phoneOrEmail: email, password, role })
      const target =
        role === 'TRAINER'
          ? '/app/trainer/dashboard'
          : role === 'RECEPTIONIST'
          ? '/app/reception/dashboard'
          : '/app/dashboard'
      setSuccessMessage('تم التحقق بنجاح! جاري التوجيه للوحة التحكم...')
      setTimeout(() => {
        navigate(target)
      }, 500)
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل تسجيل الدخول. يرجى التحقق من صحة البريد الإلكتروني وكلمة المرور.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0B0B] lg:bg-[#F4F5F7] flex flex-col text-right font-body selection:bg-[#D4AF37] selection:text-black" dir="rtl">
      {/* Main Split Grid */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto">
        
        {/* =========================================================================
            RIGHT HALF IN RTL: Dark Brand Showcase Panel
            ========================================================================= */}
        <div className="lg:w-[48%] xl:w-[50%] bg-[#0B0B0B] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden shrink-0 border-l border-zinc-800/80">
          {/* Ambient Warm Golden Glows */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/3" />
          <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#D4AF37]/8 rounded-full blur-3xl pointer-events-none" />

          {/* Top Badges & Tagline */}
          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181818] border border-[#2B2618] text-xs font-semibold text-zinc-300 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.8)] shrink-0" />
                <span>المنصة الأولى لإدارة الصالات الرياضية بمصر</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[#D4AF37] text-xs font-medium">
                <Award className="w-3.5 h-3.5" />
                <span>معتمد من الجمعية المصرية للياقة</span>
              </div>
            </div>

            {/* Hero Typography */}
            <div className="space-y-4 pt-4">
              <div className="inline-block text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                منظومة احترافية متكاملة
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-cairo leading-[1.3] tracking-tight text-white">
                قيادة ذكية لأكبر الأندية والصالات الرياضية في مصر
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 font-body leading-relaxed max-w-xl">
                تحكم متكامل في الاشتراكات، بوابات الدخول الذكية، كشوف المدربين، وإحصائيات الإيرادات اليومية في لوحة قيادة واحدة مصممة لدعم نموك المؤسسي.
              </p>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="relative z-10 my-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            {/* Stat 1 */}
            <div className="rounded-2xl bg-[#141416]/90 border border-zinc-800/80 p-5 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-[#D4AF37]/40 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400 font-medium">الأعضاء النشطين</span>
                <span className="w-8 h-8 rounded-lg bg-[#1E1E22] flex items-center justify-center text-[#D4AF37]">
                  <Zap className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-cairo text-white tracking-tight">
                ١٢,٠٠٠+
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-body">
                عضو رياضي نشط شهرياً في مختلف الفروع
              </p>
            </div>

            {/* Stat 2 */}
            <div className="rounded-2xl bg-[#141416]/90 border border-zinc-800/80 p-5 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-[#D4AF37]/40 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400 font-medium">الاستقرار والأمان</span>
                <span className="w-8 h-8 rounded-lg bg-[#1E1E22] flex items-center justify-center text-emerald-400">
                  <Server className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-cairo text-[#D4AF37] tracking-tight">
                ٩٩.٩%
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-body">
                جاهزية واستقرار السيرفرات السحابية
              </p>
            </div>
          </div>

          {/* Bottom Trust & Compliance Footer */}
          <div className="relative z-10 pt-6 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-mono text-zinc-300 font-bold">الإصدار Enterprise 4.2</span>
              <span className="text-zinc-600">•</span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>متوافق مع الفاتورة الإلكترونية المصرية</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>حماية بيانات الأعضاء</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            LEFT HALF IN RTL: Authentication & Interactive Form Area
            ========================================================================= */}
        <div className="flex-1 bg-white p-6 sm:p-10 lg:p-16 flex flex-col justify-between overflow-y-auto">
          
          {/* Top Logo & System Brand */}
          <div className="flex items-center justify-between pb-6 border-b border-zinc-100">
            {/* Security Indicator */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span dir="ltr" className="font-mono text-[11px] font-semibold">SSL TLS 1.3 / AES-256</span>
            </div>

            {/* GymVIP Brand Header */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">
                    مصر
                  </span>
                  <span className="text-xl font-black font-cairo tracking-wide text-zinc-950">
                    Gym<span className="text-[#D4AF37]">VIP</span>
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-medium text-right">
                  بوابة المصادقة وإدارة الوصول الموحدة للأندية
                </span>
              </div>

              <div className="w-10 h-10 rounded-xl bg-[#0B0B0B] border border-zinc-800 flex items-center justify-center shadow-xs shrink-0 text-[#D4AF37]">
                <Dumbbell className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Form Container */}
          <div className="max-w-md w-full mx-auto py-8 space-y-6">
            
            {/* Title Section */}
            <div className="space-y-1 text-right">
              <h2 className="text-2xl sm:text-3xl font-black font-cairo text-zinc-950 tracking-tight">
                تسجيل الدخول للمنظومة
              </h2>
              <p className="text-sm text-zinc-500 font-body">
                الرجاء إدخال بيانات الدخول المعتمدة لفرعك الرياضي.
              </p>
            </div>

            {/* Real Feedback Banners */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">فشل تسجيل الدخول</p>
                  <p className="text-red-600">{errorMessage}</p>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">تم التحقق بنجاح من بيانات الحساب!</p>
                  <p className="text-emerald-700">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email Input */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-zinc-900 block">
                  البريد الإلكتروني المعتمد <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errorMessage) setErrorMessage(null)
                    }}
                    placeholder="ahmed.ali@gymvip.eg"
                    className={cn(
                      'w-full h-11 pr-3.5 pl-10 text-sm bg-white border rounded-xl text-zinc-900 placeholder:text-zinc-400 transition-all font-body',
                      'focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-[#D4AF37]/20 shadow-xs',
                      errorMessage ? 'border-red-400 bg-red-50/10' : 'border-zinc-200'
                    )}
                    required
                  />
                  <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5 text-right">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-zinc-900">
                    كلمة المرور <span className="text-red-500">*</span>
                  </label>
                  <a href="#forgot" className="text-xs font-semibold text-[#D4AF37] hover:underline">
                    نسيت كلمة المرور؟
                  </a>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errorMessage) setErrorMessage(null)
                    }}
                    placeholder="••••••••••••"
                    className={cn(
                      'w-full h-11 pr-10 pl-10 text-sm bg-white border rounded-xl text-zinc-900 placeholder:text-zinc-400 transition-all font-body',
                      'focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-[#D4AF37]/20 shadow-xs',
                      errorMessage ? 'border-red-400 bg-red-50/10' : 'border-zinc-200'
                    )}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-zinc-400 hover:text-zinc-700 transition-colors"
                    title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-zinc-700 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-[#D4AF37] focus:ring-[#D4AF37] accent-[#D4AF37]"
                  />
                  <span>تذكر تسجيل الدخول على هذا المتصفح</span>
                </label>
                <span className="text-[11px] text-zinc-400 font-mono">30 يوماً</span>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !!successMessage}
                  className={cn(
                    'w-full h-12 rounded-xl text-white font-bold font-cairo text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] disabled:opacity-75 disabled:pointer-events-none',
                    'bg-[#0B0B0B] hover:bg-zinc-900 active:bg-black border border-zinc-800'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" />
                      <span>جاري تسجيل الدخول...</span>
                    </>
                  ) : successMessage ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>تم تسجيل الدخول بنجاح</span>
                    </>
                  ) : (
                    <>
                      <span>تسجيل الدخول للمنظومة</span>
                      <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-zinc-400 mt-2">
                  يتم التحقق من بصمة الجهاز والتشفير السحابي بأمان
                </p>
              </div>
            </form>

            {/* Fast Demo Role Selection Badges */}
            <div className="pt-4 border-t border-zinc-100 space-y-2.5 text-center">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                <span>تجربة الدخول السريع برتب الصلاحيات:</span>
                <span className="text-zinc-400 text-[10px]">اضغط للتعبئة</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoleSelect(r)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border text-center',
                      selectedRole === r.label
                        ? 'bg-[#0B0B0B] text-white border-zinc-900 shadow-xs'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200/80 hover:bg-zinc-100 hover:text-zinc-900'
                    )}
                  >
                    <span className="block truncate">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Create Account & Contact Link */}
            <div className="text-center text-xs text-zinc-500 pt-1">
              ليس لديك اشتراك لناديك الرياضي؟{' '}
              <Link to="/register" className="font-bold text-[#D4AF37] hover:underline">
                طلب تدشين فرع جديد
              </Link>
            </div>
          </div>

          {/* Page Bottom Footer */}
          <div className="pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>تشفير آمن 256-bit • خوادم جمهورية مصر العربية</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="#terms" className="hover:text-zinc-700 transition-colors">شروط الخدمة</a>
              <span>•</span>
              <a href="#privacy" className="hover:text-zinc-700 transition-colors">سياسة الخصوصية</a>
              <span>•</span>
              <a href="#support" className="hover:text-zinc-700 transition-colors">الدعم التقني المباشر</a>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default LoginPage
