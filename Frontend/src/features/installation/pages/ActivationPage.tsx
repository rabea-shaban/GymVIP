import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Key,
  Copy,
  Check,
  Send,
  AlertTriangle,
  ClipboardPaste,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Lock,
} from 'lucide-react'
import { useLicense } from '../../license/hooks/useLicense'
import { notifySuccess } from '../../../lib/sweetAlert'

export const ActivationPage: React.FC = () => {
  const navigate = useNavigate()
  const { license, activate, isActivating } = useLicense()
  const [licenseKeyInput, setLicenseKeyInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [pasteSuccess, setPasteSuccess] = useState(false)

  const cleanKey = (val: string) => {
    return val.trim().replace(/^[`"']+|[`"']+$/g, '').trim()
  }

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

  const machineId = license?.machineId || 'جاري استخراج كود الجهاز...'

  const handleCopyMachineId = () => {
    if (license?.machineId) {
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
      // Browser permission blocked fallback
    }
  }

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    const sanitized = cleanKey(licenseKeyInput)
    if (!sanitized) return

    try {
      await activate(sanitized)
      setLicenseKeyInput('')
      navigate('/setup')
    } catch {
      // Error handled by mutation hook with notifyError
    }
  }

  const whatsappMessage = encodeURIComponent(
    `مرحباً، أود تفعيل نسخة برنامج GymVIP الخاصة بي.\nكود الجهاز الخاص بي هو: ${machineId}`
  )
  const whatsappUrl = `https://wa.me/201012345678?text=${whatsappMessage}`

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full bg-[#000000] text-white flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-cairo selection:bg-[#D4AF37] selection:text-black relative overflow-hidden"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-24 w-96 h-96 bg-amber-500/5 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-xl bg-[#0B0B0B] border border-zinc-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-xl relative z-10">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            المرحلة 2 من 2: تفعيل ترخيص المنظومة
          </div>

          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
              <Key className="w-8 h-8" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            تفعيل نظام GymVIP
          </h1>
          
          {/* Status Badge */}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            حالة النظام: غير مفعل (يتطلب كود الترخيص)
          </div>

          <p className="text-zinc-400 text-xs sm:text-sm mt-3 leading-relaxed">
            هذه النسخة مخصصة للعمل محلياً بصورة تجارية ومحمية بتوقيع رقمي مقفل على عتاد هذا الجهاز. يرجى إدخال كود الترخيص الصادر لك للبدء.
          </p>
        </div>

        {/* Machine ID Box */}
        <div className="bg-[#000000] border border-zinc-800 rounded-2xl p-4 sm:p-5 mb-5 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              بصمة جهازك الفريدة (Machine ID):
            </span>
            <button
              type="button"
              onClick={handleCopyMachineId}
              className="text-xs text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-semibold transition-colors cursor-pointer"
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
          <div className="bg-[#0B0B0B] border border-zinc-800 rounded-xl px-4 py-2.5 text-center font-mono font-extrabold text-amber-300 tracking-wider text-sm sm:text-base select-all">
            {machineId}
          </div>
          <p className="text-[11px] text-zinc-500 mt-2 text-center">
            أرسل هذا الكود إلى مسؤول الترخيص لإصدار مفتاح التفعيل المشفر الخاص بهذا الجهاز.
          </p>
        </div>

        {/* WhatsApp Direct Link */}
        <div className="mb-6">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
          >
            <Send className="w-4 h-4 text-emerald-400" />
            مراسلة الدعم والترخيص عبر واتساب للحصول على الكود
          </a>
        </div>

        {/* Activation Form */}
        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="licenseKeyInput"
                className="block text-xs font-semibold text-zinc-300"
              >
                أدخل كود التفعيل المستلم (License Key): <span className="text-amber-500">*</span>
              </label>
              <div className="flex items-center gap-3">
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
                  className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
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
              id="licenseKeyInput"
              rows={3}
              value={licenseKeyInput}
              onChange={(e) => setLicenseKeyInput(cleanKey(e.target.value))}
              placeholder="GVLIC-eyJsaWNlbnNl..."
              required
              className={`w-full text-xs font-mono px-4 py-3 rounded-2xl border bg-zinc-950 text-white placeholder:text-zinc-600 focus:outline-none transition-all resize-none shadow-sm ${
                validation.type === 'success'
                  ? 'border-emerald-500/80 focus:ring-1 focus:ring-emerald-500'
                  : validation.type === 'error'
                  ? 'border-rose-500/80 focus:ring-1 focus:ring-rose-500'
                  : 'border-zinc-700 focus:ring-1 focus:ring-amber-500'
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
                <span className="text-zinc-500">{validation.message}</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isActivating || !validation.isValid}
            className={`w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-extrabold transition-all duration-200 ${
              !validation.isValid || isActivating
                ? 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-[#D4AF37] hover:bg-[#C29F2F] text-black shadow-xl shadow-[#D4AF37]/25 cursor-pointer active:scale-[0.99]'
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

        <div className="mt-6 pt-5 border-t border-zinc-800 text-center">
          <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            حماية رقمية مشفرة (RSA-4096) تعمل بكفاءة تامة بدون الحاجة لاتصال دائم بالإنترنت.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ActivationPage
