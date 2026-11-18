import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  UserCheck,
} from 'lucide-react'
import { useInstallation } from '../hooks/useInstallation'
import { useAuth } from '../../auth/context/AuthContext'

export const InitialAccountSetupPage: React.FC = () => {
  const navigate = useNavigate()
  const { installation, setupAccount, isSettingUp } = useInstallation()
  const { user } = useAuth()

  const currentEmail = user?.email || installation?.initialAdminEmail || 'capt.ahmed@gymvip.eg'

  const [newEmail, setNewEmail] = useState('')
  const [confirmNewEmail, setConfirmNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!newEmail || !confirmNewEmail || !newPassword || !confirmNewPassword) {
      setError('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    if (newEmail.trim().toLowerCase() !== confirmNewEmail.trim().toLowerCase()) {
      setError('البريد الإلكتروني الجديد وتأكيده غير متطابقين')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError('كلمة المرور الجديدة وتأكيدها غير متطابقين')
      return
    }

    if (newPassword.length < 8) {
      setError('يجب ألا تقل كلمة المرور عن 8 خانات')
      return
    }

    try {
      await setupAccount({
        currentEmail,
        newEmail: newEmail.trim(),
        confirmNewEmail: confirmNewEmail.trim(),
        newPassword,
        confirmNewPassword,
      })
      navigate('/activation')
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'حدث خطأ أثناء حفظ البيانات')
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full bg-[#000000] text-white flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-cairo selection:bg-[#D4AF37] selection:text-black relative overflow-hidden"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-24 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-xl bg-[#0B0B0B] border border-zinc-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-xl relative z-10">
        
        {/* Header & Step Indicator */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-4">
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            المرحلة 1 من 2: إعداد الحساب الأولي
          </div>

          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <UserCheck className="w-8 h-8" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            إعداد وتأمين حساب المدير الرئيسي
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-2 max-w-md mx-auto leading-relaxed">
            لأمان النظام، يرجى استبدال بيانات الدخول الافتراضية ببريدك الإلكتروني الشخصي وكلمة مرور قوية خاصة بك.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Email (Read-only) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              البريد الإلكتروني الافتراضي الحالي (للمطابقة):
            </label>
            <div className="relative">
              <input
                type="text"
                disabled
                value={currentEmail}
                className="w-full text-xs sm:text-sm px-4 py-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 text-zinc-500 font-mono cursor-not-allowed pr-10"
              />
              <Mail className="w-4 h-4 text-zinc-600 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New Email */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                البريد الإلكتروني الجديد: <span className="text-amber-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="admin@yourgym.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full text-xs sm:text-sm px-4 py-3 rounded-2xl border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all pr-10"
                />
                <Mail className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {/* Confirm New Email */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                تأكيد البريد الإلكتروني: <span className="text-amber-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="admin@yourgym.com"
                  value={confirmNewEmail}
                  onChange={(e) => setConfirmNewEmail(e.target.value)}
                  className="w-full text-xs sm:text-sm px-4 py-3 rounded-2xl border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all pr-10"
                />
                <CheckCircle2 className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                كلمة المرور الجديدة: <span className="text-amber-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs sm:text-sm px-4 py-3 rounded-2xl border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all pr-10 pl-10"
                />
                <Lock className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-3.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">8 أحرف أو أرقام كحد أدنى</span>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                تأكيد كلمة المرور الجديدة: <span className="text-amber-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full text-xs sm:text-sm px-4 py-3 rounded-2xl border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all pr-10"
                />
                <KeyRound className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSettingUp}
            className={`w-full mt-4 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-extrabold transition-all duration-200 ${
              isSettingUp
                ? 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-[#D4AF37] hover:bg-[#C29F2F] text-black shadow-xl shadow-[#D4AF37]/25 cursor-pointer active:scale-[0.99]'
            }`}
          >
            {isSettingUp ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                جاري التشفير وحفظ البيانات...
              </>
            ) : (
              <>
                <span>حفظ البيانات ومتابعة تفعيل الترخيص</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
          <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            تُشفر كلمات المرور باستخدام خوارزمية Bcrypt المعتمدة عالمياً ولا يمكن استرجاعها كنص مكشوف.
          </p>
        </div>
      </div>
    </div>
  )
}

export default InitialAccountSetupPage
