import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  KeyRound,
  CheckCircle2,
  Camera,
  LogOut,
  Laptop,
  AlertTriangle,
  Check,
  Upload,
  Eye,
  EyeOff,
  Home,
  ChevronLeft,
  X,
  CircleAlert,
  Loader2,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'
import { authApi } from '@/features/auth/services/authApi'
import { usersApi } from '@/features/users/services/usersApi'
import {
  validateName,
  validateEgyptianPhone,
  validatePassword,
  extractBackendErrors,
} from '@/lib/validation'
import { FieldError } from '@/components/ui/FieldError'
import { cn } from '@/lib/utils'
import { getMediaUrl } from '@/lib/media'

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const { user, gym, logout, updateUserData } = useAuth()

  // Profile Form States
  const [fullName, setFullName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})

  // Password Form States
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

  // Modals & Photo Upload States
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const [avatarImage, setAvatarImage] = useState<string | null>(user?.avatarUrl || null)
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setFullName(user.name)
      setPhone(user.phone || '')
      setAvatarImage(user.avatarUrl || null)
    }
  }, [user])

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  // Password criteria checklist evaluations
  const isMinLength = newPassword.length >= 8
  const isMatching = newPassword !== '' && newPassword === confirmPassword

  const handleNameChange = (val: string) => {
    setFullName(val)
    setHasUnsavedChanges(true)
    if (!val.trim()) {
      setProfileErrors((prev) => ({ ...prev, name: 'الاسم بالكامل مطلوب' }))
    } else {
      const res = validateName(val, 'الاسم بالكامل', 2, 100)
      setProfileErrors((prev) => ({ ...prev, name: res.isValid ? '' : (res.error || '') }))
    }
  }

  const handlePhoneChange = (val: string) => {
    setPhone(val)
    setHasUnsavedChanges(true)
    if (!val.trim()) {
      setProfileErrors((prev) => ({ ...prev, phone: '' }))
      return
    }
    const res = validateEgyptianPhone(val, false, 'رقم الهاتف')
    setProfileErrors((prev) => ({ ...prev, phone: res.isValid ? '' : (res.error || '') }))
  }

  const handleNewPasswordChange = (val: string) => {
    setNewPassword(val)
    if (!val) {
      setPasswordErrors((prev) => ({ ...prev, newPassword: '' }))
      return
    }
    const res = validatePassword(val, true)
    setPasswordErrors((prev) => ({
      ...prev,
      newPassword: res.isValid ? '' : (res.error || ''),
      confirmPassword: confirmPassword && val !== confirmPassword ? 'كلمتا المرور غير متطابقتين' : ''
    }))
  }

  const handleConfirmPasswordChange = (val: string) => {
    setConfirmPassword(val)
    if (!val) {
      setPasswordErrors((prev) => ({ ...prev, confirmPassword: '' }))
      return
    }
    setPasswordErrors((prev) => ({
      ...prev,
      confirmPassword: newPassword !== val ? 'كلمتا المرور غير متطابقتين' : ''
    }))
  }

  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('يرجى اختيار ملف صورة صالح (JPG أو PNG أو WebP)'))
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت'))
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxDim = 400
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            resolve(canvas.toDataURL('image/jpeg', 0.85))
          } else {
            resolve(event.target?.result as string)
          }
        }
        img.onerror = () => reject(new Error('تعذر قراءة الصورة'))
        img.src = event.target?.result as string
      }
      reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'))
      reader.readAsDataURL(file)
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await processImageFile(file)
      setPendingAvatar(dataUrl)
    } catch (err: any) {
      triggerToast(err.message || 'فشل تحميل الصورة', 'error')
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleOpenPhotoModal = () => {
    setPendingAvatar(avatarImage)
    setPhotoModalOpen(true)
  }

  const handleSavePhoto = async () => {
    if (!user) return
    try {
      setIsUploadingPhoto(true)
      const res = await authApi.updateProfile({
        avatarUrl: pendingAvatar,
      })
      setAvatarImage(pendingAvatar)
      updateUserData({
        avatarUrl: res.user.avatarUrl || undefined,
      })
      setPhotoModalOpen(false)
      triggerToast(pendingAvatar ? 'تم تحديث الصورة الشخصية بنجاح!' : 'تمت إزالة الصورة الشخصية بنجاح!')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'تعذر حفظ الصورة الشخصية'
      triggerToast(msg, 'error')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const errs: Record<string, string> = {}
    const nameRes = validateName(fullName, 'الاسم بالكامل', 2, 100)
    if (!nameRes.isValid && nameRes.error) errs.name = nameRes.error

    let normalizedPhone: string | undefined = undefined
    if (phone.trim()) {
      const phoneRes = validateEgyptianPhone(phone, false, 'رقم الهاتف')
      if (!phoneRes.isValid && phoneRes.error) errs.phone = phoneRes.error
      else normalizedPhone = phoneRes.normalized
    }

    setProfileErrors(errs)
    if (Object.keys(errs).length > 0) {
      triggerToast(Object.values(errs)[0], 'error')
      return
    }

    try {
      setIsSavingProfile(true)
      const res = await authApi.updateProfile({
        name: fullName.trim(),
        phone: normalizedPhone || phone.trim() || undefined,
        avatarUrl: avatarImage || undefined,
      })
      updateUserData({
        name: res.user.name,
        phone: res.user.phone || undefined,
        avatarUrl: res.user.avatarUrl || undefined,
      })
      setHasUnsavedChanges(false)
      setProfileErrors({})
      triggerToast('تم حفظ التغييرات وتحديث بياناتك بنجاح!')
    } catch (err: any) {
      const { fieldErrors: backendErrors, generalMessage } = extractBackendErrors(err)
      if (Object.keys(backendErrors).length > 0) {
        setProfileErrors(backendErrors)
      }
      triggerToast(generalMessage || 'حدث خطأ أثناء حفظ البيانات', 'error')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const errs: Record<string, string> = {}
    const passRes = validatePassword(newPassword, true)
    if (!passRes.isValid && passRes.error) errs.newPassword = passRes.error

    if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'كلمتا المرور غير متطابقتين'
    }

    setPasswordErrors(errs)
    if (Object.keys(errs).length > 0) {
      triggerToast(Object.values(errs)[0], 'error')
      return
    }

    try {
      setIsSavingPassword(true)
      await usersApi.resetPassword(user.id, newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setPasswordErrors({})
      triggerToast('تم تحديث كلمة المرور بنجاح! يرجى استخدام كلمة المرور الجديدة في المرة القادمة.')
    } catch (err: any) {
      const { generalMessage } = extractBackendErrors(err)
      triggerToast(generalMessage || 'فشل تحديث كلمة المرور', 'error')
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleConfirmLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch {
      navigate('/login')
    }
  }

  const getRoleArabicName = (role?: string) => {
    switch (role) {
      case 'OWNER':
        return 'صاحب الجيم (المالك التنفيذي)'
      case 'MANAGER':
        return 'مدير الفرع'
      case 'RECEPTIONIST':
        return 'موظف استقبال'
      case 'TRAINER':
        return 'مدرب معتمد'
      default:
        return 'عضو فريق العمل'
    }
  }

  const avatarInitials = (user?.name || 'م').slice(0, 2)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-cairo" dir="rtl">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-zinc-900 text-white shadow-2xl border border-gym-gold/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              toastType === 'success'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {toastType === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
          </div>
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-zinc-400 hover:text-white mr-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="bg-amber-50 border border-amber-300/80 rounded-xl p-3.5 flex items-center justify-between gap-4 text-amber-900 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CircleAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-sm font-semibold">
              لديك تعديلات غير محفوظة في بيانات الملف الشخصي. يرجى الضغط على حفظ التغييرات لتثبيتها.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFullName(user?.name || '')
                setPhone(user?.phone || '')
                setHasUnsavedChanges(false)
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-100 font-semibold"
            >
              تراجع
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="text-xs px-3.5 py-1.5 rounded-lg bg-[#B8941F] text-white hover:bg-[#9E7D17] font-bold shadow-xs flex items-center gap-1.5"
            >
              {isSavingProfile && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>حفظ الآن</span>
            </button>
          </div>
        </div>
      )}

      {/* Breadcrumb & Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1 font-medium">
            <span
              onClick={() => navigate('/app/dashboard')}
              className="hover:text-zinc-800 cursor-pointer flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5" />
              لوحة التحكم
            </span>
            <ChevronLeft className="w-3 h-3 text-zinc-400" />
            <span className="text-zinc-900 font-bold">الملف الشخصي</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            الملف الشخصي
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            إدارة بيانات حسابك وإعدادات الدخول والأمان في نظام GymVIP
          </p>
        </div>

        {/* Role Tag */}
        <div className="self-start sm:self-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FBF6E9] border border-[#ECD9A2] text-[#8C6D1F] text-xs font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#B8941F]"></span>
            <span>{getRoleArabicName(user?.role)}</span>
          </div>
        </div>
      </div>

      {/* Hero Profile Header Card with Golden Accent Top Border */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm overflow-hidden relative">
        <div className="h-1.5 w-full bg-[#8A6D1C]"></div>

        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            {/* Avatar Box */}
            <div className="relative shrink-0">
              <div
                onClick={handleOpenPhotoModal}
                title="تغيير الصورة الشخصية"
                className="w-20 h-20 bg-zinc-950 rounded-2xl flex items-center justify-center text-white text-2xl font-bold font-cairo shadow-md border border-zinc-800 select-none overflow-hidden cursor-pointer group hover:ring-2 hover:ring-[#D4AF37]/50 transition-all"
              >
                {avatarImage ? (
                  <img
                    src={getMediaUrl(avatarImage)}
                    alt={fullName}
                    className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <span>{avatarInitials}</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleOpenPhotoModal}
                title="تغيير الصورة"
                className="absolute -bottom-1.5 -left-1.5 w-6 h-6 bg-zinc-900 border border-[#D4AF37]/60 rounded-full flex items-center justify-center text-[#E5C158] hover:bg-[#8A6D1C] hover:text-white transition-colors shadow-sm cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900">{fullName}</h2>
                <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#3B2C05] text-[#F3D372] border border-[#D4AF37]/30 text-xs font-bold shadow-2xs">
                  <KeyRound className="w-3 h-3 text-[#E5C158]" />
                  <span>{getRoleArabicName(user?.role)}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold border border-zinc-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>نشط</span>
                </div>
              </div>

              {/* Email with Verified Badge */}
              <div className="flex items-center gap-1.5 text-zinc-500 text-xs sm:text-sm">
                <span className="font-mono text-zinc-600">{user?.email || '—'}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>

              {/* Meta details row */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-500">
                <span className="bg-zinc-100 px-2.5 py-0.5 rounded-md font-mono text-zinc-700 border border-zinc-200/60">
                  كود المستخدم: USR-{user?.id ? user.id.slice(0, 6) : '001'}
                </span>
                <span className="text-zinc-400">•</span>
                <span>النادي: {gym?.name || 'GymVIP'}</span>
              </div>
            </div>
          </div>

          {/* Change Photo Button */}
          <div className="self-end md:self-center shrink-0">
            <button
              type="button"
              onClick={handleOpenPhotoModal}
              className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs sm:text-sm font-bold border border-zinc-200/80 transition-all flex items-center gap-2 shadow-2xs"
            >
              <Camera className="w-4 h-4 text-zinc-600" />
              <span>تغيير الصورة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Right Side / Main Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: البيانات الشخصية */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-700" />
                  <h3 className="text-lg font-extrabold text-zinc-900">البيانات الشخصية</h3>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  بياناتك المسجلة في النظام والتي تظهر لفريق العمل والمديرين.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200/60">
                البيانات الأساسية
              </span>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                    <span>الاسم الكامل</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className={cn(
                        'w-full pl-10 pr-3.5 py-2.5 rounded-xl border bg-white text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all',
                        profileErrors.name ? 'border-rose-400 bg-rose-50/50' : 'border-zinc-200'
                      )}
                      placeholder="أدخل الاسم الكامل"
                    />
                    <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <FieldError error={profileErrors.name} />
                </div>

                {/* Email (Readonly) */}
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                    <span>البريد الإلكتروني</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-700 cursor-not-allowed select-none"
                    />
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Phone */}
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-zinc-800">رقم الهاتف</label>
                  <div className="relative flex items-center">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className={cn(
                        'w-full pl-16 pr-10 py-2.5 rounded-xl border bg-white text-sm font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all text-left',
                        profileErrors.phone ? 'border-rose-400 bg-rose-50/50' : 'border-zinc-200'
                      )}
                      dir="ltr"
                    />
                    <Phone className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                      +20
                    </span>
                  </div>
                  <FieldError error={profileErrors.phone} />
                </div>

                {/* Role & Permissions (Locked) */}
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>الدور الوظيفي والصلاحيات</span>
                  </label>
                  <div className="bg-zinc-50/80 border border-zinc-200 rounded-xl p-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
                        <span className="w-2 h-2 rounded-full bg-[#B8941F]"></span>
                        <span>{getRoleArabicName(user?.role)}</span>
                      </div>
                      <span className="bg-zinc-200/80 text-zinc-800 text-[11px] font-bold px-2 py-0.5 rounded">
                        {user?.role === 'OWNER' ? 'صلاحية كاملة' : 'صلاحيات مخصصة'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-tight">
                      يتم تعيين الصلاحيات من قبل إدارة النادي ولا يمكن تعديلها ذاتياً.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 bg-[#60490E] hover:bg-[#523e0c] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#F3D372]" />
                  ) : (
                    <Check className="w-4 h-4 text-[#F3D372]" />
                  )}
                  <span>{isSavingProfile ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFullName(user?.name || '')
                    setPhone(user?.phone || '')
                    setHasUnsavedChanges(false)
                  }}
                  className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs sm:text-sm font-semibold transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: تغيير كلمة المرور */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-zinc-800" />
                  <h3 className="text-lg font-extrabold text-zinc-900">تغيير كلمة المرور</h3>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  قم بتحديث كلمة المرور للحفاظ على أمان حسابك وجلسات العمل.
                </p>
              </div>
              <Shield className="w-5 h-5 text-zinc-400" />
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* New Password */}
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                    <span>كلمة المرور الجديدة</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => handleNewPasswordChange(e.target.value)}
                      className={cn(
                        'w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-white text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 font-mono',
                        passwordErrors.newPassword ? 'border-rose-400 bg-rose-50/50' : 'border-zinc-200'
                      )}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <FieldError error={passwordErrors.newPassword} />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                    <span>تأكيد كلمة المرور الجديدة</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                      className={cn(
                        'w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-white text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 font-mono',
                        passwordErrors.confirmPassword ? 'border-rose-400 bg-rose-50/50' : 'border-zinc-200'
                      )}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <FieldError error={passwordErrors.confirmPassword} />
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="bg-zinc-50/80 border border-zinc-200/80 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-zinc-700">متطلبات الأمان لكلمة المرور:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                        isMinLength
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-zinc-300 bg-white'
                      }`}
                    >
                      {isMinLength && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span className={isMinLength ? 'text-zinc-800 font-medium' : 'text-zinc-500'}>
                      8 أحرف وأرقام على الأقل
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                        isMatching
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-zinc-300 bg-white'
                      }`}
                    >
                      {isMatching && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span className={isMatching ? 'text-zinc-800 font-medium' : 'text-zinc-500'}>
                      تطابق كلمتي المرور
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!isMinLength || !isMatching || isSavingPassword}
                  className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {isSavingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gym-gold" />
                  ) : (
                    <KeyRound className="w-4 h-4 text-gym-gold" />
                  )}
                  <span>{isSavingPassword ? 'جاري التحديث...' : 'تحديث كلمة المرور'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Left Side / Danger & Security Cards (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: الجلسة الحالية */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-zinc-700" />
                <h3 className="text-sm font-extrabold text-zinc-900">الجلسة الحالية</h3>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>مباشر الآن</span>
              </div>
            </div>

            <div className="bg-zinc-50/90 border border-zinc-200/80 rounded-xl p-3.5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center relative">
                    <Laptop className="w-5 h-5 text-zinc-200" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">المتصفح الحالي</h4>
                    <p className="text-[11px] text-zinc-500 font-mono">جلسة نشطة وآمنة</p>
                  </div>
                </div>
                <span className="bg-[#6B5515] text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                  نشط
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
              جلسة العمل الحالية محمية عبر ملفات تعريف الارتباط الآمنة (HTTPOnly Cookies).
            </p>
          </div>

          {/* Card 2: المنطقة الخطرة */}
          <div className="bg-white rounded-2xl border border-rose-200/90 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-extrabold text-rose-600">تسجيل الخروج</h3>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-zinc-500 leading-relaxed">
                سيتم إنهاء جلستك الحالية في نظام GymVIP والعودة لصفحة تسجيل الدخول.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setLogoutModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>تسجيل الخروج من الحساب</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Change Profile Photo Modal */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#B8941F]" />
                <h3 className="text-base font-bold text-zinc-900">تغيير الصورة الشخصية</h3>
              </div>
              <button
                onClick={() => setPhotoModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 py-2">
              <div className="w-24 h-24 bg-zinc-950 rounded-2xl flex items-center justify-center text-white text-3xl font-bold font-cairo shadow-lg border-2 border-gym-gold relative overflow-hidden">
                {pendingAvatar ? (
                  <img src={getMediaUrl(pendingAvatar)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{avatarInitials}</span>
                )}
              </div>

              {pendingAvatar && (
                <button
                  type="button"
                  onClick={() => setPendingAvatar(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>إزالة الصورة</span>
                </button>
              )}

              <p className="text-xs text-zinc-500 text-center">
                الصورة تظهر في شريط التنقل والتقارير وسجل الحركات الإدارية.
              </p>
            </div>

            <label className="border-2 border-dashed border-zinc-300 hover:border-gym-gold rounded-xl p-5 text-center cursor-pointer transition-colors bg-zinc-50/50 hover:bg-amber-50/30 block">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-zinc-800">اسحب وأفلت الصورة هنا أو اضغط للتصفح</p>
              <p className="text-[11px] text-zinc-400 mt-1">يدعم صيغ JPG و PNG حتى 5 ميجابايت (يتم تحسينها وضغطها تلقائياً)</p>
            </label>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                disabled={isUploadingPhoto}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={isUploadingPhoto}
                className="px-5 py-2 rounded-xl bg-[#60490E] hover:bg-[#523e0c] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isUploadingPhoto ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#F3D372]" />
                ) : (
                  <Check className="w-4 h-4 text-[#F3D372]" />
                )}
                <span>{isUploadingPhoto ? 'جاري الحفظ...' : 'حفظ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Logout Confirmation Modal */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-zinc-900">
                هل أنت متأكد من تسجيل الخروج؟
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                سيتم إنهاء الجلسة الحالية وإعادتك إلى شاشة تسجيل الدخول لنظام GymVIP.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200"
              >
                البقاء في النظام
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>تأكيد الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage
