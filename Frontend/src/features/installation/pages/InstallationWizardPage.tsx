import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  BellRing,
  PauseCircle,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Upload,
  Trash2,
  Check,
  Key,
  Database,
  Lock,
  Copy,
  Send,
  ArrowRight,
  Shield,
  FileCheck,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getInstallationWizardData,
  completeInstallationSetup,
  type WizardDataDto,
  type CompleteSetupInput,
} from '../services/installationApi'
import { useLicense } from '../../license/hooks/useLicense'
import { useBackups } from '../../backups/hooks/useBackups'
import { notifySuccess, notifyError } from '../../../lib/sweetAlert'
import { useAuth } from '../../auth/context/AuthContext'

interface StepDef {
  number: number
  title: string
  subtitle: string
  icon: React.ElementType
}

const WIZARD_STEPS: StepDef[] = [
  { number: 1, title: 'الترحيب والبدء', subtitle: 'نظرة عامة على معالج الإعداد', icon: ShieldCheck },
  { number: 2, title: 'بيانات الجيم', subtitle: 'الشعار والاسم والعنوان', icon: Building2 },
  { number: 3, title: 'تنبيهات الاشتراكات', subtitle: 'جدولة التنبيهات المسبقة', icon: BellRing },
  { number: 4, title: 'سياسة التجميد', subtitle: 'ضوابط تجميد العضويات', icon: PauseCircle },
  { number: 5, title: 'إعدادات الحضور', subtitle: 'قواعد تسجيل الدخول والخروج', icon: UserCheck },
  { number: 6, title: 'إعدادات النظام', subtitle: 'العملة والمنطقة الزمنية', icon: Shield },
  { number: 7, title: 'ترخيص النظام', subtitle: 'بصمة الجهاز وكود الترخيص', icon: Key },
  { number: 8, title: 'النسخ الاحتياطي', subtitle: 'قاعدة بيانات SQLite المحلية', icon: Database },
  { number: 9, title: 'مراجعة الإعدادات', subtitle: 'التدقيق النهائي للبيانات', icon: FileCheck },
  { number: 10, title: 'اكتمال التثبيت', subtitle: 'تشغيل المنظومة بنجاح', icon: CheckCircle2 },
]

export const InstallationWizardPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { updateGymData } = useAuth()
  const { activate, isActivating, license: liveLicense } = useLicense()
  const { backups, createBackup, isCreating: isBackupCreating } = useBackups()

  // Wizard Navigation State
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const saved = localStorage.getItem('gymvip_wizard_step')
    return saved ? parseInt(saved, 10) : 1
  })

  // Form Fields State
  const [gymName, setGymName] = useState('')
  const [branchName, setBranchName] = useState('المركز الرئيسي')
  const [gymSlug, setGymSlug] = useState('gymvip-main')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [logo, setLogo] = useState('')

  // Notifications State
  const [subscriptionReminderEnabled, setSubscriptionReminderEnabled] = useState(true)
  const [subscriptionReminderDays, setSubscriptionReminderDays] = useState<number[]>([7, 3, 1])

  // Freeze Policy State
  const [subscriptionFreezeEnabled, setSubscriptionFreezeEnabled] = useState(true)
  const [maxFreezeDays, setMaxFreezeDays] = useState<number>(90)
  const [allowedFreezeDurations, setAllowedFreezeDurations] = useState<number[]>([3, 7, 15, 30])

  // Attendance State
  const [attendanceEnabled, setAttendanceEnabled] = useState(true)
  const [allowManualCheckout, setAllowManualCheckout] = useState(true)
  const [preventExpiredAttendance, setPreventExpiredAttendance] = useState(true)
  const [preventDuplicateAttendance, setPreventDuplicateAttendance] = useState(true)

  // License Input State
  const [licenseKeyInput, setLicenseKeyInput] = useState('')
  const [copiedMachineId, setCopiedMachineId] = useState(false)

  // Auto-backup Settings State
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true)

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({})
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Fetch initial wizard data
  const { data: wizardData, isLoading: isDataLoading } = useQuery<WizardDataDto>({
    queryKey: ['installation-wizard-data'],
    queryFn: getInstallationWizardData,
    staleTime: 1000 * 60 * 5,
  })

  // Prefill form from existing gym record if available
  useEffect(() => {
    if (wizardData?.gym) {
      const g = wizardData.gym
      if (g.name && !gymName) setGymName(g.name)
      if (g.slug) setGymSlug(g.slug)
      if (g.phone && !phone) setPhone(g.phone)
      if (g.email && !email) setEmail(g.email)
      if (g.city && !city) setCity(g.city)
      if (g.address && !address) setAddress(g.address)
      if (g.logo && !logo) setLogo(g.logo)
      if (g.subscriptionReminderEnabled !== undefined) setSubscriptionReminderEnabled(g.subscriptionReminderEnabled)
      if (g.subscriptionReminderDays) setSubscriptionReminderDays(g.subscriptionReminderDays)
      if (g.subscriptionFreezeEnabled !== undefined) setSubscriptionFreezeEnabled(g.subscriptionFreezeEnabled)
      if (g.allowedFreezeDurations) setAllowedFreezeDurations(g.allowedFreezeDurations)
      if (g.maxFreezeDays) setMaxFreezeDays(g.maxFreezeDays)
      if (g.allowManualCheckout !== undefined) setAllowManualCheckout(g.allowManualCheckout)
    }
  }, [wizardData])

  // Sync step changes to localStorage
  useEffect(() => {
    localStorage.setItem('gymvip_wizard_step', currentStep.toString())
  }, [currentStep])

  const machineId = wizardData?.machineId || liveLicense?.machineId || 'جاري استخراج كود الجهاز...'
  const isLicenseActivated = liveLicense?.isActivated || wizardData?.license?.isActivated || false

  // License Key format validation
  const licenseValidation = useMemo(() => {
    const trimmed = licenseKeyInput.trim().replace(/^[`"']+|[`"']+$/g, '').trim()
    if (!trimmed) {
      return { isValid: false, message: 'الصيغة المعتمدة: يبدأ بـ GVLIC- متبوعاً بالتوقيع الرقمي', type: 'neutral' }
    }
    if (!trimmed.startsWith('GVLIC-')) {
      return { isValid: false, message: 'تنبيه: يجب أن يبدأ الكود بـ GVLIC-', type: 'error' }
    }
    const token = trimmed.slice(6)
    if (!token.includes('.') || token.length < 80) {
      return { isValid: false, message: 'تنبيه: الكود ناقص أو غير مكتمل التوقيع', type: 'error' }
    }
    return { isValid: true, message: 'صيغة الكود مكتملة ومطابقة للمواصفات ✓', type: 'success' }
  }, [licenseKeyInput])

  // Step Validation logic
  const validateCurrentStep = (step: number): boolean => {
    const errs: Record<string, string> = {}

    if (step === 2) {
      if (!gymName.trim()) {
        errs.gymName = 'اسم الجيم إجباري ولا يمكن تركه فارغاً'
      } else if (gymName.trim().length < 2) {
        errs.gymName = 'يجب أن يتكون اسم الجيم من حرفين على الأقل'
      }
      if (phone && !/^01[0125][0-9]{8}$/.test(phone.trim())) {
        errs.phone = 'يرجى إدخال رقم هاتف مصري صحيح (11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015)'
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errs.email = 'صيغة البريد الإلكتروني غير صحيحة'
      }
    }

    if (step === 3 && subscriptionReminderEnabled && subscriptionReminderDays.length === 0) {
      errs.reminders = 'يرجى تحديد موعد تذكير واحد على الأقل قبل الانتهاء'
    }

    if (step === 4 && subscriptionFreezeEnabled && allowedFreezeDurations.length === 0) {
      errs.freeze = 'يرجى اختيار مدة تجميد واحدة على الأقل'
    }

    if (step === 7 && !isLicenseActivated) {
      errs.license = 'يجب تفعيل كود ترخيص النظام بنجاح للمتابعة إلى الخطوات التالية'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNext = () => {
    if (validateCurrentStep(currentStep)) {
      setErrors({})
      setCurrentStep((prev) => Math.min(prev + 1, 10))
    }
  }

  const handleBack = () => {
    setErrors({})
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleCopyMachineId = () => {
    if (machineId) {
      navigator.clipboard.writeText(machineId)
      setCopiedMachineId(true)
      notifySuccess('تم النسخ!', 'تم نسخ كود الجهاز الفريد (Machine ID) إلى الحافظة.')
      setTimeout(() => setCopiedMachineId(false), 2500)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notifyError('نوع الملف غير صالح', 'يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      notifyError('حجم الصورة كبير جداً', 'الحد الأقصى لحجم الشعار هو 2 ميجابايت')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setLogo(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault()
    const sanitized = licenseKeyInput.trim().replace(/^[`"']+|[`"']+$/g, '').trim()
    if (!sanitized) return

    try {
      await activate(sanitized)
      setLicenseKeyInput('')
      queryClient.invalidateQueries({ queryKey: ['installation-wizard-data'] })
      notifySuccess('تم تفعيل الترخيص!', 'تم التحقق من التوقيع الرقمي وتفعيل رخصة النظام بنجاح.')
    } catch {
      // Error handled by mutation hook
    }
  }

  const toggleReminderDay = (day: number) => {
    setSubscriptionReminderDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const toggleFreezeDuration = (dur: number) => {
    setAllowedFreezeDurations((prev) =>
      prev.includes(dur) ? prev.filter((d) => d !== dur) : [...prev, dur]
    )
  }

  // Complete Setup Mutation
  const completeMutation = useMutation({
    mutationFn: (data: CompleteSetupInput) => completeInstallationSetup(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['installation-status'] })
      queryClient.invalidateQueries({ queryKey: ['gym-profile'] })
      localStorage.removeItem('gymvip_wizard_step')
      updateGymData(res.gym)
      notifySuccess('تم اكتمال التثبيت بنجاح!', 'تم حفظ كافة الإعدادات والسياسات وتفعيل النظام.')
      setCurrentStep(10)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'تعذر استكمال التثبيت'
      notifyError('خطأ أثناء إكمال التثبيت', msg)
    },
  })

  const handleFinalSubmit = () => {
    if (!isLicenseActivated) {
      notifyError('الترخيص غير مفعل', 'يجب تفعيل كود الترخيص في الخطوة 7 قبل تأكيد التثبيت النهائي.')
      setCurrentStep(7)
      return
    }

    completeMutation.mutate({
      name: gymName.trim(),
      branchName: branchName.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      city: city.trim() || undefined,
      address: address.trim() || undefined,
      logo: logo || undefined,
      subscriptionReminderEnabled,
      subscriptionReminderDays,
      subscriptionFreezeEnabled,
      allowedFreezeDurations,
      maxFreezeDays,
      allowManualCheckout,
    })
  }

  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center font-cairo">
        <div className="w-8 h-8 border-3 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mb-3" />
        <span className="text-xs text-zinc-400">جاري تحميل بيانات معالج التثبيت والإعداد الأولي...</span>
      </div>
    )
  }

  const whatsappMessage = encodeURIComponent(
    `مرحباً، أود تفعيل نسخة برنامج GymVIP الخاصة بي.\nكود الجهاز الخاص بي هو: ${machineId}`
  )
  const whatsappUrl = `https://wa.me/201012345678?text=${whatsappMessage}`

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full bg-[#000000] text-white flex flex-col font-cairo selection:bg-[#D4AF37] selection:text-black"
    >
      {/* Top Header Bar */}
      <header className="border-b border-zinc-800 bg-[#0B0B0B]/80 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">
            GV
          </div>
          <div>
            <h1 className="text-sm font-black text-white">GymVIP — معالج التثبيت والإعداد الأولي</h1>
            <p className="text-[11px] text-zinc-400">التهيئة التجارية الشاملة للمنظومة قبل أول تشغيل</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
            الخطوة {currentStep} من {WIZARD_STEPS.length}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
        
        {/* Progress Bar & Steps Tabs */}
        <div className="mb-8">
          {/* Linear Progress */}
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-[#D4AF37] transition-all duration-300"
              style={{ width: `${(currentStep / WIZARD_STEPS.length) * 100}%` }}
            />
          </div>

          {/* Stepper Tabs Bar (Scrollable on small screens) */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2 scrollbar-none">
            {WIZARD_STEPS.map((s) => {
              const Icon = s.icon
              const isDone = currentStep > s.number
              const isCurrent = currentStep === s.number

              return (
                <button
                  key={s.number}
                  type="button"
                  onClick={() => {
                    if (s.number < currentStep || isLicenseActivated) {
                      setCurrentStep(s.number)
                    }
                  }}
                  className={`flex flex-col items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all shrink-0 text-center ${
                    isCurrent
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                      : isDone
                      ? 'text-emerald-400 hover:bg-zinc-900 cursor-pointer'
                      : 'text-zinc-500 opacity-60'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isCurrent
                        ? 'bg-[#D4AF37] text-black font-extrabold'
                        : isDone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-zinc-900 border border-zinc-800'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-[11px] font-semibold whitespace-nowrap">{s.title}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step Body Card */}
        <div className="bg-[#0B0B0B] border border-zinc-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl relative mb-8">
          
          {/* STEP 1: WELCOME SCREEN */}
          {currentStep === 1 && (
            <div className="space-y-6 text-center max-w-2xl mx-auto py-4">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-xl shadow-amber-500/10">
                <ShieldCheck className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  أهلاً بك في منظومة GymVIP لإدارة الأندية الرياضية
                </h2>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  هذا المعالج سيرشدك خطوة بخطوة لتهيئة وتثبيت البرنامج بشكل مستقل ومكتمل. سيتم ضبط بيانات النادي، سياسات التجميد، تنبيهات الاشتراكات، وقواعد الحضور، وتفعيل ترخيص النظام، وتأكيد النسخ الاحتياطي لقاعدة بيانات SQLite المحلية.
                </p>
              </div>

              {/* Machine ID Banner */}
              <div className="p-4 rounded-2xl bg-[#000000] border border-zinc-800 text-right space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    بصمة هذا الجهاز المعتمدة (Machine ID):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMachineId}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedMachineId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedMachineId ? 'تم النسخ' : 'نسخ الكود'}
                  </button>
                </div>
                <div className="bg-[#0B0B0B] border border-zinc-800 rounded-xl px-4 py-2.5 text-center font-mono font-extrabold text-amber-300 text-sm">
                  {machineId}
                </div>
                <p className="text-[11px] text-zinc-500 text-center">
                  النظام سيعمل محلياً بصورة كاملة بدون الحاجة لاتصال إنترنت دائم بعد إتمام التفعيل.
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-8 py-3.5 rounded-2xl bg-[#D4AF37] hover:bg-[#C29F2F] text-black font-black text-sm shadow-xl shadow-[#D4AF37]/25 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <span>بدء إعداد وتثبيت النظام</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: GYM INFORMATION */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  بيانات وهوية النادي الرياضي (Gym Information)
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  البيانات الرسمية التي تظهر على الفواتير، الإيصالات، والتقارير المالية الصادرة للمشتركين.
                </p>
              </div>

              {/* Logo Upload Card */}
              <div className="bg-[#000000] border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5">
                <div className="w-24 h-24 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center p-2 shrink-0 relative overflow-hidden">
                  {logo ? (
                    <img src={logo} alt="Gym Logo" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center">
                      <span className="text-[#D4AF37] text-xl font-black block">VIP</span>
                      <span className="text-[9px] text-zinc-500 tracking-wider">LOGO</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-right w-full">
                  <h4 className="text-xs font-bold text-white">شعار الجيم (Logo)</h4>
                  <p className="text-[11px] text-zinc-400">
                    ارفع صورة شعار النادي ليظهر في القائمة الجانبية وإيصالات الحضور والاشتراك.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      رفع شعار من الجهاز
                    </button>
                    {logo && (
                      <button
                        type="button"
                        onClick={() => setLogo('')}
                        className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        إزالة الشعار
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gym Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">
                    اسم الجيم <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={gymName}
                    onChange={(e) => {
                      setGymName(e.target.value)
                      if (errors.gymName) setErrors((prev) => ({ ...prev, gymName: '' }))
                    }}
                    placeholder="مثال: نادي في أي بي الرياضي"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-zinc-800 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                  {errors.gymName && <p className="text-rose-400 text-xs mt-1">{errors.gymName}</p>}
                </div>

                {/* Branch Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">اسم الفرع</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="مثال: فرع القاهرة الرئيسي"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-zinc-800 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">رقم الهاتف الرسمي</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }))
                    }}
                    placeholder="01012345678"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-zinc-800 text-sm text-white text-right focus:outline-none focus:border-amber-400"
                  />
                  {errors.phone && <p className="text-rose-400 text-xs mt-1">{errors.phone}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">البريد الإلكتروني الرسمي</label>
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }))
                    }}
                    placeholder="info@gymvip.eg"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-zinc-800 text-sm text-white text-right focus:outline-none focus:border-amber-400"
                  />
                  {errors.email && <p className="text-rose-400 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* City */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">المدينة</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="مثال: القاهرة"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-zinc-800 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">العنوان الجغرافي</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="مثال: شارع النصر، المعادي"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#000000] border border-zinc-800 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Gym Slug / Identifier */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-zinc-300 block">
                    معرف النادي المعتمد (Gym ID / Slug)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    disabled
                    value={gymSlug}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono text-amber-400 select-all"
                  />
                  <p className="text-[11px] text-zinc-500">
                    معرف ثابت فريد لعزل كافة بيانات الفرع وسجلاته تلقائياً لضمان أعلى معايير الخصوصية والأمان.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUBSCRIPTION NOTIFICATIONS */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-amber-400" />
                  إعدادات تنبيهات الاشتراكات (Subscription Notifications)
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  إشعارات داخلية تلقائية لموظفي الاستقبال والإدارة للتنبيه بالاشتراكات التي أوشكت على الانتهاء.
                </p>
              </div>

              {/* Master Toggle */}
              <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">تفعيل التنبيه المسبق باقتراب انتهاء الاشتراك</div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    إظهار إشعارات عند تسجيل حضور العضو أو في لوحة التحكم قبل موعد نهاية اشتراكه
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={subscriptionReminderEnabled}
                  onChange={(e) => setSubscriptionReminderEnabled(e.target.checked)}
                  className="w-5 h-5 accent-[#D4AF37] rounded cursor-pointer"
                />
              </div>

              {/* Reminder offsets */}
              <div
                className={`space-y-3 transition-opacity ${
                  subscriptionReminderEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
                }`}
              >
                <label className="text-xs font-bold text-zinc-300 block">
                  مواعيد التنبيه قبل الانتهاء (حدد الأيام المناسبة):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { day: 7, label: 'قبل 7 أيام (أسبوع)' },
                    { day: 3, label: 'قبل 3 أيام' },
                    { day: 1, label: 'قبل يوم واحد (غداً)' },
                  ].map((item) => {
                    const isSelected = subscriptionReminderDays.includes(item.day)
                    return (
                      <button
                        key={item.day}
                        type="button"
                        onClick={() => toggleReminderDay(item.day)}
                        className={`p-3.5 rounded-xl border text-center font-bold text-xs transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm'
                            : 'bg-[#000000] text-zinc-400 border-zinc-800 hover:bg-zinc-900'
                        }`}
                      >
                        <span>{item.label}</span>
                        <span
                          className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                            isSelected ? 'bg-[#D4AF37] text-black font-black' : 'border border-zinc-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {errors.reminders && <p className="text-rose-400 text-xs mt-1">{errors.reminders}</p>}
              </div>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl text-xs text-zinc-400 space-y-1.5 leading-relaxed">
                <div className="font-bold text-zinc-200">التنبيهات المعتمدة في دورة حياة الاشتراك:</div>
                <div>• تنبيه فوري عند انتهاء صلاحية الاشتراك لمنع الدخول بدون تجديد.</div>
                <div>• تنبيه عند نجاح تجديد العضوية وتمديد المدة.</div>
                <div>• تنبيه عند وجود مدفوعات معلقة أو اشتراكات مجمدة.</div>
              </div>
            </div>
          )}

          {/* STEP 4: SUBSCRIPTION FREEZE POLICY */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <PauseCircle className="w-5 h-5 text-amber-400" />
                  سياسة تجميد الاشتراكات (Subscription Freeze Policy)
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  الضوابط والمدد المسموح بها للاستقبال عند إيقاف اشتراك العضو مؤقتاً لتفادي التلاعب.
                </p>
              </div>

              {/* Master Freeze Toggle */}
              <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">السماح بتجميد الاشتراكات للأعضاء (Freeze)</div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    إتاحة إيقاف سريان الاشتراك مؤقتاً وتمديد تاريخ الانتهاء تلقائياً بعدد أيام التجميد
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={subscriptionFreezeEnabled}
                  onChange={(e) => setSubscriptionFreezeEnabled(e.target.checked)}
                  className="w-5 h-5 accent-[#D4AF37] rounded cursor-pointer"
                />
              </div>

              <div
                className={`space-y-5 transition-opacity ${
                  subscriptionFreezeEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
                }`}
              >
                {/* Max Freeze Days */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">
                    الحد الأقصى للتجميد في المرة الواحدة (بالأيام)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={maxFreezeDays}
                    onChange={(e) => setMaxFreezeDays(parseInt(e.target.value, 10) || 30)}
                    className="w-full sm:w-48 px-3.5 py-2.5 rounded-xl bg-[#000000] border border-zinc-800 text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[11px] text-zinc-500">الحد الأقصى المسموح به هو 90 يوماً.</p>
                </div>

                {/* Allowed Durations */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 block">
                    خيارات المدد المتاحة للاستقبال عند طلب التجميد:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[3, 7, 15, 30, 45, 60].map((dur) => {
                      const isSelected = allowedFreezeDurations.includes(dur)
                      const isOver = dur > maxFreezeDays
                      return (
                        <button
                          key={dur}
                          type="button"
                          disabled={isOver}
                          onClick={() => toggleFreezeDuration(dur)}
                          className={`p-3 rounded-xl border text-center font-bold text-xs transition flex items-center justify-between cursor-pointer ${
                            isOver
                              ? 'opacity-30 cursor-not-allowed border-zinc-800 bg-[#000000] text-zinc-600'
                              : isSelected
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm'
                              : 'bg-[#000000] text-zinc-400 border-zinc-800 hover:bg-zinc-900'
                          }`}
                        >
                          <span>{dur} يوم</span>
                          <span
                            className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                              isSelected ? 'bg-[#D4AF37] text-black font-black' : 'border border-zinc-700'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {errors.freeze && <p className="text-rose-400 text-xs mt-1">{errors.freeze}</p>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: ATTENDANCE SETTINGS */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-400" />
                  إعدادات تسجيل الحضور والانصراف (Attendance Settings)
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  ضوابط بوابات الدخول ومكتب الاستقبال لتسجيل دخول الأعضاء والتحقق من صلاحية الاشتراك.
                </p>
              </div>

              <div className="space-y-3">
                {/* Active Attendance Toggle */}
                <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">تفعيل نظام تسجيل الحضور اليومي</div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      تسجيل مرات الدخول وحساب عدد الجلسات وكثافة المتدربين داخل الصالة الرياضية
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={attendanceEnabled}
                    onChange={(e) => setAttendanceEnabled(e.target.checked)}
                    className="w-5 h-5 accent-[#D4AF37] rounded cursor-pointer"
                  />
                </div>

                {/* Manual Checkout Toggle */}
                <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">السماح بتسجيل الانصراف اليدوي (Check-out)</div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      تمكين موظف الاستقبال من إغلاق جلسة التدريب وحساب مدة مكوث العضو في الصالة
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowManualCheckout}
                    onChange={(e) => setAllowManualCheckout(e.target.checked)}
                    className="w-5 h-5 accent-[#D4AF37] rounded cursor-pointer"
                  />
                </div>

                {/* Prevent Expired Attendance */}
                <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">منع تسجيل حضور العضو صاحب الاشتراك المنتهي</div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      حظر تسجيل الدخول تلقائياً مع إصدار تنبيه صوتي ومرئي للاستقبال بضرورة التجديد
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preventExpiredAttendance}
                    onChange={(e) => setPreventExpiredAttendance(e.target.checked)}
                    className="w-5 h-5 accent-[#D4AF37] rounded cursor-pointer"
                  />
                </div>

                {/* Prevent Duplicate Attendance */}
                <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">منع تسجيل حضور مكرر أثناء وجود جلسة مفتوحة</div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      حماية من تمرير الكود أو الباركود لأكثر من شخص في نفس الوقت
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preventDuplicateAttendance}
                    onChange={(e) => setPreventDuplicateAttendance(e.target.checked)}
                    className="w-5 h-5 accent-[#D4AF37] rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: SYSTEM PREFERENCES */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  إعدادات النظام والبيئة التشغيلية (System Settings)
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  المعايير القياسية المعتمدة لمنظومة GymVIP للإصدار التجاري V1 في جمهورية مصر العربية.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Currency */}
                <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400">العملة الرسمية المعتمدة</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      ثابت (V1)
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 pt-1">
                    <Banknote className="w-5 h-5 text-amber-400" />
                    <span className="text-base font-black text-white">ج.م (الجنيه المصري — EGP)</span>
                  </div>
                </div>

                {/* Timezone */}
                <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400">المنطقة الزمنية الرسمية</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      مصر
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 pt-1">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <span className="text-base font-black text-white">توقيت القاهرة (Africa/Cairo)</span>
                  </div>
                </div>

                {/* Language */}
                <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-zinc-400">لغة واجهة النظام</span>
                  <div className="text-sm font-bold text-white pt-1">اللغة العربية (مع اتجاه RTL كامل)</div>
                </div>

                {/* Date Format */}
                <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-zinc-400">تنسيق التاريخ والوقت</span>
                  <div className="text-sm font-bold text-white pt-1">يوم / شهر / سنة (توقيت 12 ساعة)</div>
                </div>
              </div>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl text-xs text-zinc-400 leading-relaxed">
                هذه المعايير مضبوطة تلقائياً للتوافق الدقيق مع اللوائح المالية والضريبية وساعات العمل في الصالات الرياضية داخل جمهورية مصر العربية.
              </div>
            </div>
          )}

          {/* STEP 7: SYSTEM LICENSE ACTIVATION */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-amber-400" />
                    تفعيل ترخيص النظام (System License Activation)
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      isLicenseActivated
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {isLicenseActivated ? 'مرخص ومفعل ✓' : 'غير مفعل (مطلوب الكود)'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  التحقق من بصمة الجهاز الفريدة وإدخال كود الترخيص المشفر الرقمي لفك قفل المنظومة.
                </p>
              </div>

              {/* Machine ID Display */}
              <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    بصمة جهازك الفريدة (Machine ID):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMachineId}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedMachineId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedMachineId ? 'تم النسخ' : 'نسخ الكود'}
                  </button>
                </div>
                <div className="bg-[#0B0B0B] border border-zinc-800 rounded-xl px-4 py-2.5 text-center font-mono font-extrabold text-amber-300 text-sm">
                  {machineId}
                </div>
              </div>

              {/* WhatsApp Request Link */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-bold transition cursor-pointer"
              >
                <Send className="w-4 h-4 text-emerald-400" />
                مراسلة الدعم والترخيص عبر واتساب لطلب كود التفعيل
              </a>

              {/* License Activation Form or Success Card */}
              {isLicenseActivated ? (
                <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3 text-right">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    تم تفعيل رخصة هذا الجهاز بنجاح!
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="bg-[#000000] p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">باقة الترخيص</span>
                      <span className="font-bold text-amber-400 font-mono">{liveLicense?.tier || 'PRO'}</span>
                    </div>
                    <div className="bg-[#000000] p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">سعة الأعضاء</span>
                      <span className="font-bold text-white">{liveLicense?.maxMembers || 500} عضو</span>
                    </div>
                    <div className="bg-[#000000] p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">حالة الصلاحية</span>
                      <span className="font-bold text-emerald-400">سارية ومقيدة بالعتاد</span>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleActivateLicense} className="space-y-3">
                  <label className="text-xs font-bold text-zinc-300 block">
                    أدخل كود التفعيل المستلم (License Key):
                  </label>
                  <textarea
                    rows={3}
                    dir="ltr"
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    placeholder="GVLIC-eyJsaWNlbnNl..."
                    className="w-full p-3 rounded-xl bg-[#000000] text-xs font-mono text-zinc-100 placeholder:text-zinc-600 border border-zinc-800 focus:outline-none focus:border-amber-400 resize-none"
                  />
                  
                  <div className="flex items-center justify-between text-[11px]">
                    {licenseValidation.type === 'success' ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {licenseValidation.message}
                      </span>
                    ) : licenseValidation.type === 'error' ? (
                      <span className="text-rose-400 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {licenseValidation.message}
                      </span>
                    ) : (
                      <span className="text-zinc-500">{licenseValidation.message}</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isActivating || !licenseValidation.isValid}
                    className={`w-full py-3.5 px-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${
                      !licenseValidation.isValid || isActivating
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-[#D4AF37] hover:bg-[#C29F2F] text-black shadow-lg shadow-[#D4AF37]/25 cursor-pointer active:scale-[0.99]'
                    }`}
                  >
                    {isActivating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        جاري فك التشفير والتحقق من التوقيع الرقمي...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        تفعيل رخصة هذا الجهاز الآن
                      </>
                    )}
                  </button>
                </form>
              )}

              {errors.license && <p className="text-rose-400 text-xs">{errors.license}</p>}
            </div>
          )}

          {/* STEP 8: DATABASE BACKUP SETTINGS */}
          {currentStep === 8 && (
            <div className="space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-400" />
                  إعدادات النسخ الاحتياطي لقاعدة البيانات (SQLite Backups)
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  قاعدة بيانات SQLite المحلية تعمل بدون سيرفرات خارجية، مع جدولة نسخ احتياطي تلقائي لحماية بيانات النادي.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Engine Card */}
                <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400">محرك قاعدة البيانات</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      SQLite مدمج
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white">
                    الملف المحلي: <span className="font-mono text-amber-300">gymvip.db</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    يعمل ذاتياً بدون الحاجة لتثبيت برامج خوادم خارجية مثل MySQL أو XAMPP.
                  </p>
                </div>

                {/* Auto Backup Card */}
                <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400">النسخ الاحتياطي التلقائي</span>
                    <input
                      type="checkbox"
                      checked={autoBackupEnabled}
                      onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                      className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                    />
                  </div>
                  <div className="text-sm font-semibold text-white">
                    الحالة: <span className="text-amber-300 font-bold">{autoBackupEnabled ? 'مفعل يومياً (الساعة 02:00 ص)' : 'معطل'}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    يتم حفظ النسخ الاحتياطية في مجلد <code className="font-mono text-zinc-400">./backups</code> مع الاحتفاظ بآخر 30 نسخة.
                  </p>
                </div>
              </div>

              {/* Action Box to trigger initial backup */}
              <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white">النسخ الاحتياطية المتوفرة حالياً: ({backups.length})</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    يمكنك إنشاء نسخة احتياطية أولية فورية قبل بدء العمل بالنظام للتأكد من سلامة المحرك.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => createBackup()}
                  disabled={isBackupCreating}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isBackupCreating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري إنشاء النسخة...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 text-amber-400" />
                      إنشاء نسخة احتياطية أولية الآن
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 9: REVIEW CONFIGURATION */}
          {currentStep === 9 && (
            <div className="space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-amber-400" />
                  مراجعة وتأكيد كافة الإعدادات (Review Configuration)
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  يرجى التأكد من صحة كافة بيانات وإعدادات النادي والترخيص قبل الاعتماد والتشغيل النهائي.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gym Info Summary */}
                <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-400" />
                      بيانات النادي
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                    >
                      تعديل
                    </button>
                  </div>
                  <div className="text-xs space-y-1 text-zinc-300">
                    <div>اسم الجيم: <span className="font-bold text-white">{gymName || 'لم يحدد'}</span></div>
                    <div>الفرع: <span className="font-bold text-white">{branchName}</span></div>
                    <div>الهاتف: <span className="font-bold text-white">{phone || 'غير مسجل'}</span></div>
                    <div>المدينة: <span className="font-bold text-white">{city || 'غير مسجل'}</span></div>
                  </div>
                </div>

                {/* Notifications & Freeze Summary */}
                <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <PauseCircle className="w-4 h-4 text-amber-400" />
                      السياسات والتنبيهات
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                    >
                      تعديل
                    </button>
                  </div>
                  <div className="text-xs space-y-1 text-zinc-300">
                    <div>تنبيه الانتهاء: <span className="font-bold text-emerald-400">{subscriptionReminderEnabled ? 'مفعل' : 'معطل'}</span></div>
                    <div>أيام التذكير: <span className="font-bold text-white">{subscriptionReminderDays.join(', ')} أيام</span></div>
                    <div>سياسة التجميد: <span className="font-bold text-emerald-400">{subscriptionFreezeEnabled ? 'مفعل' : 'معطل'}</span></div>
                    <div>الحد الأقصى للتجميد: <span className="font-bold text-white">{maxFreezeDays} يوم</span></div>
                  </div>
                </div>

                {/* License Summary */}
                <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-amber-400" />
                      ترخيص النظام
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(7)}
                      className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                    >
                      تعديل
                    </button>
                  </div>
                  <div className="text-xs space-y-1 text-zinc-300">
                    <div>حالة التفعيل: <span className="font-bold text-emerald-400">{isLicenseActivated ? 'مفعل بنجاح ✓' : 'غير مفعل'}</span></div>
                    <div>باقة الترخيص: <span className="font-bold text-amber-400 font-mono">{liveLicense?.tier || 'PRO'}</span></div>
                    <div>سعة الأعضاء: <span className="font-bold text-white">{liveLicense?.maxMembers || 500} عضو</span></div>
                  </div>
                </div>

                {/* Attendance & Backup Summary */}
                <div className="p-4 bg-[#000000] border border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-amber-400" />
                      الحضور والنسخ الاحتياطي
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(5)}
                      className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                    >
                      تعديل
                    </button>
                  </div>
                  <div className="text-xs space-y-1 text-zinc-300">
                    <div>تسجيل الحضور: <span className="font-bold text-emerald-400">مفعل</span></div>
                    <div>الانصراف اليدوي: <span className="font-bold text-white">{allowManualCheckout ? 'مسموح' : 'تلقائي'}</span></div>
                    <div>النسخ التلقائي: <span className="font-bold text-emerald-400">مفعل يومياً (02:00 ص)</span></div>
                  </div>
                </div>
              </div>

              {/* Final Complete Action */}
              <div className="pt-4 text-center">
                <button
                  type="button"
                  disabled={completeMutation.isPending || !isLicenseActivated}
                  onClick={handleFinalSubmit}
                  className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-[#D4AF37] hover:bg-[#C29F2F] text-black font-black text-sm shadow-xl shadow-[#D4AF37]/30 transition-all cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {completeMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      جاري حفظ الإعدادات واعتماد التثبيت...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>تأكيد واعتماد الإعدادات وتشغيل النظام بالكامل</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-zinc-500 mt-2">
                  يمكنك تعديل أي من هذه الإعدادات لاحقاً في أي وقت من قائمة (الإعدادات ← إعدادات الجيم).
                </p>
              </div>
            </div>
          )}

          {/* STEP 10: COMPLETE INSTALLATION & LAUNCH */}
          {currentStep === 10 && (
            <div className="space-y-6 text-center max-w-lg mx-auto py-6">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  مبروك! تم اكتمال إعداد وتثبيت نظام GymVIP بنجاح
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                  تم حفظ بيانات فرع النادي وتطبيق كافة السياسات وتفعيل رخصة العتاد الرقمية. النظام الآن جاهز للاستخدام اليومي وإدارة الأعضاء والاشتراكات.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#000000] border border-zinc-800 text-xs text-zinc-300 space-y-1 text-right">
                <div className="font-bold text-white mb-1.5 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  النادي المعتمد: {gymName}
                </div>
                <div>• حالة الترخيص: سارية ومربوطة بالجهاز</div>
                <div>• قاعدة البيانات: SQLite محلية مشفرة ومؤمنة</div>
                <div>• النسخ الاحتياطي: مجدول يومياً لحماية البيانات</div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/app/dashboard')}
                  className="w-full py-4 rounded-2xl bg-[#D4AF37] hover:bg-[#C29F2F] text-black font-black text-sm shadow-xl shadow-[#D4AF37]/30 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <span>الدخول إلى لوحة التحكم الرئيسية</span>
                  <ChevronLeft className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Wizard Footer Navigation Controls (Visible on Steps 2 to 9) */}
        {currentStep >= 2 && currentStep <= 9 && (
          <div className="flex items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>الخطوة السابقة</span>
            </button>

            {currentStep < 9 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C29F2F] text-black font-extrabold text-xs inline-flex items-center gap-2 shadow-md shadow-[#D4AF37]/20 transition cursor-pointer"
              >
                <span>حفظ ومتابعة</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={completeMutation.isPending || !isLicenseActivated}
                className="px-7 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C29F2F] text-black font-extrabold text-xs inline-flex items-center gap-2 shadow-md shadow-[#D4AF37]/20 transition cursor-pointer disabled:opacity-50"
              >
                <span>اعتماد التثبيت والتشغيل</span>
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

      </main>
    </div>
  )
}

export default InstallationWizardPage
