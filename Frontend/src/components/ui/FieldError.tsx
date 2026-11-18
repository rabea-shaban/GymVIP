import React from 'react'
import { AlertCircle } from 'lucide-react'

interface FieldErrorProps {
  error?: string | null
  className?: string
}

export const FieldError: React.FC<FieldErrorProps> = ({ error, className = '' }) => {
  if (!error) return null

  return (
    <div
      className={`flex items-center gap-1.5 text-[11px] sm:text-xs text-rose-600 font-bold mt-1.5 animate-in fade-in slide-in-from-top-1 duration-150 ${className}`}
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
      <span>{error}</span>
    </div>
  )
}
