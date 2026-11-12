import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  ArrowLeft,
  ShieldCheck,
  Headphones,
  Award,
  Lock,
  AlertTriangle,
  Server,
  Wrench,
  FileQuestion,
  RotateCcw,
  Activity,
  Maximize2
} from 'lucide-react'

export type ErrorType = '404' | '403' | '500' | 'maintenance'

interface ErrorContent {
  codeArabic: string
  codeEn: string
  title: string
  description: string
  icon: React.ElementType
  badgeIcon: React.ElementType
  badgeColor: string
  responseId: string
}

const ERROR_CONFIGS: Record<ErrorType, ErrorContent> = {
  '404': {
    codeArabic: '٤٠٤',
    codeEn: '404',
    title: 'الصفحة غير موجودة',
    description: 'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى مسار آخر في النظام.',
    icon: FileQuestion,
    badgeIcon: Lock,
    badgeColor: 'bg-[#FAF0D3] text-[#7E6517]',
    responseId: 'GYM-EGY-2025',
  },
  '403': {
    codeArabic: '٤٠٣',
    codeEn: '403',
    title: 'غير مصرح بالوصول',
    description: 'ليس لديك الصلاحيات الكافية لعرض هذه الصفحة أو تنفيذ هذا الإجراء الإداري.',
    icon: Lock,
    badgeIcon: AlertTriangle,
    badgeColor: 'bg-rose-100 text-rose-800',
    responseId: 'AUTH-DENIED-403',
  },
  '500': {
    codeArabic: '٥٠٠',
    codeEn: '500',
    title: 'خطأ في استجابة الخادم',
    description: 'حدث خطأ مؤقت أثناء معالجة طلبك على السيرفرات السحابية. تم إبلاغ فريق الدعم الفني.',
    icon: Server,
    badgeIcon: RotateCcw,
    badgeColor: 'bg-amber-100 text-amber-800',
    responseId: 'SRV-ERR-500-EGY',
  },
  'maintenance': {
    codeArabic: 'صيانة',
    codeEn: '503',
    title: 'النظام قيد الصيانة المجدولة',
    description: 'نقوم حالياً بترقية قواعد البيانات وتحسين سرعة الاستجابة لخدمتكم بشكل أفضل.',
    icon: Wrench,
    badgeIcon: Activity,
    badgeColor: 'bg-blue-100 text-blue-800',
    responseId: 'MAINT-SCHEDULED-V4',
  },
}

interface ErrorPageProps {
  initialType?: ErrorType
}

export const NotFoundPage: React.FC<ErrorPageProps> = ({ initialType = '404' }) => {
  const navigate = useNavigate()
  const [currentError, setCurrentError] = useState<ErrorType>(initialType)

  const config = ERROR_CONFIGS[currentError]
  const IconComponent = config.icon
  const BadgeIconComponent = config.badgeIcon

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col lg:flex-row items-stretch" dir="rtl">
      {/* RIGHT SIDE IN RTL (Left half in visual coordinates): Dark Brand Showcase Panel */}
      <div className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-l border-zinc-800/80 bg-gradient-to-br from-[#0B0B0B] via-[#111114] to-[#18181B]">
        {/* Ambient Gold Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Badges in Dark Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-700/80 text-xs font-bold text-[#F4D76A] shadow-inner">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
            <span>المنصة الأولى لإدارة الصالات الرياضية بمصر</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
            <Award className="w-4 h-4 text-[#D4AF37]" />
            <span>معتمد من الجمعية المصرية للياقة</span>
          </div>
        </div>

        {/* Main Brand Messaging */}
        <div className="my-auto py-12 space-y-6 z-10 max-w-xl">
          <div className="text-xs sm:text-sm font-black text-[#F4D76A] tracking-wider uppercase">
            منظومة احترافية متكاملة
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.25] tracking-tight">
            قيادة ذكية لأكبر الأندية والصالات الرياضية في مصر
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-normal">
            تحكم متكامل في الاشتراكات، بوابات الدخول الذكية، كشوف المدربين، وإحصائيات الإيرادات اليومية في لوحة قيادة واحدة مصممة لدعم نموك المؤسسي.
          </p>

          {/* 2 Glass Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {/* Stat 1 */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-[#F4D76A] tracking-tight">
                ١٢,٠٠٠+
              </div>
              <div className="text-xs text-zinc-400 font-medium">عضو رياضي نشط شهرياً</div>
            </div>

            {/* Stat 2 */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-[#F4D76A] tracking-tight">
                ٩٩.٩%
              </div>
              <div className="text-xs text-zinc-400 font-medium">
                جاهزية واستقرار السيرفرات السحابية
              </div>
            </div>
          </div>
        </div>

        {/* Footer in Dark Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500 pt-6 border-t border-zinc-800/60 z-10">
          <div className="font-mono text-zinc-400">الإصدار Enterprise 4.2</div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🇪🇬</span>
              <span>متوافق مع الفاتورة الإلكترونية المصرية</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>حماية بيانات الأعضاء</span>
            </div>
          </div>
        </div>
      </div>

      {/* LEFT SIDE IN RTL (Right half in visual coordinates): Interactive Error Workspace */}
      <div className="lg:w-1/2 p-6 sm:p-12 lg:p-16 flex flex-col justify-between bg-[#FBFBFA] text-zinc-900">
        {/* Top Simulator Capsule Switcher */}
        <div className="flex flex-col items-center space-y-2">
          <div className="bg-zinc-200/80 p-1 rounded-full flex flex-wrap items-center justify-center gap-1 shadow-inner max-w-fit">
            {[
              { id: '404', label: '٤٠٤ • مفقودة' },
              { id: '403', label: '٤٠٣ • تصريح' },
              { id: '500', label: '٥٠٠ • خطأ خادم' },
              { id: 'maintenance', label: 'صيانة مجدولة' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentError(tab.id as ErrorType)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                  currentError === tab.id
                    ? 'bg-zinc-950 text-white shadow-md'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-300/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-zinc-400 font-medium text-center">
            محاكي حالات الاستجابة التشغيلية لنظام GymVIP Enterprise
          </div>
        </div>

        {/* Center Main Error Card */}
        <div className="my-auto py-8 max-w-md w-full mx-auto">
          <div className="bg-white border border-zinc-200/90 rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-6 relative">
            {/* GymVIP Brand Header inside Card */}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-black text-zinc-950 tracking-tight">.GymVIP</span>
                <div className="w-6 h-6 rounded-lg bg-[#FAF0D3] text-[#7E6517] border border-[#ECD9A2] flex items-center justify-center">
                  <Maximize2 className="w-3.5 h-3.5 text-[#B8941F]" />
                </div>
              </div>
              <div className="text-[11px] text-zinc-400 font-medium">
                نظام إدارة الصالات الرياضية النخبوية • جمهورية مصر العربية
              </div>
            </div>

            {/* Graphic Badge Icon */}
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-[#F4F2FA] flex items-center justify-center text-[#8A6D1C] shadow-inner">
                <IconComponent className="w-10 h-10 text-zinc-800 stroke-[1.5]" />
              </div>
              <div
                className={`w-7 h-7 rounded-full absolute -bottom-1 -right-1 flex items-center justify-center border-2 border-white shadow-sm ${config.badgeColor}`}
              >
                <BadgeIconComponent className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Error Code */}
            <div className="text-5xl sm:text-6xl font-black text-zinc-950 tracking-tight font-serif">
              {config.codeArabic}
            </div>

            {/* Error Title & Description */}
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight">
                {config.title}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed font-normal">
                {config.description}
              </p>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigate('/app/dashboard')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-black bg-zinc-950 text-white hover:bg-zinc-800 shadow-md transition active:scale-95"
              >
                <LayoutGrid className="w-4 h-4 text-[#F4D76A]" />
                <span>العودة إلى لوحة التحكم</span>
              </button>

              <button
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold bg-[#F4F2FA] text-zinc-700 hover:bg-[#EAE6F5] transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>الصفحة السابقة</span>
              </button>
            </div>

            {/* Card Footer Security & Response ID */}
            <div className="pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B8941F]" />
                <span>تشفير اتصالات End-to-End</span>
              </div>

              <div className="font-mono text-zinc-500 font-semibold">
                معرف الاستجابة: {config.responseId}
              </div>

              <div className="flex items-center gap-1 text-zinc-600 font-semibold hover:text-zinc-950 cursor-pointer">
                <Headphones className="w-3.5 h-3.5" />
                <span>الدعم الفني المباشر</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Page Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500 text-center pt-4">
          <span className="hover:text-zinc-800 cursor-pointer transition">سياسة الخصوصية</span>
          <span>•</span>
          <span className="hover:text-zinc-800 cursor-pointer transition">شروط الاستخدام والخدمة</span>
          <span>•</span>
          <span className="hover:text-zinc-800 cursor-pointer transition">مركز عمليات خوادم مصر</span>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
