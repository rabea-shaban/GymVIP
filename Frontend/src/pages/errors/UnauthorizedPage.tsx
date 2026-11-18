import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ShieldAlert,
  Lock,
  ArrowRight,
  LayoutGrid,
  AlertTriangle,
  Copy,
  Check,
  UserCheck,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'
import { UserRole } from '@/types'

// Map of system roles to human-readable Arabic labels
const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER: { label: 'مالك الصالة الرياضية (Owner)', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  MANAGER: { label: 'مدير الصالة (Manager)', color: 'bg-blue-100 text-blue-900 border-blue-300' },
  RECEPTIONIST: { label: 'موظف الاستقبال (Receptionist)', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  TRAINER: { label: 'المدرب الرياضي (Trainer)', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  MEMBER: { label: 'عضو رياضي (Member)', color: 'bg-zinc-100 text-zinc-900 border-zinc-300' },
}

// Map of common restricted paths to friendly Arabic names
const PATH_LABELS: Record<string, string> = {
  '/app/reports': 'التقارير والإحصائيات المالية والتشغيلية',
  '/app/users': 'إدارة المستخدمين وصلاحيات الموظفين',
  '/app/activity-log': 'سجل النشاط ومراجعة العمليات (Audit Log)',
  '/app/settings': 'إعدادات الصالة وتخصيص النظام',
  '/app/plans': 'إدارة باقات وعروض الاشتراكات',
  '/app/plans/new': 'إنشاء باقة عضوية جديدة',
  '/app/payments': 'إدارة المدفوعات والتحصيل المالي',
  '/app/payments/new': 'تسجيل دفعة نقدية جديدة',
  '/app/members': 'إدارة قائمة المشتركين',
  '/app/members/new': 'تسجيل مشترك جديد في الصالة',
  '/app/members/search': 'البحث المتقدم عن المشتركين',
  '/app/subscriptions': 'إدارة اشتراكات الأعضاء والتجديد',
  '/app/subscriptions/new': 'إنشاء اشتراك جديد لعضو',
  '/app/attendance': 'شاشة تسجيل الحضور ومكتب الاستقبال الرئيسي',
  '/app/reception/dashboard': 'شاشة الاستقبال السريعة',
  '/app/trainers': 'إدارة كادر المدربين والمدربات',
  '/app/trainers/new': 'إضافة مدرب جديد للنظام',
  '/app/setup': 'معالج إعداد وتهيئة الصالة الرياضية',
}

interface UnauthorizedPageProps {
  standalone?: boolean
  attemptedPath?: string
  allowedRoles?: UserRole[]
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({
  standalone = false,
  attemptedPath: propAttemptedPath,
  allowedRoles: propAllowedRoles,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)

  // Extract navigation state if passed by ProtectedRoute or props
  const state = location.state as { attemptedPath?: string; allowedRoles?: UserRole[] } | null
  const attemptedPath = propAttemptedPath || state?.attemptedPath || location.pathname
  const allowedRoles = propAllowedRoles || state?.allowedRoles || []

  // Resolve page name from path
  const targetPageName =
    PATH_LABELS[attemptedPath] ||
    Object.entries(PATH_LABELS).find(([path]) => attemptedPath.startsWith(path))?.[1] ||
    'هذه الصفحة المحمية'

  // Current role display
  const currentRoleInfo = user?.role ? ROLE_LABELS[user.role] : { label: 'مستخدم مسجل', color: 'bg-zinc-100 text-zinc-800' }

  // Allowed roles labels
  const allowedRolesList = allowedRoles.length > 0
    ? allowedRoles.map((r) => ROLE_LABELS[r]?.label.split(' (')[0] || r).join(' أو ')
    : 'إدارة الصالة والمسؤولين المصرح لهم'

  // Smart dashboard destination based on user's current role
  const getDashboardDestination = () => {
    if (!user) return '/login'
    switch (user.role) {
      case 'TRAINER':
        return '/app/trainer/dashboard'
      case 'RECEPTIONIST':
        return '/app/reception/dashboard'
      case 'OWNER':
      case 'MANAGER':
      default:
        return '/app/dashboard'
    }
  }

  const handleCopySupportInfo = () => {
    const text = `طلب صلاحية في نظام GymVIP:\nالمستخدم: ${user?.name || 'غير معروف'} (${user?.email || ''})\nالدور الحالي: ${user?.role || 'غير محدد'}\nالصفحة المطلوبة: ${attemptedPath} (${targetPageName})`
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const content = (
    <div className="max-w-2xl mx-auto w-full py-8 sm:py-12 px-4 font-cairo text-right" dir="rtl">
      {/* Main VIP Access Denied Card */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-xl overflow-hidden relative">
        {/* Top Gold Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-600 via-[#D4AF37] to-amber-700"></div>

        <div className="p-6 sm:p-10 space-y-6">
          {/* Header Graphic */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-zinc-100 text-center sm:text-right">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700 shadow-sm">
                <ShieldAlert className="w-10 h-10 text-rose-600 stroke-[1.8]" />
              </div>
              <div className="w-7 h-7 rounded-full bg-zinc-950 text-white absolute -bottom-1 -left-1 flex items-center justify-center shadow-md border-2 border-white">
                <Lock className="w-3.5 h-3.5 text-[#F4D76A]" />
              </div>
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-black">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span>خطأ 403 • صلاحيات وصول غير كافية</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
                عفواً، ليس لديك صلاحية للوصول
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium leading-relaxed">
                هذه الصفحة مخصصة لأدوار إدارية معينة لحماية بيانات الصالة وسريتها، وحسابك الحالي لا يمتلك الإذن الكافي لعرضها.
              </p>
            </div>
          </div>

          {/* Details Diagnostic Box */}
          <div className="bg-zinc-50/90 rounded-2xl border border-zinc-200/80 p-4 sm:p-5 space-y-3.5 text-xs">
            <div className="flex items-center gap-2 text-zinc-700 font-bold border-b border-zinc-200/60 pb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>تفاصيل محاولة الوصول الحالية:</span>
            </div>

            {/* Current User & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-xl border border-zinc-200/70 space-y-1">
                <span className="text-[11px] text-zinc-400 block font-semibold">حسابك الحالي:</span>
                <div className="flex items-center gap-2 font-bold text-zinc-900">
                  <UserCheck className="w-4 h-4 text-zinc-500" />
                  <span className="truncate">{user?.name || 'مستخدم مسجل'}</span>
                </div>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border mt-1 ${currentRoleInfo.color}`}>
                  {currentRoleInfo.label}
                </span>
              </div>

              {/* Target Page */}
              <div className="p-3 bg-white rounded-xl border border-zinc-200/70 space-y-1">
                <span className="text-[11px] text-zinc-400 block font-semibold">الصفحة المطلوبة:</span>
                <span className="font-bold text-zinc-900 block truncate" title={targetPageName}>
                  {targetPageName}
                </span>
                <span className="font-mono text-[10px] text-zinc-400 block truncate" dir="ltr">
                  {attemptedPath}
                </span>
              </div>
            </div>

            {/* Required Roles Banner */}
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-900 leading-relaxed">
                <span className="font-bold">الصلاحيات المطلوبة لهذه الصفحة: </span>
                <span className="font-extrabold text-amber-950">{allowedRolesList}</span>.
                إذا كنت تعتقد أن هذا خطأ وترى أنك بحاجة إلى هذا القسم لمتابعة عملك، يرجى التواصل مع مالك الصالة لترقية صلاحيتك.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            {/* Primary Button: Return to user's permitted dashboard */}
            <button
              type="button"
              onClick={() => navigate(getDashboardDestination(), { replace: true })}
              className="w-full sm:flex-1 py-3 px-5 rounded-xl text-xs sm:text-sm font-black bg-zinc-950 hover:bg-zinc-800 text-white flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition active:scale-98"
            >
              <LayoutGrid className="w-4 h-4 text-[#F4D76A]" />
              <span>العودة إلى لوحة التحكم الخاصة بي</span>
            </button>

            {/* Secondary Button: Go Back */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto py-3 px-5 rounded-xl text-xs sm:text-sm font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 flex items-center justify-center gap-2 transition active:scale-98 border border-zinc-200"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الصفحة السابقة</span>
            </button>

            {/* Copy Support Info Button */}
            <button
              type="button"
              onClick={handleCopySupportInfo}
              className="w-full sm:w-auto py-3 px-4 rounded-xl text-xs font-semibold bg-white hover:bg-zinc-50 text-zinc-600 border border-zinc-200/80 flex items-center justify-center gap-1.5 transition"
              title="نسخ تفاصيل الطلب لإرسالها للمدير"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>نسخ للمدير</span>
                </>
              )}
            </button>
          </div>

          {/* Footer Assistance note */}
          <div className="pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-400">
            <span>نظام GymVIP لإدارة الأندية والصالات الرياضية</span>
            <div className="flex items-center gap-1 font-mono text-zinc-500">
              <span>رمز الحماية:</span>
              <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700 font-bold">SEC-403-FORBIDDEN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (standalone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
        {content}
      </div>
    )
  }

  return content
}

export default UnauthorizedPage
