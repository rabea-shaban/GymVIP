import React, { useState } from 'react'
import { AlertTriangle, Clock, X, Key } from 'lucide-react'
import { useLicense } from '../hooks/useLicense'
import { LicenseLockModal } from './LicenseLockModal'

export const LicenseWarningBanner: React.FC = () => {
  const { license } = useLicense()
  const [dismissed, setDismissed] = useState(false)
  const [showModal, setShowModal] = useState(false)

  if (!license || dismissed) return null

  // If unactivated or expired, LicenseLockModal will handle it
  if (!license.isValid && !license.inGracePeriod) return null

  // Show banner if in grace period or expiring soon (<= 7 days)
  const isExpiringSoon = license.daysRemaining !== undefined && license.daysRemaining <= 7 && license.daysRemaining > 0
  const inGrace = !!license.inGracePeriod

  if (!isExpiringSoon && !inGrace) return null

  return (
    <>
      <div
        dir="rtl"
        className={`w-full px-4 py-2 text-xs font-medium flex items-center justify-between gap-3 transition-colors ${
          inGrace
            ? 'bg-rose-500 text-white'
            : 'bg-amber-500 text-slate-950 font-semibold'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
          {inGrace ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-bounce" />
          ) : (
            <Clock className="w-4 h-4 flex-shrink-0" />
          )}
          <span>
            {inGrace
              ? `⚠️ تنبيه هام: انتهت صلاحية ترخيص GymVIP! أنت حالياً في فترة سماح متبقي منها (${license.daysRemaining} يوم) قبل إيقاف النظام.`
              : `⏳ تنبيه: سينتهي ترخيص البرنامج بعد ${license.daysRemaining} يوم (${license.expiresAt ? new Date(license.expiresAt).toLocaleDateString('ar-EG') : ''}).`}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowModal(true)}
            className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/30 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            تجديد الترخيص
          </button>
          {!inGrace && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded hover:bg-black/10 cursor-pointer transition-colors"
              title="إغلاق التنبيه مؤقتاً"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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
