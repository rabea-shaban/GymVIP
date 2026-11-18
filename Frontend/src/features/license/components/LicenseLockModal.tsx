import React, { useState } from 'react'
import {
  ShieldAlert,
  Key,
  Copy,
  Check,
  Send,
  Lock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { useLicense } from '../hooks/useLicense'
import { notifySuccess } from '../../../lib/sweetAlert'

interface LicenseLockModalProps {
  isOpen: boolean
}

export const LicenseLockModal: React.FC<LicenseLockModalProps> = ({ isOpen }) => {
  const { license, activate, isActivating } = useLicense()
  const [licenseKeyInput, setLicenseKeyInput] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isOpen || !license) return null

  // If active and valid, don't show the modal
  if (license.isValid && !license.inGracePeriod) return null

  const machineId = license.machineId || 'جاري استخراج كود الجهاز...'

  const handleCopyMachineId = () => {
    if (license.machineId) {
      navigator.clipboard.writeText(license.machineId)
      setCopied(true)
      notifySuccess('تم النسخ!', 'تم نسخ كود الجهاز إلى الحافظة بنجاح.')
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!licenseKeyInput.trim()) return
    try {
      await activate(licenseKeyInput.trim())
      setLicenseKeyInput('')
    } catch {
      // Error handled by mutation hook
    }
  }

  const whatsappMessage = encodeURIComponent(
    `مرحباً، أود تفعيل أو تجديد رخصة برنامج GymVIP.\nكود الجهاز الخاص بي هو: ${machineId}`
  )
  const whatsappUrl = `https://wa.me/201012345678?text=${whatsappMessage}`

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header Ribbon */}
        <div className="h-3 w-full bg-gradient-to-r from-amber-500 via-primary-600 to-indigo-600" />

        <div className="p-6 sm:p-8">
          {/* Badge & Title */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
              {license.status === 'EXPIRED' ? (
                <ShieldAlert className="w-8 h-8" />
              ) : (
                <Lock className="w-8 h-8" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {license.status === 'EXPIRED'
                ? 'انتهت صلاحية ترخيص GymVIP'
                : 'تفعيل نسخة نظام GymVIP'}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md">
              {license.message ||
                'هذه النسخة مخصصة لجهازك وتتطلب كود تفعيل مشفر لتشغيل واستخدام كافة خدمات النادي الرياضي.'}
            </p>
          </div>

          {/* Machine ID Box */}
          <div className="mt-6 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-primary-500" />
                بصمة جهازك الفريدة (Machine ID):
              </span>
              <button
                type="button"
                onClick={handleCopyMachineId}
                className="text-xs inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium px-2 py-1 rounded-md hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors"
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
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-center font-mono font-bold text-slate-800 dark:text-slate-100 tracking-wider text-sm select-all">
              {machineId}
            </div>
          </div>

          {/* WhatsApp Direct Contact Button */}
          <div className="mt-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-sm font-medium transition-all shadow-sm"
            >
              <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              مراسلة الدعم عبر واتساب لطلب كود التفعيل
            </a>
          </div>

          {/* Activation Form */}
          <form onSubmit={handleActivate} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="licenseKey"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                أدخل كود التفعيل المستلم:
              </label>
              <textarea
                id="licenseKey"
                rows={3}
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                placeholder="GVLIC-eyJsaWNlbnNl..."
                required
                className="w-full text-xs font-mono px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isActivating || !licenseKeyInput.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isActivating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري التحقق من كود التفعيل...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  تفعيل وتشغيل النظام الآن
                </>
              )}
            </button>
          </form>

          {/* Grace period notice if applicable */}
          {license.inGracePeriod && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
              <span>
                تنبيه: النظام يعمل حالياً في فترة سماح مؤقتة لمدة {license.daysRemaining} يوم قبل الإيقاف التام.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
