import React, { forwardRef } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  helperText?: string
  error?: string
  fullWidth?: boolean
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      fullWidth = true,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `date-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <div className={cn('flex flex-col gap-1.5 text-right', fullWidth ? 'w-full' : 'w-auto')}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-zinc-700">
            {label}
            {props.required && <span className="text-red-500 mr-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          <div className="absolute right-3 pointer-events-none text-zinc-400 flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <input
            id={inputId}
            type="date"
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full h-10 pr-10 pl-3.5 text-sm bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder:text-zinc-400 transition-colors',
              'focus:outline-none focus:border-gym-gold focus:ring-1 focus:ring-gym-gold',
              'disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed cursor-pointer',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <span className="text-xs text-red-600 mt-0.5">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-zinc-500 mt-0.5">{helperText}</span>
        ) : null}
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'
