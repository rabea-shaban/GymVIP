import React, { useState } from 'react'
import { AlertTriangle, Ban, X, Loader2 } from 'lucide-react'
import { subscriptionsApi } from '../services/subscriptionsApi'

interface CancelSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  subscriptionId: string
  memberName?: string
  planName?: string
}

export const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  subscriptionId,
  memberName,
  planName,
}) => {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleClose = () => {
    if (isSubmitting) return
    setReason('')
    setNotes('')
    setErrorMessage(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedReason = reason.trim()
    if (!trimmedReason || trimmedReason.length < 3) {
      setErrorMessage('سبب الإلغاء مطلوب ويجب ألا يقل عن 3 أحرف')
      return
    }

    if (trimmedReason.length > 250) {
      setErrorMessage('سبب الإلغاء يجب ألا يتجاوز 250 حرفاً')
      return
    }

    if (notes.trim().length > 1000) {
      setErrorMessage('الملاحظات الإدارية يجب ألا تتجاوز 1000 حرف')
      return
    }

    try {
      setIsSubmitting(true)
      await subscriptionsApi.cancel(subscriptionId, {
        reason: trimmedReason,
        notes: notes.trim() || null,
      })
      onSuccess()
      handleClose()
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'حدث خطأ أثناء محاولة إلغاء الاشتراك، يرجى إعادة المحاولة'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in font-cairo">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-5 text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-950">إلغاء الاشتراك نهائياً</h3>
              <p className="text-xs text-zinc-500 font-medium">
                {memberName ? `للعضو: ${memberName}` : 'التحكم الإداري في العضوية'}
                {planName ? ` • باقة: ${planName}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-xl hover:bg-zinc-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Caution Alert */}
        <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-4 flex items-start gap-3 text-rose-900">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed font-semibold">
            <span className="font-black block text-rose-950 mb-0.5">تنبيه هام ومحدد:</span>
            إلغاء الاشتراك هو إجراء نهائي غير قابل للتراجع. سيتم منع العضو من تسجيل الدخول أو التجميد أو التجديد لهذا الاشتراك، مع الحفاظ التام على السجل المالي والعمليات الرقابية السابقة.
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="bg-rose-100/80 border border-rose-300 text-rose-900 px-3.5 py-2.5 rounded-xl text-xs font-bold">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-zinc-800 mb-1.5">
              سبب الإلغاء الإجباري <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: طلب العضو الإلغاء لظروف صحية / انتقال لمحافظة أخرى"
              maxLength={250}
              disabled={isSubmitting}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-semibold text-zinc-950 focus:bg-white focus:border-rose-600 focus:outline-none transition"
            />
            <div className="flex justify-between text-[11px] text-zinc-400 mt-1">
              <span>يجب أن يتكون السبب من 3 إلى 250 حرفاً</span>
              <span>{reason.trim().length} / 250</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-zinc-800 mb-1.5">
              ملاحظات إضافية إدارية (اختياري)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل أو وثائق ذات صلة بقرار الإلغاء..."
              maxLength={1000}
              disabled={isSubmitting}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-semibold text-zinc-950 focus:bg-white focus:border-rose-600 focus:outline-none transition resize-none"
            />
            <div className="flex justify-between text-[11px] text-zinc-400 mt-1">
              <span>حد أقصى 1000 حرف</span>
              <span>{notes.trim().length} / 1000</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition"
            >
              تراجع
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 3}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-rose-600 text-white hover:bg-rose-700 shadow-sm transition disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الإلغاء...</span>
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4" />
                  <span>تأكيد إلغاء الاشتراك</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
