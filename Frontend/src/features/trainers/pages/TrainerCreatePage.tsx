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
import {
  validateName,
  validateEmail,
  validateEgyptianPhone,
  validatePassword,
  extractBackendErrors,
} from '@/lib/validation'
import { showTrainerCreatedAlert } from '@/lib/sweetAlert'
import { FieldError } from '@/components/ui/FieldError'
import { cn } from '@/lib/utils'

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleNameChange = (val: string) => {
    setName(val)
    if (!val.trim()) {
      setFieldErrors((prev) => ({ ...prev, name: 'اسم المدرب مطلوب' }))
    } else {
      const res = validateName(val, 'اسم المدرب', 2, 100)
      setFieldErrors((prev) => ({ ...prev, name: res.isValid ? '' : (res.error || '') }))
    }
  }

  const handleEmailChange = (val: string) => {
    setEmail(val)
    if (!val.trim()) {
      setFieldErrors((prev) => ({ ...prev, email: 'البريد الإلكتروني مطلوب' }))
    } else {
      const res = validateEmail(val, true)
      setFieldErrors((prev) => ({ ...prev, email: res.isValid ? '' : (res.error || '') }))
    }
  }

  const handlePhoneChange = (val: string) => {
    setPhone(val)
    if (!val.trim()) {
      setFieldErrors((prev) => ({ ...prev, phone: 'رقم الهاتف المصري مطلوب' }))
    } else {
      const res = validateEgyptianPhone(val, true, 'رقم الهاتف')
      setFieldErrors((prev) => ({ ...prev, phone: res.isValid ? '' : (res.error || '') }))
    }
  }

  const handlePasswordChange = (val: string) => {
    setPassword(val)
    if (!val) {
      setFieldErrors((prev) => ({ ...prev, password: 'كلمة المرور مطلوبة' }))
    } else {
      const res = validatePassword(val, true)
      setFieldErrors((prev) => ({ ...prev, password: res.isValid ? '' : (res.error || '') }))
    }
  }

  const handleSpecializationChange = (val: string) => {
    setSpecialization(val)
    if (val.trim().length > 150) {
      setFieldErrors((prev) => ({ ...prev, specialization: 'التخصص طويل جداً (الحد الأقصى 150 حرف)' }))
    } else {
      setFieldErrors((prev) => ({ ...prev, specialization: '' }))
    }
  }

  const handleBioChange = (val: string) => {
    setBio(val)
    if (val.trim().length > 1000) {
      setFieldErrors((prev) => ({ ...prev, bio: 'النبذة التعريفية طويلة جداً (الحد الأقصى 1000 حرف)' }))
    } else {
      setFieldErrors((prev) => ({ ...prev, bio: '' }))
    }
  }

  const validateForm = () => {
    const errs: Record<string, string> = {}

    const nameRes = validateName(name, 'اسم المدرب', 2, 100)
    if (!nameRes.isValid && nameRes.error) errs.name = nameRes.error

    const emailRes = validateEmail(email, true)
    if (!emailRes.isValid && emailRes.error) errs.email = emailRes.error

    const phoneRes = validateEgyptianPhone(phone, true, 'رقم الهاتف')
    if (!phoneRes.isValid && phoneRes.error) errs.phone = phoneRes.error

    const passRes = validatePassword(password, true)
    if (!passRes.isValid && passRes.error) errs.password = passRes.error

    if (specialization.trim().length > 150) {
      errs.specialization = 'التخصص طويل جداً (الحد الأقصى 150 حرف)'
    }

    if (bio.trim().length > 1000) {
      errs.bio = 'النبذة التعريفية طويلة جداً (الحد الأقصى 1000 حرف)'
    }

    setFieldErrors(errs)
    return {
      isValid: Object.keys(errs).length === 0,
      errors: errs,
      normalizedPhone: phoneRes.normalized,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const { isValid, errors: validationErrors, normalizedPhone } = validateForm()
    if (!isValid) {
      const firstError = Object.values(validationErrors)[0]
      setErrorMessage(firstError || 'يرجى مراجعة وتصحيح الحقول المحددة')
      toast.error(firstError || 'يرجى مراجعة وتصحيح الحقول المحددة')
      return
    }

    try {
      setIsSubmitting(true)
      const newTrainer = await trainersApi.create({
        name: name.trim(),
        email: email.trim(),
        phone: normalizedPhone || phone.trim(),
        password: password.trim(),
        specialization: specialization.trim() || null,
        bio: bio.trim() || null,
      })

      // Show SweetAlert!
      const userChoice = await showTrainerCreatedAlert({
        name: newTrainer.user.name,
        email: newTrainer.user.email,
        phone: newTrainer.user.phone || normalizedPhone || phone.trim(),
        specialization: newTrainer.specialization,
      })

      if (userChoice === 'view') {
        navigate(`/app/trainers/${newTrainer.id}`)
      } else {
        // Reset form
        setName('')
        setEmail('')
        setPhone('')
        setPassword('')
        setSpecialization('')
        setBio('')
        setFieldErrors({})
        setErrorMessage(null)
      }
    } catch (err: any) {
      const { fieldErrors: backendErrors, generalMessage } = extractBackendErrors(err)
      if (Object.keys(backendErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...backendErrors }))
      }
      setErrorMessage(generalMessage)
      toast.error(generalMessage)
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
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-bold shadow-xs">
              <UserPlus className="w-5 h-5 text-white" />
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
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 px-3 py-2 rounded-xl transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للمدربين</span>
        </button>
      </div>

      {/* Global Form Error Message */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs animate-in fade-in">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">تعذر حفظ بيانات المدرب</p>
            <p className="mt-0.5 text-rose-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
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
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="مثال: كابتن أحمد محمود"
                  className={cn(
                    'w-full pr-9 pl-3 py-2.5 bg-zinc-50 border rounded-xl font-bold text-zinc-900 focus:bg-white focus:outline-none transition-all',
                    fieldErrors.name
                      ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500'
                      : 'border-zinc-200 focus:border-zinc-900'
                  )}
                />
                <User className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <FieldError error={fieldErrors.name} />
            </div>

            {/* Email */}
            <div>
              <label className="block font-bold text-zinc-700 mb-1.5">
                البريد الإلكتروني <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="trainer@gymvip.com"
                  className={cn(
                    'w-full pr-9 pl-3 py-2.5 bg-zinc-50 border rounded-xl font-mono font-bold text-zinc-900 focus:bg-white focus:outline-none transition-all text-left dir-ltr',
                    fieldErrors.email
                      ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500'
                      : 'border-zinc-200 focus:border-zinc-900'
                  )}
                />
                <Mail className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <FieldError error={fieldErrors.email} />
            </div>

            {/* Phone */}
            <div>
              <label className="block font-bold text-zinc-700 mb-1.5">
                رقم الهاتف (مصر) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="01012345678"
                  className={cn(
                    'w-full pr-9 pl-3 py-2.5 bg-zinc-50 border rounded-xl font-mono font-bold text-zinc-900 focus:bg-white focus:outline-none transition-all text-right dir-ltr',
                    fieldErrors.phone
                      ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500'
                      : 'border-zinc-200 focus:border-zinc-900'
                  )}
                />
                <Phone className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <FieldError error={fieldErrors.phone} />
            </div>

            {/* Password */}
            <div>
              <label className="block font-bold text-zinc-700 mb-1.5">
                كلمة المرور <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="••••••••"
                  className={cn(
                    'w-full pr-9 pl-3 py-2.5 bg-zinc-50 border rounded-xl font-mono font-bold text-zinc-900 focus:bg-white focus:outline-none transition-all text-left dir-ltr',
                    fieldErrors.password
                      ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500'
                      : 'border-zinc-200 focus:border-zinc-900'
                  )}
                />
                <Lock className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <FieldError error={fieldErrors.password} />
              {!fieldErrors.password && (
                <p className="text-[10px] text-zinc-400 mt-1">8 أحرف على الأقل تشمل أرقاماً وحروفاً</p>
              )}
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
                  onChange={(e) => handleSpecializationChange(e.target.value)}
                  placeholder="مثال: كمال أجسام وتأهيل بدني، كروس فيت، لياقة بدنية"
                  className={cn(
                    'w-full pr-9 pl-3 py-2.5 bg-zinc-50 border rounded-xl font-bold text-zinc-900 focus:bg-white focus:outline-none transition-all',
                    fieldErrors.specialization
                      ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500'
                      : 'border-zinc-200 focus:border-zinc-900'
                  )}
                />
                <Award className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <FieldError error={fieldErrors.specialization} />
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
                  onChange={(e) => handleBioChange(e.target.value)}
                  placeholder="اكتب نبذة مختصرة عن خبرات وشهادات وإنجازات المدرب التدريبية..."
                  className={cn(
                    'w-full p-3 bg-zinc-50 border rounded-xl font-medium text-zinc-900 focus:bg-white focus:outline-none transition-all resize-none',
                    fieldErrors.bio
                      ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500'
                      : 'border-zinc-200 focus:border-zinc-900'
                  )}
                />
              </div>
              <FieldError error={fieldErrors.bio} />
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
            className="px-6 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
