import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
  compact?: boolean
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'حدث خطأ أثناء تحميل البيانات',
  message = 'يرجى التحقق من اتصالك بالإنترنت أو إعادة المحاولة لاحقاً',
  onRetry,
  className,
  compact = false,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-xl border border-red-200 bg-red-50/50 p-6',
        compact ? 'py-6 px-4' : 'py-12 px-6',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-red-900 mb-1">{title}</h3>
      {message && <p className="text-xs text-red-600 max-w-sm mb-4">{message}</p>}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          startIcon={<RotateCcw className="w-3.5 h-3.5" />}
          className="border-red-300 text-red-700 hover:bg-red-100/50"
        >
          إعادة المحاولة
        </Button>
      )}
    </div>
  )
}
