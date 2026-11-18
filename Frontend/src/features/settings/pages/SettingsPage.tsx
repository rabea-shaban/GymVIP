import React, { useState, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  BellRing,
  PauseCircle,
  UserCheck,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Phone,
  Mail,
  MapPin,
  Clock,
  Banknote,
  ChevronLeft,
  X,
  Lock,
  Upload,
  Trash2,
  Check,
  Key,
  Database,
} from 'lucide-react'
import { gymApi } from '@/features/gym/services/gymApi'
import type { GymProfile, UpdateGymInput } from '@/features/gym/types/gym.types'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { normalizePhone, EGYPTIAN_PHONE_REGEX } from '@/lib/validation'
import { FieldError } from '@/components/ui/FieldError'
import { getMediaUrl } from '@/lib/media'
import { LicenseSettingsTab } from '../components/LicenseSettingsTab'
import { BackupSettingsTab } from '../components/BackupSettingsTab'

// Settings Schema
const settingsFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'يجب أن يتكون اسم النادي من حرفين على الأقل')
      .max(100, 'اسم النادي طويل جداً (الحد الأقصى 100 حرف)'),
    phone: z
      .string()
      .trim()
      .transform((val) => (val ? normalizePhone(val) : ''))
      .refine(
        (val) => !val || EGYPTIAN_PHONE_REGEX.test(val),
        'يرجى إدخال رقم هاتف محمول مصري صحيح (11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015)'
      )
      .optional()
      .or(z.literal('')),
    email: z
      .string()
      .trim()
      .email('صيغة البريد الإلكتروني غير صحيحة')
      .toLowerCase()
      .optional()
      .or(z.literal('')),
    address: z.string().trim().max(200, 'العنوان طويل جداً').optional().or(z.literal('')),
    city: z.string().trim().max(100, 'اسم المدينة طويل جداً').optional().or(z.literal('')),
    logo: z
      .string()
      .trim()
      .refine((val) => !val || val.startsWith('data:image/') || /^https?:\/\//i.test(val), {
        message: 'صيغة الشعار غير صحيحة، يجب أن يكون رابطاً مباشراً أو ملف صورة صالح',
      })
      .optional()
      .or(z.literal('')),
    subscriptionReminderEnabled: z.boolean(),
    subscriptionReminderDays: z.array(z.number()),
    subscriptionFreezeEnabled: z.boolean(),
    allowedFreezeDurations: z.array(z.number()),
    maxFreezeDays: z
      .number({ invalid_type_error: 'يرجى إدخال رقم صحيح' })
      .int('يجب أن يكون رقماً صحيحاً')
      .min(1, 'الحد الأدنى هو يوم واحد')
      .max(90, 'الحد الأقصى هو 90 يوماً'),
    allowManualCheckout: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.subscriptionReminderEnabled && data.subscriptionReminderDays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'يجب اختيار موعد تذكير واحد على الأقل عند تفعيل التنبيهات',
        path: ['subscriptionReminderDays'],
      })
    }
    if (data.subscriptionFreezeEnabled && data.allowedFreezeDurations.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'يجب اختيار مدة تجميد واحدة على الأقل عند تفعيل التجميد',
        path: ['allowedFreezeDurations'],
      })
    }
    for (const d of data.allowedFreezeDurations) {
      if (d > data.maxFreezeDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `مدة التجميد (${d} يوم) تتجاوز الحد الأقصى المسموح به (${data.maxFreezeDays} يوم)`,
          path: ['allowedFreezeDurations'],
        })
      }
    }
  })

type SettingsFormValues = z.infer<typeof settingsFormSchema>

type SettingsTabId =
  | 'gym_profile'
  | 'reminders'
  | 'freeze_policy'
  | 'attendance'
  | 'system'
  | 'license'
  | 'backups'

interface SettingsTab {
  id: SettingsTabId
  label: string
  icon: React.ElementType
  stepNumber: number
}

const SETTINGS_TABS: SettingsTab[] = [
  { id: 'gym_profile', label: 'بيانات الجيم', icon: Building2, stepNumber: 1 },
  { id: 'reminders', label: 'تنبيهات الاشتراكات', icon: BellRing, stepNumber: 2 },
  { id: 'freeze_policy', label: 'سياسة تجميد الاشتراكات', icon: PauseCircle, stepNumber: 3 },
  { id: 'attendance', label: 'إعدادات الحضور', icon: UserCheck, stepNumber: 4 },
  { id: 'system', label: 'إعدادات النظام', icon: ShieldCheck, stepNumber: 5 },
  { id: 'license', label: 'ترخيص النظام', icon: Key, stepNumber: 6 },
  { id: 'backups', label: 'النسخ الاحتياطي', icon: Database, stepNumber: 7 },
]

export const SettingsPage: React.FC = () => {
  const { user, updateGymData } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<SettingsTabId>('gym_profile')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const logoFileInputRef = useRef<HTMLInputElement>(null)

  const canEdit = user?.role === 'OWNER' || user?.role === 'MANAGER'

  // Fetch Gym Profile
  const {
    data: gym,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<GymProfile>({
    queryKey: ['gym-profile'],
    queryFn: async () => {
      const data = await gymApi.getProfile()
      updateGymData(data)
      return data
    },
    staleTime: 1000 * 60 * 5,
  })

  // Form Setup
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      logo: '',
      subscriptionReminderEnabled: true,
      subscriptionReminderDays: [3, 1],
      subscriptionFreezeEnabled: true,
      allowedFreezeDurations: [3, 7, 15, 30],
      maxFreezeDays: 90,
      allowManualCheckout: true,
    },
  })

  // Prefill form only when pristine or first loaded to avoid overwriting ongoing user edits
  useEffect(() => {
    if (gym && !isDirty) {
      reset({
        name: gym.name || '',
        phone: gym.phone || '',
        email: gym.email || '',
        address: gym.address || '',
        city: gym.city || '',
        logo: gym.logo || '',
        subscriptionReminderEnabled: gym.subscriptionReminderEnabled ?? true,
        subscriptionReminderDays: gym.subscriptionReminderDays ?? [3, 1],
        subscriptionFreezeEnabled: gym.subscriptionFreezeEnabled ?? true,
        allowedFreezeDurations: gym.allowedFreezeDurations ?? [3, 7, 15, 30],
        maxFreezeDays: gym.maxFreezeDays ?? 90,
        allowManualCheckout: gym.allowManualCheckout ?? true,
      })
    }
  }, [gym, reset, isDirty])

  // Mutation for updating settings
  const mutation = useMutation({
    mutationFn: (data: UpdateGymInput) => gymApi.updateSettings(data),
    onSuccess: (updatedGym) => {
      queryClient.setQueryData(['gym-profile'], updatedGym)
      queryClient.invalidateQueries({ queryKey: ['gym-profile'] })
      updateGymData(updatedGym)
      reset({
        name: updatedGym.name || '',
        phone: updatedGym.phone || '',
        email: updatedGym.email || '',
        address: updatedGym.address || '',
        city: updatedGym.city || '',
        logo: updatedGym.logo || '',
        subscriptionReminderEnabled: updatedGym.subscriptionReminderEnabled ?? true,
        subscriptionReminderDays: updatedGym.subscriptionReminderDays ?? [3, 1],
        subscriptionFreezeEnabled: updatedGym.subscriptionFreezeEnabled ?? true,
        allowedFreezeDurations: updatedGym.allowedFreezeDurations ?? [3, 7, 15, 30],
        maxFreezeDays: updatedGym.maxFreezeDays ?? 90,
        allowManualCheckout: updatedGym.allowManualCheckout ?? true,
      })
      setSuccessMessage('تم حفظ إعدادات وتفضيلات الجيم بنجاح وتطبيقها فوراً في النظام')
      setErrorMessage(null)
      setTimeout(() => setSuccessMessage(null), 5000)
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message || err?.message || 'تعذر حفظ الإعدادات، يرجى المحاولة لاحقاً'
      setErrorMessage(msg)
      setSuccessMessage(null)
    },
  })

  const processLogoFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('يرجى اختيار ملف صورة صالح (PNG أو JPG أو WebP)'))
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
          const maxDim = 500
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
            const isPng = file.type === 'image/png'
            resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.9))
          } else {
            resolve(event.target?.result as string)
          }
        }
        img.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'))
        img.src = event.target?.result as string
      }
      reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'))
      reader.readAsDataURL(file)
    })
  }

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await processLogoFile(file)
      setValue('logo', dataUrl, { shouldDirty: true, shouldValidate: true })
      setErrorMessage(null)
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل اختيار الشعار')
    } finally {
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = ''
      }
    }
  }

  const onSubmit = (values: SettingsFormValues) => {
    if (!canEdit) return

    const payload: UpdateGymInput = {
      name: values.name.trim(),
      phone: values.phone?.trim() ? normalizePhone(values.phone) : null,
      email: values.email?.trim() || null,
      address: values.address?.trim() || null,
      city: values.city?.trim() || null,
      logo: values.logo?.trim() || null,
      subscriptionReminderEnabled: values.subscriptionReminderEnabled,
      subscriptionReminderDays: values.subscriptionReminderDays,
      subscriptionFreezeEnabled: values.subscriptionFreezeEnabled,
      allowedFreezeDurations: values.allowedFreezeDurations,
      maxFreezeDays: values.maxFreezeDays,
      allowManualCheckout: values.allowManualCheckout,
    }

    mutation.mutate(payload)
  }

  // Watch values for interactive controls
  const logoValue = watch('logo')
  const reminderEnabled = watch('subscriptionReminderEnabled')
  const reminderDays = watch('subscriptionReminderDays')
  const freezeEnabled = watch('subscriptionFreezeEnabled')
  const allowedDurations = watch('allowedFreezeDurations')
  const maxFreezeDaysValue = watch('maxFreezeDays')

  // Helper for reminder checkboxes
  const toggleReminderDay = (day: number) => {
    if (!canEdit) return
    const current = reminderDays || []
    if (current.includes(day)) {
      setValue(
        'subscriptionReminderDays',
        current.filter((d) => d !== day),
        { shouldDirty: true, shouldValidate: true }
      )
    } else {
      setValue('subscriptionReminderDays', [...current, day].sort((a, b) => b - a), {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }

  // Helper for freeze duration checkboxes
  const toggleFreezeDuration = (duration: number) => {
    if (!canEdit) return
    const current = allowedDurations || []
    if (current.includes(duration)) {
      setValue(
        'allowedFreezeDurations',
        current.filter((d) => d !== duration),
        { shouldDirty: true, shouldValidate: true }
      )
    } else {
      setValue('allowedFreezeDurations', [...current, duration].sort((a, b) => a - b), {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }

  const currentTabObj = SETTINGS_TABS.find((t) => t.id === activeTab) || SETTINGS_TABS[0]

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-pulse">
        <div className="h-10 w-48 bg-zinc-200 rounded-xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 h-64 bg-zinc-100 rounded-2xl"></div>
          <div className="lg:col-span-8 h-96 bg-zinc-100 rounded-2xl"></div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-rose-950">فشل في تحميل إعدادات الجيم</h2>
        <p className="text-sm text-rose-700">
          {(error as Error)?.message || 'حدث خطأ أثناء جلب بيانات النادي من الخادم.'}
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          <span>إعادة المحاولة</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast / Notification Banners */}
      {successMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-gold-500/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-sm font-semibold">{successMessage}</div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-zinc-400 hover:text-white mr-2 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold">تعذر حفظ الإعدادات</div>
              <div className="text-xs text-rose-700 mt-0.5">{errorMessage}</div>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-800 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Role permission info banner */}
      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-sm">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs sm:text-sm font-medium">
            <strong>صلاحيات القراءة فقط:</strong> يمكنك الاطلاع على إعدادات وسياسات النادي الحالية،
            ولكن لا تملك صلاحية تعديلها (متاحة للمالك ومدير الصالة فقط).
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 mb-1.5">
            <span>لوحة التحكم</span>
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-700">الإعدادات</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tight">إعدادات الجيم</h1>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF0D3] text-[#7E6517] border border-[#ECD9A2] text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B8941F]" />
              <span>تفضيلات وسياسات المركز الرياضي</span>
            </div>
          </div>
          <p className="text-sm text-zinc-500 mt-1 font-medium">
            تكوين البيانات الرسمية، تنبيهات الاشتراكات، سياسات التجميد، وضوابط الحضور لمنظومة GymVIP
          </p>
        </div>

        {/* System V1 Badge */}
        <div className="flex items-center self-start md:self-auto gap-2 px-3 py-1.5 rounded-full bg-white border border-zinc-200 text-xs font-semibold text-zinc-700 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#B8941F] animate-pulse"></span>
          <span>البيئة المعتمدة:</span>
          <span className="font-bold text-zinc-900">إصدار V1 (مصر)</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Main Grid: Navigation Tabs & Form Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Navigation Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="text-xs font-bold text-zinc-400 px-2">أقسام الإعدادات</div>

              <div className="space-y-1.5">
                {SETTINGS_TABS.map((tab) => {
                  const IconComponent = tab.icon
                  const isActive = activeTab === tab.id

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-zinc-950 text-white shadow-md'
                          : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <IconComponent
                          className={`w-4 h-4 ${
                            isActive ? 'text-[#E5C158]' : 'text-zinc-500'
                          }`}
                        />
                        <span>{tab.label}</span>
                      </div>
                      {isActive && <ChevronLeft className="w-4 h-4 text-zinc-400" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quick Gym Status Summary Card */}
            <div className="bg-[#F8F9FA] border border-zinc-200/90 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-600">معرف النادي المعتمد</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#4F3F13] text-[#FAF0D3]">
                  {gym?.slug}
                </span>
              </div>
              <div className="text-xs text-zinc-500 leading-relaxed">
                يتم عزل كافة البيانات والسياسات الخاصة بهذا الفرع تلقائياً لضمان أعلى معايير الخصوصية والأمان.
              </div>
            </div>
          </div>

          {/* Form Content Column */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              {/* Tab Header */}
              <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-5">
                <div>
                  <h2 className="text-xl font-black text-zinc-950">{currentTabObj.label}</h2>
                  <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
                    {activeTab === 'gym_profile' &&
                      'البيانات الرسمية للجيم التي تظهر على الفواتير، التقارير، وإيصالات المشتركين'}
                    {activeTab === 'reminders' &&
                      'جدولة التنبيهات التلقائية المسبقة قبل موعد انتهاء اشتراك العضو'}
                    {activeTab === 'freeze_policy' &&
                      'الضوابط والمدد المسموح بها لتجميد اشتراكات الأعضاء وحمايتها من التلاعب'}
                    {activeTab === 'attendance' &&
                      'خيارات وضوابط تسجيل حضور وانصراف المشتركين في الصالة الرياضية'}
                    {activeTab === 'system' &&
                      'المعايير المعتمدة للنظام وفق الإصدار الأول للسوق المصري'}
                    {activeTab === 'license' &&
                      'إدارة رخصة النظام، كود بصمة الجهاز، باقة الأعضاء، وتحديث التفعيل'}
                    {activeTab === 'backups' &&
                      'إدارة واستعادة النسخ الاحتياطية اليومية لقاعدة بيانات النادي المحلية'}
                  </p>
                </div>
                <div className="shrink-0 px-3 py-1 rounded-xl bg-zinc-100 text-zinc-600 text-xs font-bold">
                  القسم {currentTabObj.stepNumber} من {SETTINGS_TABS.length}
                </div>
              </div>

              {/* TAB 1: Gym Profile */}
              {activeTab === 'gym_profile' && (
                <div className="space-y-6">
                  {/* Gym Logo Card */}
                  <div className="bg-[#F7F8FA] border border-zinc-200/70 rounded-2xl p-5 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center text-center p-3 shrink-0 shadow-sm relative overflow-hidden">
                      {logoValue ? (
                        <img
                          src={getMediaUrl(logoValue)}
                          alt="Gym Logo"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-[#F5D86B] text-xl sm:text-2xl font-black tracking-widest leading-none">
                            VIP
                          </span>
                          <span className="text-[#F5D86B] text-[9px] sm:text-[10px] tracking-[0.25em] font-bold mt-1 uppercase">
                            FITNESS
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-3 text-center sm:text-right w-full">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900">شعار الجيم (Logo)</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          شعار الصالة الرياضية الذي يظهر في القائمة الجانبية والفواتير والتقارير الرسمية.
                        </p>
                      </div>

                      {/* File Upload Controls */}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <input
                          ref={logoFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoFileChange}
                          disabled={!canEdit}
                        />
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => logoFileInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5 text-gym-gold" />
                          <span>رفع شعار من الجهاز</span>
                        </button>

                        {logoValue && (
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() =>
                              setValue('logo', '', { shouldDirty: true, shouldValidate: true })
                            }
                            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold border border-rose-200 flex items-center gap-1.5 transition disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>إزالة الشعار</span>
                          </button>
                        )}
                      </div>

                      {/* URL input fallback */}
                      <div className="pt-1">
                        <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                          أو أدخل رابطاً مباشراً للصورة (URL):
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          disabled={!canEdit}
                          {...register('logo')}
                          placeholder="https://example.com/logo.png"
                          className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition disabled:bg-zinc-100 disabled:opacity-60"
                        />
                        {errors.logo && <FieldError error={errors.logo.message} />}
                      </div>
                    </div>
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gym Name */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-800">
                        اسم الجيم <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={!canEdit}
                          {...register('name')}
                          placeholder="نادي في اي بي للياقة"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition disabled:bg-zinc-100 disabled:opacity-60"
                        />
                        <Building2 className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <FieldError error={errors.name?.message} />
                    </div>

                    {/* Official Phone */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-800">رقم الهاتف الرسمي</label>
                      <div className="relative flex items-center">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                          +20
                        </span>
                        <input
                          type="text"
                          dir="ltr"
                          disabled={!canEdit}
                          {...register('phone')}
                          placeholder="01012345678"
                          className="w-full pl-10 pr-14 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition text-right disabled:bg-zinc-100 disabled:opacity-60"
                        />
                        <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <FieldError error={errors.phone?.message} />
                    </div>

                    {/* Official Email */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-800">البريد الإلكتروني</label>
                      <div className="relative">
                        <input
                          type="email"
                          dir="ltr"
                          disabled={!canEdit}
                          {...register('email')}
                          placeholder="info@gymvip.eg"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition text-right disabled:bg-zinc-100 disabled:opacity-60"
                        />
                        <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <FieldError error={errors.email?.message} />
                    </div>

                    {/* City */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-800">المدينة</label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        {...register('city')}
                        placeholder="القاهرة"
                        className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition disabled:bg-zinc-100 disabled:opacity-60"
                      />
                      <FieldError error={errors.city?.message} />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-800">العنوان الجغرافي</label>
                    <div className="relative">
                      <input
                        type="text"
                        disabled={!canEdit}
                        {...register('address')}
                        placeholder="شارع التسعين الشمالي، التجمع الخامس"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition disabled:bg-zinc-100 disabled:opacity-60"
                      />
                      <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <FieldError error={errors.address?.message} />
                  </div>
                </div>
              )}

              {/* TAB 2: Subscription Reminders */}
              {activeTab === 'reminders' && (
                <div className="space-y-6">
                  {/* Master Toggle */}
                  <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-zinc-900">
                        تفعيل تنبيهات اقتراب انتهاء الاشتراك
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        إرسال إشعارات داخل النظام للإدارة وموظفي الاستقبال قبل انتهاء اشتراكات الأعضاء
                      </div>
                    </div>
                    <Controller
                      name="subscriptionReminderEnabled"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-5 h-5 accent-zinc-950 rounded cursor-pointer disabled:cursor-not-allowed"
                        />
                      )}
                    />
                  </div>

                  {/* Offsets Selection */}
                  <div
                    className={`space-y-3 transition-opacity ${
                      reminderEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
                    }`}
                  >
                    <div>
                      <label className="block text-xs font-bold text-zinc-800">
                        مواعيد التذكير قبل الانتهاء (أيام)
                      </label>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        حدد الأيام التي ترغب في استلام تنبيه عندها قبل تاريخ انتهاء الاشتراك
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { day: 7, label: 'قبل 7 أيام (أسبوع)' },
                        { day: 3, label: 'قبل 3 أيام' },
                        { day: 1, label: 'قبل يوم واحد (غداً)' },
                      ].map((item) => {
                        const isSelected = reminderDays?.includes(item.day)
                        return (
                          <button
                            key={item.day}
                            type="button"
                            disabled={!canEdit || !reminderEnabled}
                            onClick={() => toggleReminderDay(item.day)}
                            className={`p-3.5 rounded-xl border text-center font-bold text-xs transition flex items-center justify-between ${
                              isSelected
                                ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                            }`}
                          >
                            <span>{item.label}</span>
                            <span
                              className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                                isSelected ? 'bg-gold-500 text-zinc-950 font-black' : 'border border-zinc-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {errors.subscriptionReminderDays && (
                      <FieldError error={errors.subscriptionReminderDays.message} />
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Freeze Policy */}
              {activeTab === 'freeze_policy' && (
                <div className="space-y-6">
                  {/* Master Toggle */}
                  <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-zinc-900">
                        السماح بتجميد الاشتراكات (Freeze)
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        إتاحة ميزة تجميد الاشتراك للأعضاء وتأجيل تاريخ الانتهاء وفق مدد محددة
                      </div>
                    </div>
                    <Controller
                      name="subscriptionFreezeEnabled"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-5 h-5 accent-zinc-950 rounded cursor-pointer disabled:cursor-not-allowed"
                        />
                      )}
                    />
                  </div>

                  <div
                    className={`space-y-5 transition-opacity ${
                      freezeEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
                    }`}
                  >
                    {/* Max Freeze Days */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-800">
                        الحد الأقصى للتجميد في المرة الواحدة (بالأيام)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        disabled={!canEdit || !freezeEnabled}
                        {...register('maxFreezeDays', { valueAsNumber: true })}
                        className="w-full sm:w-48 p-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition disabled:bg-zinc-100"
                      />
                      <p className="text-xs text-zinc-400">الحد الأقصى المسموح به هو 90 يوماً.</p>
                      {errors.maxFreezeDays && (
                        <FieldError error={errors.maxFreezeDays.message} />
                      )}
                    </div>

                    {/* Allowed Freeze Durations */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-800">
                          مدد التجميد المسموح بها للاستقبال
                        </label>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          حدد الخيارات المتاحة لموظفي الاستقبال عند تجميد أي اشتراك
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[3, 7, 15, 30, 45, 60].map((duration) => {
                          const isSelected = allowedDurations?.includes(duration)
                          const isOverMax = duration > (maxFreezeDaysValue || 90)

                          return (
                            <button
                              key={duration}
                              type="button"
                              disabled={!canEdit || !freezeEnabled || isOverMax}
                              onClick={() => toggleFreezeDuration(duration)}
                              className={`p-3 rounded-xl border text-center font-bold text-xs transition flex items-center justify-between ${
                                isOverMax
                                  ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-50'
                                  : isSelected
                                  ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                                  : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                              }`}
                            >
                              <span>{duration} يوم</span>
                              <span
                                className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                                  isSelected
                                    ? 'bg-gold-500 text-zinc-950 font-black'
                                    : 'border border-zinc-300'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </span>
                            </button>
                          )
                        })}
                      </div>

                      {errors.allowedFreezeDurations && (
                        <FieldError error={errors.allowedFreezeDurations.message} />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Attendance Preferences */}
              {activeTab === 'attendance' && (
                <div className="space-y-6">
                  <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-zinc-900">
                        السماح بتسجيل الانصراف اليدوي (Manual Check-out)
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        تمكين موظفي الاستقبال من تسجيل خروج العضو يدوياً وإغلاق جلسة الحضور
                      </div>
                    </div>
                    <Controller
                      name="allowManualCheckout"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-5 h-5 accent-zinc-950 rounded cursor-pointer disabled:cursor-not-allowed"
                        />
                      )}
                    />
                  </div>

                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 leading-relaxed space-y-1">
                    <div className="font-bold">قواعد الحضور والانصراف المعتمدة:</div>
                    <div>• يتم التحقق دائماً من أن اشتراك العضو نشط وسارٍ قبل تسجيل الدخول.</div>
                    <div>• يمنع تسجيل حضور مكرر لنفس العضو طالما لديه جلسة حضور مفتوحة.</div>
                    <div>• عند تعطيل الانصراف اليدوي، يتم إغلاق الجلسات تلقائياً بنهاية اليوم.</div>
                  </div>
                </div>
              )}

              {/* TAB 5: System & Environment Preferences */}
              {activeTab === 'system' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Fixed Currency */}
                    <div className="bg-[#F4F6FB] border border-zinc-200/80 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-700">العملة الرسمية للنظام</span>
                        <span className="text-[11px] font-bold bg-zinc-200/80 text-zinc-700 px-2 py-0.5 rounded">
                          ثابت (V1)
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 pt-1">
                        <Banknote className="w-5 h-5 text-zinc-700" />
                        <span className="text-base font-black text-zinc-950">
                          ج.م (الجنيه المصري — EGP)
                        </span>
                      </div>
                    </div>

                    {/* Fixed Timezone */}
                    <div className="bg-[#F4F6FB] border border-zinc-200/80 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-700">النطاق الزمني للمنظومة</span>
                        <span className="text-[11px] font-bold bg-zinc-200/80 text-zinc-700 px-2 py-0.5 rounded">
                          ثابت (مصر)
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 pt-1">
                        <Clock className="w-5 h-5 text-zinc-700" />
                        <span className="text-base font-black text-zinc-950">
                          توقيت القاهرة (Africa/Cairo)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl space-y-2 text-xs text-zinc-600">
                    <div className="font-bold text-zinc-900">ملاحظة معمارية:</div>
                    <p className="leading-relaxed">
                      النسخة الأولى (V1) مخصصة حصرياً للسوق المصري. لا يمكن تعديل العملة أو النطاق الزمني
                      لضمان دقة الحسابات المالية وتقارير الإغلاق وحسابات التجميد.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 6: System License */}
              {activeTab === 'license' && <LicenseSettingsTab />}

              {/* TAB 7: Database Backups */}
              {activeTab === 'backups' && <BackupSettingsTab />}

              {/* Action Footer Bar */}
              {canEdit && activeTab !== 'license' && activeTab !== 'backups' && (
                <div className="pt-5 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black bg-[#F5D86B] hover:bg-[#ECCB50] text-zinc-950 shadow-sm transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {mutation.isPending ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin text-zinc-950" />
                        <span>جارٍ حفظ التغييرات...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-zinc-950" />
                        <span>حفظ التغييرات</span>
                      </>
                    )}
                  </button>

                  <div className="text-xs text-zinc-400 font-medium">
                    يتم تسجيل كافة التعديلات في سجل النشاط والعمليات (Audit Log) تلقائياً.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default SettingsPage
