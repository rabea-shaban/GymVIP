import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  User,
  UserPlus,
  ArrowLeft,
  Upload,
  Trash2,
  Calendar,
  CreditCard,
  Wallet,
  CheckCircle2,
  FileText,
  Check,
  Receipt,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/feedback/Toast'
import { membersApi } from '../services/membersApi'
import { plansApi } from '@/features/plans/services/plansApi'
import { subscriptionsApi } from '@/features/subscriptions/services/subscriptionsApi'
import { paymentsApi } from '@/features/payments/services/paymentsApi'
import {
  validateName,
  validateEgyptianPhone,
  validateEmail,
  validateDateOfBirth,
  extractBackendErrors,
} from '@/lib/validation'
import { showMemberCreatedAlert } from '@/lib/sweetAlert'
import { FieldError } from '@/components/ui/FieldError'

interface MembershipPlan {
  id: string
  name: string
  price: number
  durationDays: number
  badge?: string
  badgeColor?: string
}

const DEFAULT_PLANS: MembershipPlan[] = [
  { id: 'monthly', name: 'شهري', price: 500, durationDays: 30 },
  { id: 'quarterly', name: '3 شهور', price: 1300, durationDays: 90, badge: 'الأكثر توفيراً', badgeColor: 'bg-amber-100 text-amber-900' },
  { id: 'semi-annual', name: '6 شهور', price: 2400, durationDays: 180 },
  { id: 'annual', name: 'سنوي', price: 4000, durationDays: 365, badge: 'VIP النخبة', badgeColor: 'bg-zinc-900 text-white border border-zinc-700' },
]

export const MemberCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  // Plans State
  const [plans, setPlans] = useState<MembershipPlan[]>(DEFAULT_PLANS)
  const [isSaving, setIsSaving] = useState(false)

  // Form Fields State
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE')
  const [birthDate, setBirthDate] = useState('')
  const [address, setAddress] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح (JPG أو PNG أو WebP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً، الحد الأقصى المسموح به 5 ميجابايت')
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
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
          setAvatarUrl(compressedDataUrl)
          toast.success('تم اختيار وتجهيز صورة العضو بنجاح!')
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setAvatarUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    toast.info('تمت إزالة الصورة')
  }

  // Plan & Payment State
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [discount, setDiscount] = useState<number>(0)
  const [paidAmount, setPaidAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'E_WALLET'>('CASH')
  const [notes, setNotes] = useState('')

  // Show Unsaved Modal
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)

  // Fetch real plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await plansApi.list({ status: 'active' })
        if (res.plans && res.plans.length > 0) {
          const mapped: MembershipPlan[] = res.plans.map((p) => ({
            id: p.id,
            name: p.name,
            price: parseFloat(p.price) || 0,
            durationDays: p.durationDays,
            badge:
              p.durationDays >= 365
                ? 'VIP النخبة'
                : p.durationDays === 90
                ? 'الأكثر توفيراً'
                : undefined,
            badgeColor:
              p.durationDays >= 365
                ? 'bg-zinc-900 text-white border border-zinc-700'
                : 'bg-amber-100 text-amber-900',
          }))
          setPlans(mapped)
          setSelectedPlanId(mapped[0].id)
          setPaidAmount(mapped[0].price)
        }
      } catch {
        // Fallback to default plans
        setSelectedPlanId(DEFAULT_PLANS[0].id)
        setPaidAmount(DEFAULT_PLANS[0].price)
      }
    }
    fetchPlans()
  }, [])

  // Selected Plan Object
  const currentPlan = useMemo(() => {
    return plans.find((p) => p.id === selectedPlanId) || plans[0] || DEFAULT_PLANS[0]
  }, [plans, selectedPlanId])

  // Calculate Dates & Financials
  const calculatedEndDate = useMemo(() => {
    if (!startDate || !currentPlan) return ''
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(start.getDate() + (currentPlan.durationDays || 30) - 1)
    return end.toLocaleDateString('ar-EG', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }, [startDate, currentPlan])

  const totalPrice = currentPlan ? currentPlan.price : 0
  const finalPrice = Math.max(0, totalPrice - (Number(discount) || 0))
  const remainingAmount = Math.max(0, finalPrice - (Number(paidAmount) || 0))

  // Handle Plan Change
  const handleSelectPlan = (plan: MembershipPlan) => {
    setSelectedPlanId(plan.id)
    setPaidAmount(Math.max(0, plan.price - (Number(discount) || 0)))
  }

  const handleNameChange = (val: string) => {
    setFullName(val)
    if (!val.trim()) {
      setFieldErrors((prev) => ({ ...prev, name: 'اسم العضو مطلوب' }))
    } else {
      const res = validateName(val, 'اسم العضو', 2, 100)
      setFieldErrors((prev) => ({ ...prev, name: res.isValid ? '' : (res.error || '') }))
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

  const handleEmailChange = (val: string) => {
    setEmail(val)
    if (val.trim()) {
      const res = validateEmail(val, false)
      setFieldErrors((prev) => ({ ...prev, email: res.isValid ? '' : (res.error || '') }))
    } else {
      setFieldErrors((prev) => ({ ...prev, email: '' }))
    }
  }

  const handleBirthDateChange = (val: string) => {
    setBirthDate(val)
    if (val) {
      const res = validateDateOfBirth(val, false)
      setFieldErrors((prev) => ({ ...prev, birthDate: res.isValid ? '' : (res.error || '') }))
    } else {
      setFieldErrors((prev) => ({ ...prev, birthDate: '' }))
    }
  }

  const handleDiscountChange = (val: number) => {
    setDiscount(val)
    let err = ''
    if (val < 0) {
      err = 'قيمة الخصم لا يمكن أن تكون سالبة'
    } else if (currentPlan && val > currentPlan.price) {
      err = 'قيمة الخصم لا يمكن أن تتجاوز سعر الباقة'
    }
    setFieldErrors((prev) => ({ ...prev, discount: err }))
    if (currentPlan) {
      setPaidAmount(Math.max(0, currentPlan.price - val))
    }
  }

  const handlePaidAmountChange = (val: number) => {
    setPaidAmount(val)
    let err = ''
    if (val < 0) {
      err = 'المبلغ المحصل لا يمكن أن يكون سالباً'
    } else if (currentPlan && val > finalPrice) {
      err = 'المبلغ المحصل لا يمكن أن يتجاوز المبلغ المطلوب'
    }
    setFieldErrors((prev) => ({ ...prev, paidAmount: err }))
  }

  const validateForm = () => {
    const errs: Record<string, string> = {}
    const nameRes = validateName(fullName, 'اسم العضو', 2, 100)
    if (!nameRes.isValid && nameRes.error) errs.name = nameRes.error

    const phoneRes = validateEgyptianPhone(phone, true, 'رقم الهاتف')
    if (!phoneRes.isValid && phoneRes.error) errs.phone = phoneRes.error

    const emailRes = validateEmail(email, false)
    if (!emailRes.isValid && emailRes.error) errs.email = emailRes.error

    const birthRes = validateDateOfBirth(birthDate, false)
    if (!birthRes.isValid && birthRes.error) errs.birthDate = birthRes.error

    if (discount < 0) {
      errs.discount = 'قيمة الخصم لا يمكن أن تكون سالبة'
    } else if (currentPlan && discount > currentPlan.price) {
      errs.discount = 'قيمة الخصم لا يمكن أن تتجاوز سعر الباقة'
    }

    if (paidAmount < 0) {
      errs.paidAmount = 'المبلغ المحصل لا يمكن أن يكون سالباً'
    } else if (currentPlan && paidAmount > finalPrice) {
      errs.paidAmount = 'المبلغ المحصل لا يمكن أن يتجاوز المبلغ المطلوب'
    }

    setFieldErrors(errs)
    return {
      isValid: Object.keys(errs).length === 0,
      errors: errs,
      normalizedPhone: phoneRes.normalized,
    }
  }

  const handleSaveMember = async (addAnother: boolean = false) => {
    const { isValid, errors: validationErrors, normalizedPhone } = validateForm()
    if (!isValid) {
      const firstErrMsg = Object.values(validationErrors)[0]
      toast.error(firstErrMsg || 'يرجى تصحيح أخطاء الإدخال الموضحة في النموذج')
      return
    }

    setIsSaving(true)
    try {
      // 1. Create Member
      const newMember = await membersApi.create({
        name: fullName.trim(),
        phone: normalizedPhone || phone.trim(),
        email: email.trim() || null,
        gender: gender || null,
        dateOfBirth: birthDate || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        avatarUrl: avatarUrl || null,
      })

      // 2. Create Subscription if a plan is chosen
      if (currentPlan && currentPlan.id) {
        try {
          const newSub = await subscriptionsApi.create({
            memberId: newMember.id,
            planId: currentPlan.id,
            startDate: startDate || undefined,
            notes: notes.trim() || undefined,
          })

          // 3. Create Payment if paidAmount > 0
          if (paidAmount > 0) {
            try {
              await paymentsApi.create({
                subscriptionId: newSub.id,
                amount: Number(paidAmount),
                method: paymentMethod === 'E_WALLET' ? 'WALLET' : 'CASH',
                walletProvider: paymentMethod === 'E_WALLET' ? 'INSTAPAY' : undefined,
                notes: 'سداد رسوم اشتراك العضوية المباشرة',
              })
            } catch (payErr: any) {
              console.error('Payment creation error:', payErr)
            }
          }
        } catch (subErr: any) {
          console.error('Subscription creation error:', subErr)
        }
      }

      // Invalidate relevant queries so dashboard, members, subscriptions, and payments reflect real data immediately
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })

      // Show SweetAlert!
      const userChoice = await showMemberCreatedAlert({
        name: newMember.name,
        memberCode: newMember.memberCode,
        phone: newMember.phone,
        planName: currentPlan?.name,
        paidAmount: paidAmount > 0 ? paidAmount : undefined,
        avatarUrl: newMember.avatarUrl || avatarUrl,
      })

      if (userChoice === 'view' && !addAnother) {
        navigate(`/app/members/${newMember.id}`)
      } else {
        setFullName('')
        setPhone('')
        setEmail('')
        setAddress('')
        setNotes('')
        setBirthDate('')
        setAvatarUrl(null)
        setFieldErrors({})
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        if (currentPlan) {
          setPaidAmount(currentPlan.price)
        }
        setDiscount(0)
      }
    } catch (err: any) {
      const { fieldErrors: backendErrors, generalMessage } = extractBackendErrors(err)
      if (Object.keys(backendErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...backendErrors }))
      }
      toast.error(generalMessage || 'حدث خطأ أثناء إضافة العضو')
    } finally {
      setIsSaving(false)
    }
  }

  const isFormDirty = Boolean(fullName || phone || email || address || notes)

  return (
    <div className="space-y-6 pb-16 font-cairo">
      {/* 1. Breadcrumbs & Header */}
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
            <span className="text-zinc-900 font-bold">إضافة عضو جديد</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900">إضافة عضو جديد</h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            أضف بيانات العضو واختر الاشتراك والتحصيل المالي في خطوة واحدة فائقة الكفاءة.
          </p>
        </div>

        {/* Back button */}
        <button
          onClick={() => {
            if (isFormDirty) {
              setShowUnsavedModal(true)
            } else {
              navigate('/app/members')
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-xs sm:text-sm font-bold hover:bg-zinc-50 transition-colors shadow-xs"
        >
          <span>العودة إلى الأعضاء</span>
          <ArrowLeft className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* 3. Main Form Grid (2 Columns: Left is Sticky Summary, Right is Form Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* RIGHT COLUMN: Main Form Sections (8 Cols on Desktop) */}
        <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
          {/* SECTION 1: بيانات العضو الأساسية */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center">
                <User className="w-4 h-4 text-gym-gold" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-zinc-900">بيانات العضو الأساسية</h3>
                <p className="text-[11px] text-zinc-500">بيانات التعريف والتواصل مع المشترك</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-800">
                    الاسم بالكامل <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-zinc-400">الاسم الثلاثي أو الرباعي</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="مثال: أحمد محمد علي"
                    className={cn(
                      'w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-50 border rounded-xl focus:bg-white focus:outline-none transition-all',
                      fieldErrors.name
                        ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500 text-rose-900'
                        : 'border-zinc-200 focus:border-zinc-900 text-zinc-900'
                    )}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <User className="w-4 h-4" />
                  </div>
                </div>
                <FieldError error={fieldErrors.name} />
              </div>

              {/* Phone and Email Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-800">
                      رقم الهاتف <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                      مصر (20+)
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="01023456789"
                      className={cn(
                        'w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-50 border rounded-xl focus:bg-white focus:outline-none transition-all font-mono',
                        fieldErrors.phone
                          ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500 text-rose-900'
                          : 'border-zinc-200 focus:border-zinc-900 text-zinc-900'
                      )}
                    />
                  </div>
                  <FieldError error={fieldErrors.phone} />
                </div>

                {/* Email */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-800">البريد الإلكتروني</label>
                    <span className="text-[10px] text-zinc-400">اختياري</span>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="ahmed.ali@example.com"
                    className={cn(
                      'w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-50 border rounded-xl focus:bg-white focus:outline-none transition-all font-mono',
                      fieldErrors.email
                        ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500 text-rose-900'
                        : 'border-zinc-200 focus:border-zinc-900 text-zinc-900'
                    )}
                  />
                  <FieldError error={fieldErrors.email} />
                </div>
              </div>

              {/* Gender and Birthdate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gender Segmented */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-800">النوع (الجنس)</label>
                    <span className="text-[10px] text-zinc-400">اختياري</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('MALE')}
                      className={cn(
                        'py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5',
                        gender === 'MALE'
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                          : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                      )}
                    >
                      <User className="w-3.5 h-3.5" />
                      ذكر
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('FEMALE')}
                      className={cn(
                        'py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5',
                        gender === 'FEMALE'
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                          : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                      )}
                    >
                      <User className="w-3.5 h-3.5" />
                      أنثى
                    </button>
                  </div>
                </div>

                {/* BirthDate */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-800">تاريخ الميلاد</label>
                  </div>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => handleBirthDateChange(e.target.value)}
                    className={cn(
                      'w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-50 border rounded-xl focus:bg-white focus:outline-none transition-all font-mono',
                      fieldErrors.birthDate
                        ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500 text-rose-900'
                        : 'border-zinc-200 focus:border-zinc-900 text-zinc-900'
                    )}
                  />
                  <FieldError error={fieldErrors.birthDate} />
                </div>
              </div>

              {/* Address */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-800">العنوان والإقامة</label>
                  <span className="text-[10px] text-zinc-400">اختياري</span>
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المعادي الجديدة، القاهرة"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: صورة العضو */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-gym-gold" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-zinc-900">صورة العضو</h3>
                <p className="text-[11px] text-zinc-500">
                  تستخدم للتعرف السريع في شاشات البصمة والدخول
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleImageSelect}
            />

            <div className="bg-amber-50/40 border border-amber-200/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-amber-200 text-amber-900 font-black text-xl flex items-center justify-center shadow-inner shrink-0 overflow-hidden border-2 border-gym-gold/40">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="صورة العضو" className="w-full h-full object-cover" />
                  ) : (
                    <span>
                      {fullName.trim()
                        ? fullName
                            .trim()
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join(' ')
                        : 'ع ج'}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900">صورة شخصية رسمية للعضو</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed max-w-sm">
                    PNG أو JPG أو WebP - يفضل صورة واضحة ومربعة بحجم أقل من 5 ميجابايت لتظهر بدقة عند شاشات الدخول الذكية.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{avatarUrl ? 'تغيير الصورة' : 'رفع صورة'}</span>
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-100 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>إزالة الصورة</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: اختيار الاشتراك */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-gym-gold" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-zinc-900">اختيار الاشتراك</h3>
                  <p className="text-[11px] text-zinc-500">حدد باقة العضوية المناسبة للعضو</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-lg">
                {plans.length} خطط متوفرة
              </span>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id
                return (
                  <div
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan)}
                    className={cn(
                      'relative rounded-2xl p-4 border-2 transition-all cursor-pointer flex flex-col justify-between',
                      isSelected
                        ? 'border-gym-gold bg-amber-50/20 shadow-xs'
                        : 'border-zinc-200/80 bg-zinc-50/50 hover:border-zinc-300'
                    )}
                  >
                    {/* Badge if available */}
                    {plan.badge && (
                      <div className="absolute -top-2.5 right-3">
                        <span
                          className={cn(
                            'text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs',
                            plan.badgeColor
                          )}
                        >
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-900">{plan.name}</span>
                        <div
                          className={cn(
                            'w-4 h-4 rounded-full border flex items-center justify-center',
                            isSelected
                              ? 'border-gym-gold bg-gym-gold text-zinc-950'
                              : 'border-zinc-300 bg-white'
                          )}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>

                      <div className="my-2">
                        <span className="text-lg font-black text-zinc-900">
                          {plan.price.toLocaleString('ar-EG')}
                        </span>{' '}
                        <span className="text-[10px] font-bold text-zinc-500">ج.م</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-zinc-400 font-medium pt-2 border-t border-zinc-100">
                      المدة المعتمدة: {plan.durationDays} يوم
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SECTION 4: بيانات الاشتراك والتحصيل المالي */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-gym-gold" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-zinc-900">
                  بيانات الاشتراك والتحصيل المالي
                </h3>
                <p className="text-[11px] text-zinc-500">
                  حساب المدة تلقائياً واحتساب مبالغ التحصيل والمتبقي
                </p>
              </div>
            </div>

            {/* Row 1: Start Date, Auto End Date, Base Price */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  تاريخ بداية الاشتراك
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  تاريخ نهاية الاشتراك (محسوب تلقائياً)
                </label>
                <div className="w-full px-3 py-2.5 text-xs bg-zinc-100 border border-zinc-200 rounded-xl font-bold text-zinc-700 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{calculatedEndDate}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  السعر الأساسي للخطة
                </label>
                <div className="w-full px-3 py-2.5 text-xs bg-zinc-100 border border-zinc-200 rounded-xl font-bold text-zinc-700">
                  {totalPrice.toLocaleString('ar-EG')} ج.م (السعر الثابت)
                </div>
              </div>
            </div>

            {/* Row 2: Discount, Final Price, Paid Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-800">الخصم</label>
                  <span className="text-[10px] text-zinc-400">اختياري</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={totalPrice}
                    value={discount}
                    onChange={(e) => handleDiscountChange(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                  />
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-zinc-400">
                    ج.م
                  </span>
                </div>
                <FieldError error={fieldErrors.discount} />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  المبلغ المطلوب الإجمالي
                </label>
                <div className="w-full px-3 py-2.5 text-xs bg-zinc-100 border border-zinc-200 rounded-xl font-black text-zinc-900">
                  {finalPrice.toLocaleString('ar-EG')} ج.م (الصافي المطلوب)
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  المبلغ المدفوع حالياً <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={finalPrice}
                    value={paidAmount}
                    onChange={(e) => handlePaidAmountChange(Number(e.target.value) || 0)}
                    className={cn(
                      'w-full pl-10 pr-3 py-2.5 text-xs bg-zinc-50 border rounded-xl font-bold text-zinc-900',
                      fieldErrors.paidAmount ? 'border-rose-400 bg-rose-50/50' : 'border-zinc-200'
                    )}
                  />
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-zinc-400">
                    ج.م
                  </span>
                </div>
                <FieldError error={fieldErrors.paidAmount} />
              </div>
            </div>

            {/* Banner of remaining amount status */}
            <div
              className={cn(
                'p-3.5 rounded-xl border flex items-center justify-between text-xs',
                remainingAmount === 0
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              )}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={cn(
                    'w-4 h-4',
                    remainingAmount === 0 ? 'text-emerald-600' : 'text-amber-600'
                  )}
                />
                <span className="font-semibold">
                  {remainingAmount === 0
                    ? 'تم سداد كامل قيمة الاشتراك، لا يوجد مستحقات مؤجلة.'
                    : `يوجد متبقي مستحق على العضو يجب تحصيله لاحقاً.`}
                </span>
              </div>
              <div className="font-bold">
                حالة الرصيد المتبقي:{' '}
                <span
                  className={cn(
                    'font-black',
                    remainingAmount === 0 ? 'text-emerald-700' : 'text-amber-800'
                  )}
                >
                  {remainingAmount.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 5: طريقة الدفع المعتمدة (V1) */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-gym-gold" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-zinc-900">
                    طريقة الدفع المعتمدة (V1)
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    الخيارات المتاحة حالياً للمدفوعات المباشرة
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                نقدي أو محفظة فقط
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cash Option */}
              <div
                onClick={() => setPaymentMethod('CASH')}
                className={cn(
                  'p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between',
                  paymentMethod === 'CASH'
                    ? 'border-gym-gold bg-amber-50/20'
                    : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                    <Receipt className="w-5 h-5 text-gym-gold-dark" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">نقدي (كاش)</h4>
                    <p className="text-[11px] text-zinc-500">استلام المبلغ يدوياً في الخزينة</p>
                  </div>
                </div>
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border flex items-center justify-center',
                    paymentMethod === 'CASH'
                      ? 'border-gym-gold bg-gym-gold text-zinc-950'
                      : 'border-zinc-300 bg-white'
                  )}
                >
                  {paymentMethod === 'CASH' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>

              {/* E-Wallet Option */}
              <div
                onClick={() => setPaymentMethod('E_WALLET')}
                className={cn(
                  'p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between',
                  paymentMethod === 'E_WALLET'
                    ? 'border-gym-gold bg-amber-50/20'
                    : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                    <Wallet className="w-5 h-5 text-gym-gold-dark" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">محفظة إلكترونية</h4>
                    <p className="text-[11px] text-zinc-500">فودافون كاش / إنستاباي (InstaPay)</p>
                  </div>
                </div>
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border flex items-center justify-center',
                    paymentMethod === 'E_WALLET'
                      ? 'border-gym-gold bg-gym-gold text-zinc-950'
                      : 'border-zinc-300 bg-white'
                  )}
                >
                  {paymentMethod === 'E_WALLET' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 6: ملاحظات إضافية */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center">
                <FileText className="w-4 h-4 text-gym-gold" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-zinc-900">ملاحظات إضافية</h3>
                <p className="text-[11px] text-zinc-500">
                  أضف أي تفاصيل صحية أو توصيات تدريبية أو جهة إحالة
                </p>
              </div>
            </div>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف أي ملاحظات خاصة بالعضو (حالة صحية، هدف تدريبي كبناء عضلات أو تخسيس، إحالة صديق...)"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Bottom Actions Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/app/members')}
              className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-bold text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              إلغاء
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSaveMember(true)}
                disabled={isSaving}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-zinc-900 bg-zinc-900 text-white text-xs sm:text-sm font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                + حفظ وإضافة عضو آخر
              </button>

              <button
                type="button"
                onClick={() => handleSaveMember(false)}
                disabled={isSaving}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gym-gold hover:bg-gym-gold-light text-zinc-950 text-xs sm:text-sm font-black transition-all shadow-xs active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>حفظ العضو</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: Sticky Registration Summary Sidebar (4 Cols on Desktop) */}
        <div className="lg:col-span-4 space-y-4 order-1 lg:order-2 lg:sticky lg:top-4">
          {/* Black Card: ملخص التسجيل الفوري */}
          <div className="bg-zinc-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-zinc-800 space-y-5">
            {/* Header with Gold dot */}
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/80">
              <span className="w-2.5 h-2.5 rounded-full bg-gym-gold animate-pulse" />
              <h3 className="text-sm font-black tracking-wide text-zinc-100">ملخص التسجيل الفوري</h3>
            </div>

            {/* Member Identity Strip */}
            <div className="bg-zinc-900/90 rounded-2xl p-3.5 border border-zinc-800 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="صورة العضو" className="w-full h-full object-cover" />
                ) : (
                  <span>{fullName ? fullName.slice(0, 2) : 'ع ج'}</span>
                )}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-white truncate">
                  {fullName || 'الاسم غير مدخل بعد'}
                </h4>
                <p className="text-[11px] font-mono text-zinc-400 mt-0.5 dir-ltr text-right">
                  {phone ? `+20 ${phone}` : '—'}
                </p>
              </div>
            </div>

            {/* Summary Details */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>نوع الخطة المحددة:</span>
                <span className="font-bold text-zinc-200">
                  {currentPlan.name} ({currentPlan.durationDays} يوم)
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-400">
                <span>تاريخ بدء الصلاحية:</span>
                <span className="font-mono text-zinc-300">{startDate}</span>
              </div>

              <div className="flex items-center justify-between text-zinc-400">
                <span>تاريخ انتهاء الصلاحية:</span>
                <span className="font-mono text-zinc-300">{calculatedEndDate}</span>
              </div>

              <div className="flex items-center justify-between text-zinc-400">
                <span>طريقة السداد:</span>
                <span className="font-bold text-zinc-200">
                  {paymentMethod === 'CASH' ? 'نقدي (كاش)' : 'محفظة إلكترونية'}
                </span>
              </div>
            </div>

            <div className="border-t border-zinc-800/80 pt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>السعر الإجمالي:</span>
                <span className="font-mono text-zinc-300">{totalPrice.toLocaleString('ar-EG')} ج.م</span>
              </div>

              {discount > 0 && (
                <div className="flex items-center justify-between text-emerald-400">
                  <span>قيمة الخصم المعتمد:</span>
                  <span className="font-mono">-{discount.toLocaleString('ar-EG')} ج.م</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm font-black pt-1 text-white border-t border-zinc-800">
                <span className="text-white">المطلوب سداده:</span>
                <span className="text-base text-white">
                  {finalPrice.toLocaleString('ar-EG')} ج.م
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-300 text-xs">
                <span>المحصل حالياً:</span>
                <span className="font-mono text-white font-bold">
                  {paidAmount.toLocaleString('ar-EG')} ج.م
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">المتبقي المطلوب:</span>
                <span
                  className={cn(
                    'font-bold font-mono',
                    remainingAmount === 0 ? 'text-emerald-400' : 'text-amber-400'
                  )}
                >
                  {remainingAmount.toLocaleString('ar-EG')} ج.م{' '}
                  {remainingAmount === 0 ? '(خالص بالكامل)' : ''}
                </span>
              </div>
            </div>

            {/* Status tag */}
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                جاهز للحفظ وتفعيل العضوية
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => handleSaveMember(false)}
              disabled={isSaving}
              className="w-full py-3 rounded-2xl bg-gym-gold hover:bg-gym-gold-light text-zinc-950 font-black text-xs sm:text-sm transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>تأكيد وتسجيل العضوية</span>
                </>
              )}
            </button>
          </div>

          {/* Reception Desk Note */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <Info className="w-4 h-4 text-gym-gold-dark shrink-0" />
              <span>ملاحظة موظف الاستقبال</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              بمجرد الحفظ على خطة العضو، يتم إصدار كود العضوية GYM فوراً وتفعيل بصمة الدخول وإرسال رسالة ترحيب عبر واتساب.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL: Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-zinc-900 text-center mb-1.5">
              تنبيه: توجد بيانات غير محفوظة
            </h3>
            <p className="text-xs text-zinc-500 text-center leading-relaxed mb-6">
              لديك بيانات مدخلة في نموذج تسجيل العضو الجديد لم يتم حفظها بعد. هل تريد مغادرة الصفحة وإلغاء التسجيل؟
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-colors"
              >
                البقاء ومتابعة التسجيل
              </button>
              <button
                onClick={() => navigate('/app/members')}
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

function UserCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  )
}

export default MemberCreatePage
