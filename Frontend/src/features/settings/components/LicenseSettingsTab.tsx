import React, { useState } from 'react'
import {
  Key,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Calendar,
  Users,
  Shield,
  Send,
  DollarSign,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { useLicense } from '../../license/hooks/useLicense'
import { LicenseLockModal } from '../../license/components/LicenseLockModal'
import { notifySuccess } from '../../../lib/sweetAlert'

export const LicenseSettingsTab: React.FC = () => {
  const { license, isLoading } = useLicense()
  const [copied, setCopied] = useState(false)
  const [showModal, setShowModal] = useState(false)

  if (isLoading || !license) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 text-sm">
        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin ml-2" />
        جاري تحميل بيانات ترخيص النظام...
      </div>
    )
  }

  const handleCopy = () => {
    if (license.machineId) {
      navigator.clipboard.writeText(license.machineId)
      setCopied(true)
      notifySuccess('تم النسخ!', 'تم نسخ كود بصمة الجهاز إلى الحافظة.')
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const membersPercent =
    license.maxMembers && license.maxMembers > 0
      ? Math.min(100, Math.round(((license.currentMembersCount || 0) / license.maxMembers) * 100))
      : 0

  const whatsappMsg = encodeURIComponent(
    `مرحباً، أود تجديد أو ترقية رخصة برنامج GymVIP.\nكود الجهاز الخاص بي: ${license.machineId}`
  )

  // Status computation
  let statusBadge = {
    label: 'مفعل (Active)',
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  }
  if (license.status === 'EXPIRED') {
    statusBadge = {
      label: 'منتهي (Expired)',
      color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    }
  } else if (license.status === 'MACHINE_MISMATCH' || license.status === 'TAMPERED') {
    statusBadge = {
      label: 'موقوف (Suspended)',
      color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    }
  } else if (license.inGracePeriod || (license.daysRemaining !== undefined && license.daysRemaining <= 7)) {
    statusBadge = {
      label: 'اقترب من الانتهاء (Expiring Soon)',
      color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    }
  }

  const formatDate = (d?: string | null) => {
    if (!d) return 'غير محدد'
    try {
      return new Date(d).toLocaleDateString('ar-EG', { dateStyle: 'long' })
    } catch {
      return d
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner Card - Deep Pure Black & Gold */}
      <div className="bg-[#000000] border border-zinc-800 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
              {license.isValid ? (
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-8 h-8 text-rose-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-bold">{license.gymName || 'نظام GymVIP'}</h3>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold border ${statusBadge.color}`}
                >
                  {statusBadge.label}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                باقة الترخيص:{' '}
                <span className="font-semibold text-white">{license.tier || 'PRO'}</span> — مرخصة
                لهذا الجهاز بعقد حصري
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              <Key className="w-4 h-4 text-amber-400" />
              تحديث / إدخال كود جديد
            </button>
            <a
              href={`https://wa.me/201012345678?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-950/40"
            >
              <Send className="w-4 h-4" />
              طلب تجديد عبر واتساب
            </a>
          </div>
        </div>
      </div>

      {/* Primary Commercial License Specifications Table */}
      <div className="bg-white dark:bg-[#000000] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <Shield className="w-4 h-4 text-amber-400" />
            بيانات ومعلومات ترخيص النظام (System License / Subscription Information)
          </div>
          <span className="text-xs text-slate-400">نسخة تجارية مفعلة ومقيدة بالعتاد</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-bold rounded-r-xl">البيان</th>
                <th className="py-3 px-4 font-bold rounded-l-xl">التفاصيل المعتمدة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-200">
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  حالة النظام (System Status)
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  نوع الترخيص (License Type)
                </td>
                <td className="py-3 px-4 font-bold font-mono text-sm text-primary-600 dark:text-primary-400">
                  {license.tier || 'PRO'}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  تاريخ بداية التفعيل (Activation Date)
                </td>
                <td className="py-3 px-4 font-medium">
                  {formatDate(license.activatedAt)}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  مدة الترخيص (License Duration)
                </td>
                <td className="py-3 px-4 font-bold">
                  {license.durationDays ? `${license.durationDays} يوم` : '365 يوم (سنة كاملة)'}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  المبلغ المدفوع (Amount Paid)
                </td>
                <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                  {license.amountPaid !== undefined && license.amountPaid > 0
                    ? `${Number(license.amountPaid).toLocaleString('ar-EG')} ج.م`
                    : 'مدفوع بالكامل بالعقد'}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  تاريخ انتهاء الترخيص (Expiration Date)
                </td>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                  {formatDate(license.expiresAt)}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                  موعد التجديد (Renewal Date)
                </td>
                <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-400">
                  {formatDate(license.renewalDate || license.expiresAt)}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  الأيام المتبقية (Remaining Days)
                </td>
                <td className="py-3 px-4 font-extrabold text-sm text-emerald-500">
                  {license.daysRemaining !== undefined ? `${license.daysRemaining} يوم` : 'غير محدد'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid of Secondary Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Machine ID */}
        <div className="bg-white dark:bg-[#000000] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Key className="w-4 h-4 text-[#D4AF37]" />
              بصمة الجهاز المعتمدة (Machine ID)
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[#D4AF37] hover:underline inline-flex items-center gap-1 text-[11px] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  تم النسخ
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  نسخ الكود
                </>
              )}
            </button>
          </div>
          <div className="font-mono text-sm font-bold text-slate-800 dark:text-[#D4AF37] bg-slate-50 dark:bg-[#0B0B0B] px-3 py-2.5 rounded-xl border border-slate-100 dark:border-zinc-800 tracking-wide text-center">
            {license.machineId}
          </div>
        </div>

        {/* Member Usage Cap */}
        <div className="bg-white dark:bg-[#000000] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-500" />
              سعة الأعضاء النشطين المسموحة
            </span>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              {license.currentMembersCount || 0} / {license.maxMembers || 500} عضو
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-zinc-900 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                membersPercent >= 90
                  ? 'bg-rose-500'
                  : membersPercent >= 75
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${membersPercent}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 text-left">
            {membersPercent}% من سعة الباقة
          </div>
        </div>
      </div>

      {/* Security Architecture Info */}
      <div className="bg-slate-50 dark:bg-[#000000] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 text-xs text-slate-600 dark:text-zinc-400 space-y-2">
        <div className="font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-500" />
          معايير الحماية والتشفير في رخصة GymVIP:
        </div>
        <p className="leading-relaxed">
          هذه النسخة محمية بتوقيع رقمي غير متماثل (Asymmetric RSA-4096). كود التفعيل مشفر ومربوط
          ببصمة المعالج واللوحة الأم للجهاز لمنع النسخ غير المصرح به، ويعمل بكفاءة تامة بدون الحاجة
          لاتصال دائم بالإنترنت.
        </p>
      </div>

      <LicenseLockModal
        isOpen={showModal}
        isManual={true}
        onClose={() => setShowModal(false)}
      />
    </div>
  )
}

export default LicenseSettingsTab
