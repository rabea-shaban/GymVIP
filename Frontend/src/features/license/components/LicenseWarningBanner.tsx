import React, { useState } from 'react'
import { AlertTriangle, Clock, X, Key } from 'lucide-react'
import { useLicense } from '../hooks/useLicense'
import { LicenseLockModal } from './LicenseLockModal'

export const LicenseWarningBanner: React.FC = () => {
  const { license } = useLicense()
  const [dismissed, setDismissed] = useState(false)
  const [showModal, setShowModal] = useState(false)

  if (!license || dismissed) return null

  // If unactivated or expired past grace, LicenseLockModal will handle blocking
  if (!license.isValid && !license.inGracePeriod) return null

  // Show banner if in grace period or expiring soon (<= 7 days)
  const isExpiringSoon =
    license.daysRemaining !== undefined && license.daysRemaining <= 7 && license.daysRemaining > 0
  const inGrace = !!license.inGracePeriod

  if (!isExpiringSoon && !inGrace) return null

  const formattedDate = license.expiresAt
    ? new Date(license.expiresAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      })
    : ''

  return (
    <>
      <div
        dir="rtl"
        className={`w-full px-4 sm:px-6 py-2.5 text-xs transition-all border-b shadow-sm ${
          inGrace
            ? 'bg-[#0B0B0B] border-rose-500/40 text-rose-200'
            : 'bg-[#0B0B0B] border-[#D4AF37]/30 text-zinc-200'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Information & Tag */}
          <div className="flex items-center gap-3 overflow-hidden text-right">
            {inGrace ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center gap-1.5 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                فترة سماح مؤقتة
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1.5 shrink-0">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {license.daysRemaining === 1 ? 'متبقي يوم واحد' : `متبقي ${license.daysRemaining} أيام`}
              </span>
            )}

            <p className="text-xs text-zinc-300 truncate font-medium">
              {inGrace
                ? `انتهت صلاحية الترخيص! متبقي (${license.daysRemaining} يوم) من فترة السماح قبل توقف خدمات المنظومة.`
                : `سينتهي ترخيص البرنامج بتاريخ (${formattedDate}). يمكنك التجديد الآن لضمان استمرار الخدمة دون توقف.`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ${
                inGrace
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-[#D4AF37] hover:bg-[#C29F2F] text-black shadow-amber-500/10'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>تجديد الترخيص</span>
            </button>

            {!inGrace && (
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                title="إغلاق التنبيه مؤقتاً"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <LicenseLockModal
        isOpen={showModal}
        isManual={true}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}

export default LicenseWarningBanner
