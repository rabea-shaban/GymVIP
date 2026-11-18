import React, { useState, useMemo } from 'react'
import {
  ShieldAlert,
  Key,
  Copy,
  Check,
  Send,
  Lock,
  AlertTriangle,
  X,
  ClipboardPaste,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react'
import { useLicense } from '../hooks/useLicense'
import { notifySuccess } from '../../../lib/sweetAlert'

interface LicenseLockModalProps {
  isOpen: boolean
  onClose?: () => void
  isManual?: boolean
}

export const LicenseLockModal: React.FC<LicenseLockModalProps> = ({
  isOpen,
  onClose,
  isManual = false,
}) => {
  const { license, activate, isActivating } = useLicense()
  const [licenseKeyInput, setLicenseKeyInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [pasteSuccess, setPasteSuccess] = useState(false)

  // Clean raw key: strip accidental markdown quotes/backticks/spaces
  const cleanKey = (val: string) => {
    return val.trim().replace(/^[`"']+|[`"']+$/g, '').trim()
  }

  // Live Validation
  const validation = useMemo(() => {
    const trimmed = cleanKey(licenseKeyInput)
    if (!trimmed) {
      return {
        isValid: false,
        message: 'الصيغة المعتمدة: يبدأ بـ GVLIC- متبوعاً بكود البيانات والتوقيع الرقمي',
        type: 'neutral' as const,
      }
    }
    if (!trimmed.startsWith('GVLIC-')) {
      return {
        isValid: false,
        message: 'تنبيه: كود التفعيل يجب أن يبدأ بـ GVLIC-',
        type: 'error' as const,
      }
    }
    const token = trimmed.slice(6)
    const dotIndex = token.indexOf('.')
    if (dotIndex === -1 || dotIndex === 0 || dotIndex === token.length - 1) {
      return {
        isValid: false,
        message: 'تنبيه: الكود ناقص (يجب أن يحتوي على نقطة فاصلة بين البيانات والتوقيع)',
        type: 'error' as const,
      }
    }
    if (trimmed.length < 80) {
      return {
        isValid: false,
        message: 'تنبيه: طول الكود قصير جداً، تأكد من نسخه بالكامل',
        type: 'error' as const,
      }
    }
    return {
      isValid: true,
      message: 'صيغة الكود مكتملة ومطابقة للمواصفات ✓',
      type: 'success' as const,
    }
  }, [licenseKeyInput])

  if (!isOpen || !license) return null

  // If active, valid, and not manually requested, do not force display
  if (!isManual && license.isValid && !license.inGracePeriod) return null

  const machineId = license.machineId || 'جاري استخراج كود الجهاز...'

  const handleCopyMachineId = () => {
    if (license.machineId) {
      navigator.clipboard.writeText(license.machineId)
      setCopied(true)
      notifySuccess('تم النسخ!', 'تم نسخ كود الجهاز إلى الحافظة بنجاح.')
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setLicenseKeyInput(cleanKey(text))
        setPasteSuccess(true)
        setTimeout(() => setPasteSuccess(false), 2000)
      }
    } catch {
      // Fallback if browser permission is blocked
    }
  }

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    const sanitized = cleanKey(licenseKeyInput)
    if (!sanitized) return

    try {
      await activate(sanitized)
      setLicenseKeyInput('')
      if (onClose) onClose()
    } catch {
      // Error handled by mutation hook with notifyError
    }
  }

  const whatsappMessage = encodeURIComponent(
    `مرحباً، أود تفعيل أو تجديد رخصة برنامج GymVIP.\nكود الجهاز الخاص بي هو: ${machineId}`
  )
  const whatsappUrl = `https://wa.me/201012345678?text=${whatsappMessage}`

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300"
    >
      <div className="relative w-full max-w-xl bg-[#0B0B0B] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Close Button if manually opened */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors z-20 cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Modal Content */}
        <div className="p-6 sm:p-8">
          {/* Badge & Title */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mb-4 shadow-lg shadow-[#D4AF37]/10">
              {license.status === 'EXPIRED' ? (
                <ShieldAlert className="w-8 h-8 text-rose-500" />
              ) : (
                <Lock className="w-8 h-8 text-[#D4AF37]" />
              )}
            </div>

            <h2 className="text-2xl font-black text-white">
              {isManual
                ? 'تحديث / إدخال كود ترخيص جديد'
                : license.status === 'EXPIRED'
                ? 'انتهت صلاحية ترخيص GymVIP'
                : 'تفعيل نسخة نظام GymVIP'}
            </h2>
            <p className="mt-2 text-sm text-zinc-400 max-w-md">
              {isManual
                ? 'يمكنك هنا إدخال كود ترخيص جديد لتجديد الاشتراك، ترقية الباقة، أو تغيير مدة الصلاحية.'
                : license.message ||
                  'هذه النسخة مخصصة لجهازك وتتطلب كود تفعيل مشفر لتشغيل واستخدام كافة خدمات النادي الرياضي.'}
            </p>
          </div>

          {/* Machine ID Box */}
          <div className="mt-6 bg-[#000000] border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#D4AF37]" />
                بصمة جهازك الفريدة (Machine ID):
              </span>
              <button
                type="button"
                onClick={handleCopyMachineId}
                className="text-xs inline-flex items-center gap-1 text-[#D4AF37] hover:text-amber-300 font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
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
            <div className="bg-[#0B0B0B] border border-zinc-800 rounded-xl px-3 py-2 text-center font-mono font-extrabold text-[#D4AF37] tracking-wider text-sm select-all shadow-inner">
              {machineId}
            </div>
          </div>

          {/* WhatsApp Direct Contact Button */}
          <div className="mt-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 text-sm font-semibold transition-all shadow-sm"
            >
              <Send className="w-4 h-4 text-emerald-400" />
              مراسلة الدعم عبر واتساب لطلب كود التفعيل
            </a>
          </div>

          {/* Activation Form */}
          <form onSubmit={handleActivate} className="mt-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="licenseKey"
                  className="block text-xs font-semibold text-zinc-300"
                >
                  أدخل كود التفعيل المستلم:
                </label>
                <div className="flex items-center gap-2">
                  {licenseKeyInput && (
                    <button
                      type="button"
                      onClick={() => setLicenseKeyInput('')}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      مسح
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="text-[11px] text-[#D4AF37] hover:text-amber-300 hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {pasteSuccess ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        تم اللصق
                      </>
                    ) : (
                      <>
                        <ClipboardPaste className="w-3 h-3" />
                        لصق من الحافظة
                      </>
                    )}
                  </button>
                </div>
              </div>

              <textarea
                id="licenseKey"
                rows={3}
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(cleanKey(e.target.value))}
                placeholder="GVLIC-eyJsaWNlbnNl..."
                required
                className={`w-full text-xs font-mono px-3.5 py-3 rounded-2xl border bg-[#000000] text-white placeholder:text-zinc-600 focus:outline-none transition-all resize-none shadow-sm ${
                  validation.type === 'success'
                    ? 'border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30'
                    : validation.type === 'error'
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                    : 'border-zinc-800 focus:ring-1 focus:ring-[#D4AF37]/30'
                }`}
              />

              {/* Live Validation Feedback Pill */}
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                {validation.type === 'success' ? (
                  <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {validation.message}
                  </span>
                ) : validation.type === 'error' ? (
                  <span className="text-rose-400 font-medium inline-flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {validation.message}
                  </span>
                ) : (
                  <span className="text-zinc-500">
                    {validation.message}
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isActivating || !validation.isValid}
              className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-extrabold transition-all duration-200 ${
                !validation.isValid || isActivating
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
                  تفعيل وتشغيل النظام الآن
                </>
              )}
            </button>
          </form>

          {/* Grace period notice if applicable */}
          {license.inGracePeriod && (
            <div className="mt-4 p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
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
