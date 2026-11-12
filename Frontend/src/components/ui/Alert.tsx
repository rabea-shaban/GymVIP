import React from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AlertVariant = 'success' | 'warning' | 'error' | 'info'

export interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: React.ReactNode
  onClose?: () => void
  icon?: React.ReactNode
  className?: string
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  icon,
  className,
}) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-gym-success shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-gym-warning shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-gym-error shrink-0" />,
    info: <Info className="w-5 h-5 text-gym-info shrink-0" />,
  }

  const styles: Record<AlertVariant, string> = {
    success:
      'bg-gym-success-bg border-r-4 border-r-gym-success border-emerald-200/80 text-gym-success-text',
    warning:
      'bg-gym-warning-bg border-r-4 border-r-gym-warning border-amber-200/80 text-gym-warning-text',
    error:
      'bg-gym-error-bg border-r-4 border-r-gym-error border-red-200/80 text-gym-error-text',
    info:
      'bg-gym-info-bg border-r-4 border-r-gym-info border-blue-200/80 text-gym-info-text',
  }

  return (
    <div
      role="alert"
      className={cn(
        'p-4 rounded-lg border flex items-start gap-3 text-right font-body transition-all',
        styles[variant],
        className
      )}
    >
      <div className="pt-0.5">{icon || icons[variant]}</div>

      <div className="flex-1">
        {title && <h4 className="text-sm font-bold font-cairo mb-0.5">{title}</h4>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-current opacity-60 hover:opacity-100 p-1 rounded transition-opacity"
          aria-label="إغلاق التنبيه"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
