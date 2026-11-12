import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserPlus,
  Mail,
  Lock,
  Phone,
  User,
  Award,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { useToast } from '@/components/feedback/Toast'
import { trainersApi } from '../services/trainersApi'

export const TrainerCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const toast = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [bio, setBio] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setErrorMessage('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    try {
      setIsSubmitting(true)
      const newTrainer = await trainersApi.create({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
        specialization: specialization.trim() || null,
        bio: bio.trim() || null,
      })

      toast.success(`تم إضافة المدرب ${newTrainer.user.name} بنجاح!`)
      navigate(`/app/trainers/${newTrainer.id}`)
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'فشل في إضافة المدرب. يرجى التحقق من البيانات المدخلة.'
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16 font-cairo">
      {/* Header & Breadcrumbs */}
      <div className="flex items-center justify-between gap-4">
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
              onClick={() => navigate('/app/trainers')}
              className="hover:text-zinc-700 cursor-pointer"
            >
              المدربين
            </span>
            <span>&gt;</span>
            <span className="text-zinc-900 font-bold">إضافة مدرب</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-gym-gold flex items-center justify-center font-bold shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-950">إضافة مدرب جديد</h1>
              <p className="text-xs text-zinc-500 mt-0.5 font-medium">
                إنشاء حساب مستخدم جديد بدور مدرب وملف تعريفي رياضي
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/app/trainers')}
          className="px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 transition-colors flex items-center gap-1.5"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">تعذر حفظ بيانات المدرب</p>
            <p className="mt-0.5 text-rose-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. User Account Section */}
        <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <User className="w-4 h-4 text-gym-gold-dark" />
            <h3 className="text-sm font-black text-zinc-950">بيانات المستخدم وحساب الدخول</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Name */}
            <div>
              <label className="block font-bold text-zinc-700 mb-1.5">
                الاسم بالكامل <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: كابتن أحمد محمود"
                  className="w-full pr-9 pl-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 transition-all"
                />
                <User className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block font-bold text-zinc-700 mb-1.5">
                البريد الإلكتروني <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trainer@gymvip.com"
                  className="w-full pr-9 pl-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 transition-all text-left dir-ltr"
                />
                <Mail className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block font-bold text-zinc-700 mb-1.5">
                رقم الهاتف (مصر) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full pr-9 pl-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 transition-all text-right dir-ltr"
                />
                <Phone className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block font-bold text-zinc-700 mb-1.5">
                كلمة المرور <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-9 pl-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 transition-all text-left dir-ltr"
                />
                <Lock className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">8 أحرف على الأقل تشمل أرقاماً وحروفاً</p>
            </div>
          </div>
        </div>

        {/* 2. Trainer Profile Section */}
        <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <Award className="w-4 h-4 text-gym-gold-dark" />
            <h3 className="text-sm font-black text-zinc-950">بيانات التخصص الرياضي والنبذة</h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Specialization */}
            <div>
              <label className="block font-bold text-zinc-700 mb-1.5">
                التخصص الرياضي
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="مثال: كمال أجسام وتأهيل بدني، كروس فيت، لياقة بدنية"
                  className="w-full pr-9 pl-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 transition-all"
                />
                <Award className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block font-bold text-zinc-700 mb-1.5">
                نبذة عن المدرب
              </label>
              <div className="relative">
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="اكتب نبذة مختصرة عن خبرات وشهادات وإنجازات المدرب التدريبية..."
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-medium text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 transition-all resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/app/trainers')}
            className="px-5 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4 text-gym-gold" />
            <span>{isSubmitting ? 'جاري إضافة المدرب...' : 'إضافة المدرب'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default TrainerCreatePage
