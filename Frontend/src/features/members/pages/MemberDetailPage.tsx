import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  User,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit,
  MoreVertical,
  PauseCircle,
  QrCode,
  Receipt,
  Award,
  ShieldCheck,
  Check,
  X,
  Printer,
  Camera,
  Upload,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/feedback/Toast'
import { membersApi } from '../services/membersApi'
import type { MemberItem } from '../types/member.types'
import { subscriptionsApi } from '@/features/subscriptions/services/subscriptionsApi'
import type { SubscriptionItem } from '@/features/subscriptions/types/subscription.types'
import { paymentsApi } from '@/features/payments/services/paymentsApi'
import type { PaymentItem } from '@/features/payments/types/payment.types'
import { attendanceApi } from '@/features/attendance/services/attendanceApi'
import type { AttendanceItem } from '@/features/attendance/types/attendance.types'
import { getMediaUrl } from '@/lib/media'
import {
  validateName,
  validateEgyptianPhone,
  validateEmail,
  validateDateOfBirth,
  extractBackendErrors,
} from '@/lib/validation'
import { FieldError } from '@/components/ui/FieldError'
import { useRealtimeSync } from '@/services/socket'

export const MemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  // Active Tab State (1 to 4)
  const [activeTab, setActiveTab] = useState<'info' | 'subscriptions' | 'attendance' | 'payments'>('info')

  // Modals state
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false)
  const [freezeDays, setFreezeDays] = useState(7)
  const [isFreezing, setIsFreezing] = useState(false)
  const [isManualCheckInModalOpen, setIsManualCheckInModalOpen] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

  // Real Member Data State
  const [memberData, setMemberData] = useState<MemberItem | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editGender, setEditGender] = useState<'MALE' | 'FEMALE' | ''>('')
  const [editBirthDate, setEditBirthDate] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editEmergencyName, setEditEmergencyName] = useState('')
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false)
  const editFileInputRef = React.useRef<HTMLInputElement | null>(null)
  const quickFileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [memberSubscriptions, setMemberSubscriptions] = useState<SubscriptionItem[]>([])
  const [memberPayments, setMemberPayments] = useState<PaymentItem[]>([])
  const [memberAttendance, setMemberAttendance] = useState<AttendanceItem[]>([])

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
        img.onerror = () => reject(new Error('فشل في معالجة الصورة'))
        img.src = event.target?.result as string
      }
      reader.onerror = () => reject(new Error('فشل في قراءة الملف'))
      reader.readAsDataURL(file)
    })
  }

  const handleEditImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await processImageFile(file)
      setEditAvatarUrl(dataUrl)
      toast.success('تم اختيار الصورة بنجاح')
    } catch (err: any) {
      toast.error(err.message || 'فشل اختيار الصورة')
    }
  }

  const handleQuickAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setIsUpdatingAvatar(true)
      const dataUrl = await processImageFile(file)
      const targetId = memberData?.id || id || ''
      const updated = await membersApi.update(targetId, {
        avatarUrl: dataUrl,
      })
      setMemberData(updated)
      setEditAvatarUrl(dataUrl)
      toast.success('تم تحديث صورة العضو بنجاح!')
    } catch (err: any) {
      const detailedErrors = Array.isArray(err.response?.data?.errors)
        ? err.response.data.errors.map((e: any) => e.message || `${e.field}: خطأ غير صالح`).join(' • ')
        : null
      toast.error(detailedErrors || err.response?.data?.message || err.message || 'فشل تحديث صورة العضو')
    } finally {
      setIsUpdatingAvatar(false)
      if (quickFileInputRef.current) {
        quickFileInputRef.current.value = ''
      }
    }
  }

  const loadMember = React.useCallback(async () => {
    if (!id) return
    try {
      setIsLoading(true)
      setHasError(false)
      const [data, subs, payments, att] = await Promise.all([
        membersApi.getById(id),
        subscriptionsApi.getMemberSubscriptions(id).catch(() => []),
        paymentsApi.getMemberPayments(id).catch(() => []),
        attendanceApi.getMemberHistory(id).catch(() => []),
      ])
      setMemberData(data)
      setMemberSubscriptions(subs)
      setMemberPayments(payments)
      setMemberAttendance(att)
      setEditName(data.name)
      setEditPhone(data.phone)
      setEditEmail(data.email || '')
      setEditGender(data.gender || '')
      setEditBirthDate(data.dateOfBirth || '')
      setEditAddress(data.address || '')
      setEditEmergencyName(data.emergencyContactName || '')
      setEditEmergencyPhone(data.emergencyContactPhone || '')
      setEditNotes(data.notes || '')
      setEditAvatarUrl(data.avatarUrl || null)
    } catch {
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  React.useEffect(() => {
    loadMember()
  }, [loadMember])

  // Instant Real-Time WebSocket updates for Member Profile
  useRealtimeSync(undefined, () => {
    loadMember()
  })

  const handleOpenEdit = () => {
    setEditErrors({})
    if (memberData) {
      setEditName(memberData.name)
      setEditPhone(memberData.phone)
      setEditEmail(memberData.email || '')
      setEditGender(memberData.gender || '')
      setEditBirthDate(memberData.dateOfBirth || '')
      setEditAddress(memberData.address || '')
      setEditEmergencyName(memberData.emergencyContactName || '')
      setEditEmergencyPhone(memberData.emergencyContactPhone || '')
      setEditNotes(memberData.notes || '')
      setEditAvatarUrl(memberData.avatarUrl || null)
    }
    setIsEditModalOpen(true)
  }

  const handleEditNameChange = (val: string) => {
    setEditName(val)
    if (!val.trim()) {
      setEditErrors((prev) => ({ ...prev, name: 'اسم العضو مطلوب' }))
    } else {
      const res = validateName(val, 'اسم العضو', 2, 100)
      setEditErrors((prev) => ({ ...prev, name: res.isValid ? '' : (res.error || '') }))
    }
  }

  const handleEditPhoneChange = (val: string) => {
    setEditPhone(val)
    if (!val.trim()) {
      setEditErrors((prev) => ({ ...prev, phone: 'رقم الهاتف المصري مطلوب' }))
    } else {
      const res = validateEgyptianPhone(val, true, 'رقم الهاتف')
      setEditErrors((prev) => ({ ...prev, phone: res.isValid ? '' : (res.error || '') }))
    }
  }

  const handleEditEmailChange = (val: string) => {
    setEditEmail(val)
    if (!val.trim()) {
      setEditErrors((prev) => ({ ...prev, email: '' }))
    } else {
      const res = validateEmail(val, false)
      setEditErrors((prev) => ({ ...prev, email: res.isValid ? '' : (res.error || '') }))
    }
  }

  const handleEditBirthDateChange = (val: string) => {
    setEditBirthDate(val)
    if (!val) {
      setEditErrors((prev) => ({ ...prev, birthDate: '' }))
    } else {
      const res = validateDateOfBirth(val, false)
      setEditErrors((prev) => ({ ...prev, birthDate: res.isValid ? '' : (res.error || '') }))
    }
  }

  const handleEditEmergencyPhoneChange = (val: string) => {
    setEditEmergencyPhone(val)
    if (!val.trim()) {
      setEditErrors((prev) => ({ ...prev, emergencyContactPhone: '' }))
    } else {
      const res = validateEgyptianPhone(val, false, 'رقم هاتف الطوارئ')
      setEditErrors((prev) => ({ ...prev, emergencyContactPhone: res.isValid ? '' : (res.error || '') }))
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}

    const nameRes = validateName(editName, 'اسم العضو', 2, 100)
    if (!nameRes.isValid && nameRes.error) errs.name = nameRes.error

    const phoneRes = validateEgyptianPhone(editPhone, true, 'رقم الهاتف')
    if (!phoneRes.isValid && phoneRes.error) errs.phone = phoneRes.error

    const emailRes = validateEmail(editEmail, false)
    if (!emailRes.isValid && emailRes.error) errs.email = emailRes.error

    const birthRes = validateDateOfBirth(editBirthDate, false)
    if (!birthRes.isValid && birthRes.error) errs.birthDate = birthRes.error

    if (editEmergencyPhone.trim()) {
      const emPhoneRes = validateEgyptianPhone(editEmergencyPhone, false, 'رقم هاتف الطوارئ')
      if (!emPhoneRes.isValid && emPhoneRes.error) errs.emergencyContactPhone = emPhoneRes.error
    }

    setEditErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast.error(Object.values(errs)[0])
      return
    }

    try {
      setIsSaving(true)
      const targetId = memberData?.id || id || ''
      const updated = await membersApi.update(targetId, {
        name: editName.trim(),
        phone: phoneRes.normalized || editPhone.trim(),
        email: editEmail.trim() || null,
        gender: (editGender as 'MALE' | 'FEMALE') || null,
        dateOfBirth: editBirthDate || null,
        address: editAddress.trim() || null,
        emergencyContactName: editEmergencyName.trim() || null,
        emergencyContactPhone: editEmergencyPhone.trim() || null,
        notes: editNotes.trim() || null,
        avatarUrl: editAvatarUrl,
      })
      setMemberData(updated)
      setIsEditModalOpen(false)
      toast.success('تم تحديث بيانات العضو بنجاح')
    } catch (err: any) {
      const { fieldErrors: backendErrors, generalMessage } = extractBackendErrors(err)
      if (Object.keys(backendErrors).length > 0) {
        setEditErrors(backendErrors)
      }
      toast.error(generalMessage || 'فشل تحديث بيانات العضو')
    } finally {
      setIsSaving(false)
    }
  }

  const recentActivities = React.useMemo(() => {
    const list: Array<{
      id: string
      date: Date
      title: string
      desc: string
      dotColor: string
      ringColor: string
    }> = []

    // 1. Attendance checkins
    memberAttendance.forEach((att) => {
      const d = new Date(att.checkInAt)
      const timeStr = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      const dateStr = d.toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' })
      list.push({
        id: `att-${att.id}`,
        date: d,
        title: 'تسجيل حضور في الصالة',
        desc: `${dateStr}، ${timeStr} • ${att.checkOutAt ? 'اكتملت الجلسة' : 'تسجيل حضور بالصالة'}`,
        dotColor: 'bg-emerald-500',
        ringColor: 'ring-emerald-50',
      })
    })

    // 2. Payments
    memberPayments.forEach((pay) => {
      const d = new Date(pay.createdAt)
      const timeStr = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      const dateStr = d.toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' })
      const methodLabel = pay.method === 'CASH' ? 'نقداً (كاش)' : 'محفظة إلكترونية'
      list.push({
        id: `pay-${pay.id}`,
        date: d,
        title: `سداد دفعة مالية (${pay.amount} ج.م)`,
        desc: `${dateStr}، ${timeStr} • ${methodLabel}`,
        dotColor: 'bg-zinc-900',
        ringColor: 'ring-zinc-100',
      })
    })

    // 3. Subscriptions
    memberSubscriptions.forEach((sub) => {
      const d = new Date(sub.createdAt || sub.startDate)
      const dateStr = d.toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })
      list.push({
        id: `sub-${sub.id}`,
        date: d,
        title: `اشتراك (${sub.planName})`,
        desc: `${dateStr} • الحالة: ${sub.effectiveStatus === 'ACTIVE' ? 'نشط' : sub.status}`,
        dotColor: 'bg-amber-500',
        ringColor: 'ring-amber-50',
      })
    })

    // 4. Member registration
    if (memberData?.createdAt) {
      const d = new Date(memberData.createdAt)
      const dateStr = d.toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })
      list.push({
        id: `mem-${memberData.id}`,
        date: d,
        title: 'تسجيل العضوية لأول مرة',
        desc: `${dateStr} • إنشاء ملف المشترك`,
        dotColor: 'bg-zinc-400',
        ringColor: 'ring-zinc-100',
      })
    }

    return list.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5)
  }, [memberAttendance, memberPayments, memberSubscriptions, memberData])

  const handleToggleStatus = async () => {
    try {
      setIsSaving(true)
      const targetId = memberData?.id || id || ''
      const currentActive = memberData ? memberData.isActive : true
      const updated = await membersApi.updateStatus(targetId, !currentActive)
      setMemberData(updated)
      setIsStatusConfirmOpen(false)
      toast.success('تم تحديث حالة العضو بنجاح')
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'فشل تحديث حالة العضو')
    } finally {
      setIsSaving(false)
    }
  }

  // Dynamic values derived from real data
  const memberName = memberData?.name || 'عضو'
  const memberCode = memberData?.memberCode || id || ''
  const currentSub = memberSubscriptions.find((s) => s.status === 'ACTIVE') || memberSubscriptions[0] || null
  const now = new Date()
  const endDate = currentSub?.endDate ? new Date(currentSub.endDate) : null
  const remainingDays = endDate
    ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0
  const durationDays = currentSub?.durationDays || 30
  const progressPercent = durationDays > 0
    ? Math.min(100, Math.max(0, Math.round(((durationDays - remainingDays) / durationDays) * 100)))
    : 0

  const handleFreeze = async () => {
    if (!currentSub) {
      toast.error('لا يوجد اشتراك نشط لتجميده')
      return
    }
    try {
      setIsFreezing(true)
      await subscriptionsApi.freeze(currentSub.id, {
        days: Number(freezeDays),
        reason: 'طلب تجميد من صفحة تفاصيل العضو',
      })
      setIsFreezeModalOpen(false)
      toast.success('تم تجميد اشتراك العضو بنجاح!')
      loadMember()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'فشل تجميد الاشتراك')
    } finally {
      setIsFreezing(false)
    }
  }

  const avatarLetters =
    memberName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('') || memberName.slice(0, 2)

  const isVip = currentSub?.planName?.includes('VIP') || currentSub?.planName?.includes('ماسية')

  const totalPaymentsAmount = memberPayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0)
  const thisMonthVisits = memberAttendance.filter((a) => {
    if (!a.checkInAt) return false
    const d = new Date(a.checkInAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const lastAttendanceItem = memberAttendance[0] || null
  const isInsideGym = lastAttendanceItem ? !lastAttendanceItem.checkOutAt : false

  const statusConfig = memberData?.isActive
    ? currentSub?.status === 'FROZEN'
      ? {
          statusText: 'مجمد (إجازة)',
          statusBadgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
          bannerText: 'الاشتراك مجمد حالياً بناءً على طلب العضو.',
          remainingDays,
          progressPercent,
        }
      : currentSub
      ? remainingDays <= 3
        ? {
            statusText: 'ينتهي قريباً',
            statusBadgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
            bannerText: 'تنبيه: اشتراك العضو يوشك على الانتهاء. يرجى المتابعة للتجديد.',
            remainingDays,
            progressPercent,
          }
        : {
            statusText: 'نشط',
            statusBadgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            bannerText: 'عضوية نشطة: يتمتع العضو بدخول كامل لصالة كمال الأجسام وحصص اللياقة.',
            remainingDays,
            progressPercent,
          }
      : {
          statusText: 'بدون اشتراك نشط',
          statusBadgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200',
          bannerText: 'لا يوجد اشتراك سارٍ حالياً لهذا العضو. انقر على إضافة اشتراك للتفعيل.',
          remainingDays: 0,
          progressPercent: 0,
        }
    : {
        statusText: 'غير نشط / معطل',
        statusBadgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        bannerText: 'العضو غير نشط حالياً. يرجى تفعيل الحساب للسماح بالدخول.',
        remainingDays: 0,
        progressPercent: 100,
      }

  return (
    <div className="space-y-6 pb-16">
      {isLoading ? (
        // Skeleton Loader
        <div className="space-y-6">
          <div className="h-32 bg-white rounded-3xl border border-zinc-200 p-6 animate-pulse" />
          <div className="h-44 bg-white rounded-3xl border border-zinc-200 p-6 animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-zinc-200 animate-pulse" />
            ))}
          </div>
        </div>
      ) : hasError && !memberData ? (
        // Error State
        <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center shadow-xs max-w-xl mx-auto my-12">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-zinc-900 mb-2">تعذر العثور على ملف المشترك</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto mb-6 leading-relaxed">
            لم نتمكن من الوصول لبيانات هذا المشترك. قد يكون المعرف غير صحيح أو تم حذفه، يرجى التحقق من الرابط أو الرجوع لقائمة الأعضاء.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/app/members')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition shadow-sm"
            >
              العودة لقائمة الأعضاء
            </button>
            <button
              onClick={() => loadMember()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-bold hover:bg-zinc-200 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Header and Top Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                  onClick={() => navigate('/app/members')}
                  className="hover:text-zinc-700 cursor-pointer"
                >
                  الأعضاء
                </span>
                <span>&gt;</span>
                <span className="text-zinc-900 font-bold">
                  {memberName} ({memberCode})
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900">ملف العضو الرياضي</h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                onClick={() => navigate(`/app/subscriptions/renew?memberId=${memberData?.id || id}`)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gym-gold hover:bg-gym-gold-light text-zinc-950 text-xs sm:text-sm font-extrabold shadow-xs transition-all active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                <span>تجديد الاشتراك</span>
              </button>

              <button
                onClick={handleOpenEdit}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>تعديل البيانات</span>
              </button>

              <button
                onClick={() => setIsStatusConfirmOpen(true)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors',
                  memberData?.isActive
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                )}
              >
                <span>{memberData?.isActive ? 'تعطيل العضو' : 'تفعيل العضو'}</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className="p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 shadow-xs"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-zinc-200 py-1.5 z-30 text-xs font-semibold text-zinc-700 divide-y divide-zinc-100 animate-in fade-in zoom-in-95 duration-100">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsMoreMenuOpen(false)
                          setIsFreezeModalOpen(true)
                        }}
                        className="w-full px-3 py-2 text-right hover:bg-zinc-50 flex items-center gap-2"
                      >
                        <PauseCircle className="w-3.5 h-3.5 text-zinc-500" />
                        تجميد العضوية
                      </button>
                      <button
                        onClick={() => {
                          setIsMoreMenuOpen(false)
                          setIsManualCheckInModalOpen(true)
                        }}
                        className="w-full px-3 py-2 text-right hover:bg-zinc-50 flex items-center gap-2"
                      >
                        <QrCode className="w-3.5 h-3.5 text-zinc-500" />
                        تسجيل حضور يدوي
                      </button>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsMoreMenuOpen(false)
                          toast.info('جاري طباعة بطاقة العضوية...')
                        }}
                        className="w-full px-3 py-2 text-right hover:bg-zinc-50 flex items-center gap-2"
                      >
                        <Printer className="w-3.5 h-3.5 text-zinc-500" />
                        طباعة كارت العضوية
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top VIP Banner */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-950 font-bold shadow-2xs">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-gym-gold-dark shrink-0" />
              <span>{statusConfig.bannerText}</span>
            </div>
            <span className="text-[10px] font-extrabold bg-amber-200/80 text-amber-900 px-2.5 py-0.5 rounded-full">
              محدث آلياً
            </span>
          </div>

          {/* 3. Member Header Profile Card */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Member Basic ID */}
              <div className="flex items-center gap-5 w-full md:w-auto">
                <input
                  ref={quickFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleQuickAvatarChange}
                />
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-zinc-950 text-white border-2 border-zinc-700 flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md shrink-0 overflow-hidden">
                    {memberData?.avatarUrl ? (
                      <img src={getMediaUrl(memberData.avatarUrl)} alt={memberName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{avatarLetters}</span>
                    )}
                  </div>
                  {/* Quick Change Photo Overlay */}
                  <button
                    type="button"
                    disabled={isUpdatingAvatar}
                    onClick={() => quickFileInputRef.current?.click()}
                    title="تغيير صورة العضو"
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-3xl flex flex-col items-center justify-center text-white text-[10px] font-bold transition-all cursor-pointer backdrop-blur-2xs"
                  >
                    {isUpdatingAvatar ? (
                      <div className="w-5 h-5 border-2 border-gym-gold border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mb-1 text-gym-gold" />
                        <span>تغيير الصورة</span>
                      </>
                    )}
                  </button>
                  {isVip && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gym-gold text-zinc-950 flex items-center justify-center shadow-xs z-10 pointer-events-none">
                      <Award className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-zinc-900">{memberName}</h2>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border',
                        statusConfig.statusBadgeClass
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {statusConfig.statusText}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-900 text-white border border-zinc-700">
                      <Award className="w-3 h-3" />
                      {currentSub ? currentSub.planName : 'بدون باقة'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap pt-0.5">
                    <span className="font-mono font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">
                      {memberCode}
                    </span>
                    <span>•</span>
                    <span className="font-mono dir-ltr">{memberData?.phone || '—'}</span>
                    <span>•</span>
                    <span className="font-mono">{memberData?.email || '—'}</span>
                  </div>

                  <p className="text-[11px] text-zinc-400 font-medium">
                    {memberData?.createdAt
                      ? `عضو منذ ${new Date(memberData.createdAt).toLocaleDateString('ar-EG', { day: '2-digit', month: 'long', year: 'numeric' })}`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Gauge Progress Chart (Visits count) */}
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 flex items-center gap-4 shrink-0 w-full md:w-auto justify-center">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-zinc-200"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-gym-gold"
                      strokeDasharray={`${statusConfig.progressPercent}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xs font-black text-zinc-900">{memberAttendance.length}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-zinc-800">إجمالي الحضور والزيارات</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {thisMonthVisits} زيارة خلال هذا الشهر
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Current Subscription Overview Card */}
          {currentSub ? (
            <div className="bg-white rounded-3xl border border-zinc-200/80 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                <div>
                  <h3 className="text-base font-black text-zinc-900">
                    الاشتراك الحالي: {currentSub.planName}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    مدة الباقة: {currentSub.durationDays} يوم • الحالة:{' '}
                    <span className="font-bold text-zinc-800">{statusConfig.statusText}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsFreezeModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 transition-colors"
                  >
                    تجميد الاشتراك
                  </button>
                  <button
                    onClick={() => navigate(`/app/subscriptions/renew?memberId=${memberData?.id || id}`)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors"
                  >
                    تجديد الباقة
                  </button>
                </div>
              </div>

              {/* 6 KPI Mini Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100 text-center">
                  <p className="text-[11px] text-zinc-400 font-bold">تاريخ البداية</p>
                  <p className="text-xs font-black text-zinc-900 mt-1 font-mono">
                    {currentSub.startDate ? new Date(currentSub.startDate).toLocaleDateString('ar-EG') : '—'}
                  </p>
                </div>

                <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100 text-center">
                  <p className="text-[11px] text-zinc-400 font-bold">تاريخ الانتهاء</p>
                  <p className="text-xs font-black text-zinc-900 mt-1 font-mono">
                    {currentSub.endDate ? new Date(currentSub.endDate).toLocaleDateString('ar-EG') : '—'}
                  </p>
                </div>

                <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-100 text-center">
                  <p className="text-[11px] text-amber-800 font-bold">المدة المتبقية</p>
                  <p className="text-xs font-black text-amber-900 mt-1">
                    {statusConfig.remainingDays} يوم
                  </p>
                </div>

                <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100 text-center">
                  <p className="text-[11px] text-zinc-400 font-bold">قيمة الاشتراك</p>
                  <p className="text-xs font-black text-zinc-900 mt-1 font-mono">
                    {Number(currentSub.planPrice).toLocaleString('ar-EG')} ج.م
                  </p>
                </div>

                <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100 text-center">
                  <p className="text-[11px] text-zinc-400 font-bold">المدفوع</p>
                  <p className="text-xs font-black text-emerald-700 mt-1 font-mono">
                    {Number((currentSub as any).paidAmount || currentSub.planPrice).toLocaleString('ar-EG')} ج.م
                  </p>
                </div>

                <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100 text-center">
                  <p className="text-[11px] text-zinc-400 font-bold">المبلغ المتبقي</p>
                  <p className="text-xs font-black text-zinc-900 mt-1 font-mono">
                    {Number((currentSub as any).remainingAmount || 0).toLocaleString('ar-EG')} ج.م
                  </p>
                </div>
              </div>

              {/* Timeline Progress Bar */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-600">
                  <span>مؤشر استهلاك مدة الاشتراك:</span>
                  <span className="text-gym-gold-dark font-mono font-black">
                    {100 - statusConfig.progressPercent}% متبقي
                  </span>
                </div>

                <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-l from-gym-gold-light to-gym-gold rounded-full transition-all duration-500"
                    style={{ width: `${statusConfig.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-right">
                <h3 className="text-base font-black text-zinc-900">لا يوجد اشتراك نشط حالياً</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  يمكنك تسجيل اشتراك جديد للعضو وتحديد الباقة وطريقة السداد.
                </p>
              </div>
              <button
                onClick={() => navigate(`/app/subscriptions/new?memberId=${memberData?.id || id}`)}
                className="px-5 py-2.5 rounded-xl bg-gym-gold text-zinc-950 font-black text-xs hover:bg-gym-gold-light transition-all"
              >
                + إضافة اشتراك جديد
              </button>
            </div>
          )}

          {/* 5. Quick Stats Row (4 Stat Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500">إجمالي الزيارات</p>
                <h3 className="text-2xl font-black text-zinc-900 mt-0.5">
                  {memberAttendance.length} زيارة
                </h3>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">سجل الحضور</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center">
                <Award className="w-6 h-6 text-gym-gold" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500">حضور هذا الشهر</p>
                <h3 className="text-2xl font-black text-zinc-900 mt-0.5">
                  {thisMonthVisits} يوم
                </h3>
                <p className="text-[11px] text-zinc-500 font-medium mt-1">زيارات الشهر الحالي</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-gym-gold" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500">إجمالي المدفوعات</p>
                <h3 className="text-2xl font-black text-zinc-900 mt-0.5 font-mono">
                  {totalPaymentsAmount.toLocaleString('ar-EG')} ج.م
                </h3>
                <p className="text-[11px] text-zinc-500 font-medium mt-1">
                  {memberPayments.length} دفعات محصلة
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-gym-gold" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500">آخر حضور مسجل</p>
                <h3 className="text-2xl font-black text-zinc-900 mt-0.5">
                  {lastAttendanceItem?.checkInAt
                    ? new Date(lastAttendanceItem.checkInAt).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'لا يوجد'}
                </h3>
                <p
                  className={cn(
                    'text-[11px] font-bold mt-1',
                    isInsideGym ? 'text-emerald-600' : 'text-zinc-500'
                  )}
                >
                  {isInsideGym ? 'داخل الصالة حالياً' : 'خارج الصالة'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* 6. Tabs Navigation Bar */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('info')}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap',
                activeTab === 'info'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              )}
            >
              <User className="w-4 h-4 text-gym-gold" />
              <span>1. المعلومات الشخصية والنظام</span>
            </button>

            <button
              onClick={() => setActiveTab('subscriptions')}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap',
                activeTab === 'subscriptions'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              )}
            >
              <CreditCard className="w-4 h-4 text-gym-gold" />
              <span>2. سجل الاشتراكات ({memberSubscriptions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap',
                activeTab === 'attendance'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              )}
            >
              <Calendar className="w-4 h-4 text-gym-gold" />
              <span>3. سجل الحضور والانصراف ({memberAttendance.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap',
                activeTab === 'payments'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              )}
            >
              <Receipt className="w-4 h-4 text-gym-gold" />
              <span>4. سجل المدفوعات والإيصالات ({memberPayments.length})</span>
            </button>
          </div>

          {/* 7. Tab Content View */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Recent Activity Feed */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white rounded-3xl border border-zinc-200/80 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gym-gold" />
                      <h3 className="text-sm font-black text-zinc-900">آخر النشاطات المسجلة</h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      تحديث فوري
                    </span>
                  </div>

                  {/* Activity Timeline */}
                  <div className="space-y-4 text-xs">
                    {recentActivities.length > 0 ? (
                      recentActivities.map((act) => (
                        <div key={act.id} className="flex items-start gap-3 relative">
                          <div className={cn('w-2.5 h-2.5 rounded-full mt-1 shrink-0 ring-4', act.dotColor, act.ringColor)} />
                          <div>
                            <p className="font-bold text-zinc-900">{act.title}</p>
                            <p className="text-[11px] text-zinc-400 mt-0.5">{act.desc}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-zinc-400 text-xs py-2 text-center">لا توجد أي نشاطات مسجلة حتى الآن</p>
                    )}
                  </div>

                  {/* Manual Checkin CTA */}
                  <button
                    onClick={() => setIsManualCheckInModalOpen(true)}
                    className="w-full py-2.5 rounded-xl border border-zinc-900 bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 mt-2"
                  >
                    <QrCode className="w-4 h-4 text-gym-gold" />
                    <span>تسجيل حضور يدوي</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Personal & System Info Cards */}
              <div className="lg:col-span-8 space-y-4">
                {/* Personal Info Card */}
                <div className="bg-white rounded-3xl border border-zinc-200/80 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gym-gold" />
                      <h3 className="text-sm font-black text-zinc-900">البيانات الشخصية</h3>
                    </div>
                    <button
                      onClick={handleOpenEdit}
                      className="text-xs font-bold text-gym-gold-dark hover:underline"
                    >
                      تعديل
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-zinc-400 font-medium">الاسم بالكامل</p>
                      <p className="font-bold text-zinc-900 mt-1 text-sm">{memberData?.name || '—'}</p>
                    </div>

                    <div>
                      <p className="text-zinc-400 font-medium">رقم الهاتف المحمول</p>
                      <p className="font-mono font-bold text-zinc-900 mt-1 text-sm dir-ltr text-right">
                        {memberData?.phone || '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-400 font-medium">تاريخ الميلاد</p>
                      <p className="font-bold text-zinc-900 mt-1">
                        {memberData?.dateOfBirth ? memberData.dateOfBirth.split('T')[0] : '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-400 font-medium">البريد الإلكتروني</p>
                      <p className="font-mono font-bold text-zinc-900 mt-1">{memberData?.email || '—'}</p>
                    </div>

                    <div>
                      <p className="text-zinc-400 font-medium">النوع</p>
                      <p className="font-bold text-zinc-900 mt-1">
                        {memberData?.gender === 'MALE' ? 'ذكر' : memberData?.gender === 'FEMALE' ? 'أنثى' : '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-400 font-medium">العنوان والمنطقة</p>
                      <p className="font-bold text-zinc-900 mt-1">{memberData?.address || '—'}</p>
                    </div>

                    {memberData?.emergencyContactName && (
                      <div className="sm:col-span-2">
                        <p className="text-zinc-400 font-medium">جهة الاتصال للطوارئ</p>
                        <p className="font-bold text-zinc-900 mt-1">
                          {memberData.emergencyContactName} • {memberData.emergencyContactPhone || '—'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* GymVIP Records Card */}
                <div className="bg-white rounded-3xl border border-zinc-200/80 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-gym-gold" />
                      <h3 className="text-sm font-black text-zinc-900">
                        بيانات القيد في النظام (GymVIP Records)
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-zinc-400 font-medium">كود العضو الداخلي</p>
                      <p className="font-mono font-bold text-zinc-900 mt-1">{memberCode}</p>
                    </div>

                    <div>
                      <p className="text-zinc-400 font-medium">حالة العضوية</p>
                      <p className="font-bold text-zinc-900 mt-1">{statusConfig.statusText}</p>
                    </div>

                    <div>
                      <p className="text-zinc-400 font-medium">تاريخ أول تسجيل</p>
                      <p className="font-bold text-zinc-900 mt-1 font-mono">
                        {memberData?.createdAt
                          ? new Date(memberData.createdAt).toLocaleDateString('ar-EG', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-400 font-medium">إجمالي الاشتراكات</p>
                      <p className="font-bold text-zinc-900 mt-1 font-mono">
                        {memberSubscriptions.length} باقة
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-400 font-medium">حالة الأرشيف</p>
                      <p className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] mt-1">
                        <Check className="w-3 h-3" />
                        {memberData?.isActive ? 'حساب نشط ومفعل' : 'حساب معطل'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Member Notes Card */}
                <div className="bg-white rounded-3xl border border-zinc-200/80 p-5 sm:p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <Edit className="w-4 h-4 text-gym-gold" />
                      <h3 className="text-sm font-black text-zinc-900">الملاحظات الخاصة بالعضو</h3>
                    </div>
                    <button
                      onClick={handleOpenEdit}
                      className="text-xs font-bold text-gym-gold-dark hover:underline"
                    >
                      تعديل الملاحظات
                    </button>
                  </div>

                  <p className="text-xs text-zinc-600 leading-relaxed bg-zinc-50 p-3.5 rounded-2xl border border-zinc-100">
                    {memberData?.notes || 'لا توجد ملاحظات مسجلة لهذا العضو.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Subscriptions History Table */}
          {activeTab === 'subscriptions' && (
            <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-sm font-black text-zinc-900">
                  سجل باقات واشتراكات العضو ({memberSubscriptions.length})
                </h3>
                <button
                  onClick={() => navigate(`/app/subscriptions/new?memberId=${memberData?.id || id}`)}
                  className="px-4 py-2 rounded-xl bg-gym-gold text-zinc-950 text-xs font-bold hover:bg-gym-gold-light transition-all"
                >
                  + إضافة اشتراك جديد
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 font-bold">
                    <tr>
                      <th className="p-4">الباقة</th>
                      <th className="p-4">تاريخ البدء</th>
                      <th className="p-4">تاريخ الانتهاء</th>
                      <th className="p-4">المبلغ</th>
                      <th className="p-4">المدة</th>
                      <th className="p-4">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium">
                    {memberSubscriptions.length > 0 ? (
                      memberSubscriptions.map((sub) => (
                        <tr
                          key={sub.id}
                          onClick={() => navigate(`/app/subscriptions/${sub.id}`)}
                          className="hover:bg-zinc-50 cursor-pointer transition-colors"
                        >
                          <td className="p-4 font-bold text-zinc-900">{sub.planName}</td>
                          <td className="p-4 font-mono text-zinc-600">
                            {sub.startDate ? sub.startDate.split('T')[0] : ''}
                          </td>
                          <td className="p-4 font-mono text-zinc-600">
                            {sub.endDate ? sub.endDate.split('T')[0] : ''}
                          </td>
                          <td className="p-4 font-bold font-mono">
                            {Number(sub.planPrice).toLocaleString('ar-EG')} ج.م
                          </td>
                          <td className="p-4 font-mono text-zinc-600">
                            {sub.durationDays} يوم
                          </td>
                          <td className="p-4">
                            {sub.effectiveStatus === 'ACTIVE' || sub.status === 'ACTIVE' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ساري حالياً
                              </span>
                            ) : sub.effectiveStatus === 'FROZEN' || sub.status === 'FROZEN' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                مجمد
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-600">
                                منتهي
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-400 font-bold">
                          لا توجد باقات سابقة مسجلة لهذا العضو
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Attendance History Table */}
          {activeTab === 'attendance' && (
            <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-sm font-black text-zinc-900">
                  سجل تسجيل الحضور والانصراف ({memberAttendance.length})
                </h3>
                <button
                  onClick={() => setIsManualCheckInModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800"
                >
                  + تسجيل حضور فوري
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 font-bold">
                    <tr>
                      <th className="p-4">التاريخ</th>
                      <th className="p-4">وقت الدخول</th>
                      <th className="p-4">وقت الانصراف</th>
                      <th className="p-4">المدة المستغرقة</th>
                      <th className="p-4">الباقة المقترنة</th>
                      <th className="p-4">الحالة</th>
                      <th className="p-4 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium">
                    {memberAttendance.length > 0 ? (
                      memberAttendance.map((att) => (
                        <tr key={att.id} className="hover:bg-zinc-50">
                          <td className="p-4 font-bold text-zinc-900 font-mono">
                            {att.checkInAt ? att.checkInAt.split('T')[0] : '-'}
                          </td>
                          <td className="p-4 font-mono font-bold text-emerald-700">
                            {att.checkInAt ? new Date(att.checkInAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="p-4 font-mono text-zinc-600">
                            {att.checkOutAt ? new Date(att.checkOutAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="p-4 font-mono">
                            {att.durationMinutes != null ? `${att.durationMinutes} دقيقة` : 'قيد التدريب'}
                          </td>
                          <td className="p-4 text-zinc-700">
                            {att.subscription?.planName || 'الاشتراك الحالي'}
                          </td>
                          <td className="p-4">
                            {att.checkOutAt ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-700">
                                مكتمل
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                                داخل الصالة حالياً
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {!att.checkOutAt && (
                              <button
                                onClick={async () => {
                                  try {
                                    await attendanceApi.checkOut(att.id)
                                    toast.success('تم تسجيل انصراف العضو بنجاح')
                                    loadMember()
                                  } catch (err: any) {
                                    toast.error(err.response?.data?.message || err.message || 'فشل تسجيل الانصراف')
                                  }
                                }}
                                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-[11px] transition-colors"
                              >
                                تسجيل خروج
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-400 font-bold">
                          لا يوجد سجل حضور مسجل لهذا العضو
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Payments History Table */}
          {activeTab === 'payments' && (
            <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-sm font-black text-zinc-900">
                  سجل العمليات المالية والإيصالات ({memberPayments.length})
                </h3>
                <button
                  onClick={() => {
                    const activeSub = memberSubscriptions.find((s) => s.effectiveStatus === 'ACTIVE' || s.status === 'ACTIVE') || memberSubscriptions[0]
                    if (activeSub) {
                      navigate(`/app/payments/new?subscriptionId=${activeSub.id}&memberId=${memberData?.id || id}`)
                    } else {
                      navigate(`/app/payments/new?memberId=${memberData?.id || id}`)
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-gym-gold text-zinc-950 text-xs font-bold hover:bg-gym-gold-light cursor-pointer"
                >
                  + تسجيل دفعة جديدة
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 font-bold">
                    <tr>
                      <th className="p-4">رقم الإيصال</th>
                      <th className="p-4">التاريخ</th>
                      <th className="p-4">المبلغ</th>
                      <th className="p-4">طريقة الدفع</th>
                      <th className="p-4">المرجع / الملاحظات</th>
                      <th className="p-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium">
                    {memberPayments.length > 0 ? (
                      memberPayments.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-zinc-50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/app/payments/${p.id}`)}
                        >
                          <td className="p-4 font-mono font-bold text-zinc-900">{p.id}</td>
                          <td className="p-4 font-mono text-zinc-600">
                            {p.createdAt ? p.createdAt.split('T')[0] : ''}
                          </td>
                          <td className="p-4 font-black text-zinc-950 font-mono">
                            {Number(p.amount).toLocaleString('ar-EG')} ج.م
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 font-bold text-[11px]">
                              {p.method === 'CASH' ? 'نقدي (كاش)' : `محفظة (${p.walletProvider})`}
                            </span>
                          </td>
                          <td className="p-4 text-zinc-600">
                            {p.transactionReference || p.notes || 'سداد اشتراك'}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/app/payments/${p.id}`)
                              }}
                              className="px-3 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-[11px]"
                            >
                              عرض الإيصال
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-400 font-bold">
                          لا توجد عمليات دفع أو إيصالات مسجلة لهذا العضو
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL 2: Freeze Modal */}
      {isFreezeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <PauseCircle className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-zinc-900">تجميد الاشتراك (Freeze)</h3>
              </div>
              <button
                onClick={() => setIsFreezeModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-xs text-zinc-600 leading-relaxed">
                سيتم إيقاف احتساب أيام الاشتراك للعضو مؤقتاً وترحيل تاريخ الانتهاء تلقائياً.
              </p>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">مدة التجميد (بالأيام)</label>
                <select
                  value={freezeDays}
                  onChange={(e) => setFreezeDays(Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                >
                  <option value={7}>7 أيام (أسبوع)</option>
                  <option value={14}>14 يوماً (أسبوعان)</option>
                  <option value={30}>30 يوماً (شهر كامل)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
              <button
                onClick={() => setIsFreezeModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50"
              >
                إلغاء
              </button>
              <button
                disabled={isFreezing}
                onClick={handleFreeze}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {isFreezing ? 'جاري التجميد...' : 'تأكيد التجميد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Manual Check-In Modal */}
      {isManualCheckInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-bold text-zinc-900">تسجيل حضور يدوي فوري</h3>
              </div>
              <button
                onClick={() => setIsManualCheckInModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-emerald-900 flex items-center gap-2.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>اشتراك العضو ساري ونشط - مصرح بالدخول الفوري.</span>
              </div>
              <p className="text-zinc-500">
                سيتم توثيق تسجيل حضور العضو في سجل الحضور والزيارات بتوقيت اللحظة الحالية وتحديث عداد الحضور اليومي في لوحة التحكم.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
              <button
                onClick={() => setIsManualCheckInModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  try {
                    const targetId = memberData?.id || id
                    if (!targetId) return
                    await attendanceApi.checkIn(targetId)
                    setIsManualCheckInModalOpen(false)
                    toast.success('تم تسجيل حضور العضو بنجاح!')
                    loadMember()
                  } catch (err: any) {
                    toast.error(err.response?.data?.message || err.message || 'فشل تسجيل الدخول')
                  }
                }}
                className="px-5 py-2 rounded-xl bg-gym-gold text-zinc-950 text-xs font-black hover:bg-gym-gold-light"
              >
                تأكيد تسجيل الدخول
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 5: Edit Member Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                  <Edit className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-bold text-zinc-900">تعديل بيانات العضو</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="py-4 space-y-3.5 text-xs">
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleEditImageSelect}
              />

              {/* Photo Upload & Preview in Edit Modal */}
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/90 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-950 text-white border border-zinc-700 flex items-center justify-center font-black text-lg overflow-hidden shrink-0">
                    {editAvatarUrl ? (
                      <img src={getMediaUrl(editAvatarUrl)} alt="صورة العضو" className="w-full h-full object-cover" />
                    ) : (
                      <span>{avatarLetters}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">الصورة الشخصية للعضو</h4>
                    <p className="text-[11px] text-zinc-500">تظهر في ملف العضو وسجلات الحضور</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{editAvatarUrl ? 'تغيير الصورة' : 'رفع صورة'}</span>
                  </button>
                  {editAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditAvatarUrl(null)
                        if (editFileInputRef.current) {
                          editFileInputRef.current.value = ''
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>إزالة الصورة</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">كود العضو (غير قابل للتعديل)</label>
                <input
                  type="text"
                  disabled
                  value={memberData?.memberCode || memberCode}
                  className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 rounded-xl font-mono text-zinc-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">اسم العضو *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => handleEditNameChange(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 bg-zinc-50 border rounded-xl font-bold focus:bg-white focus:outline-none',
                    editErrors.name ? 'border-rose-400 bg-rose-50/50' : 'border-zinc-200 focus:border-zinc-900'
                  )}
                />
                <FieldError error={editErrors.name} />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">رقم الهاتف *</label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => handleEditPhoneChange(e.target.value)}
                  placeholder="01012345678"
                  className={cn(
                    'w-full px-3 py-2 bg-zinc-50 border rounded-xl font-mono font-bold focus:bg-white focus:outline-none dir-ltr text-right',
                    editErrors.phone ? 'border-rose-400 bg-rose-50/50' : 'border-zinc-200 focus:border-zinc-900'
                  )}
                />
                <FieldError error={editErrors.phone} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => handleEditEmailChange(e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 bg-zinc-50 border rounded-xl focus:bg-white focus:outline-none',
                      editErrors.email ? 'border-rose-400 bg-rose-50/50' : 'border-zinc-200 focus:border-zinc-900'
                    )}
                  />
                  <FieldError error={editErrors.email} />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">النوع</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as 'MALE' | 'FEMALE' | '')}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold focus:bg-white"
                  >
                    <option value="">غير محدد</option>
                    <option value="MALE">ذكر</option>
                    <option value="FEMALE">أنثى</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => handleEditBirthDateChange(e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 bg-zinc-50 border rounded-xl focus:bg-white focus:outline-none',
                      editErrors.birthDate ? 'border-rose-400 bg-rose-50/50' : 'border-zinc-200 focus:border-zinc-900'
                    )}
                  />
                  <FieldError error={editErrors.birthDate} />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">العنوان</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">اسم شخص للطوارئ</label>
                  <input
                    type="text"
                    value={editEmergencyName}
                    onChange={(e) => setEditEmergencyName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">هاتف الطوارئ</label>
                  <input
                    type="text"
                    value={editEmergencyPhone}
                    onChange={(e) => handleEditEmergencyPhoneChange(e.target.value)}
                    placeholder="01112345678"
                    className={cn(
                      'w-full px-3 py-2 bg-zinc-50 border rounded-xl font-mono dir-ltr text-right focus:bg-white',
                      editErrors.emergencyContactPhone ? 'border-rose-400 bg-rose-50/50' : 'border-zinc-200'
                    )}
                  />
                  <FieldError error={editErrors.emergencyContactPhone} />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">ملاحظات</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 font-bold hover:bg-zinc-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-zinc-900 text-white font-bold hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Status Toggle Confirmation Modal */}
      {isStatusConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1">
              {(memberData?.isActive ?? true)
                ? 'هل أنت متأكد من تعطيل هذا العضو؟'
                : 'هل تريد تفعيل هذا العضو؟'}
            </h3>
            <p className="text-xs text-zinc-500 mb-5">
              {(memberData?.isActive ?? true)
                ? 'لن يتمكن العضو من تسجيل الدخول أو الحضور إلى الجيم حتى تتم إعادة تفعيله.'
                : 'سيتم استعادة نشاط العضو وتمكينه من الدخول وتسجيل الحضور.'}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsStatusConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleToggleStatus}
                className={cn(
                  'px-5 py-2 rounded-xl text-white text-xs font-bold transition-all disabled:opacity-50',
                  (memberData?.isActive ?? true)
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                )}
              >
                {isSaving ? 'جاري التنفيذ...' : 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MemberDetailPage
