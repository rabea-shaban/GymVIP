import React, { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helperText?: string
  error?: string
  options?: SelectOption[]
  placeholder?: string
  fullWidth?: boolean
  isRequired?: boolean
  isOptional?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      options,
      placeholder,
      fullWidth = true,
      isRequired,
      isOptional,
      children,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <div className={cn('flex flex-col gap-1.5 text-right font-body', fullWidth ? 'w-full' : 'w-auto')}>
        {label && (
          <div className="flex items-center justify-between text-xs font-semibold text-gym-text">
            <label htmlFor={selectId} className="cursor-pointer">
              {label}
              {(isRequired || props.required) && <span className="text-gym-error mr-1">*</span>}
            </label>
            {isOptional && <span className="text-gym-text-muted font-normal text-[11px]">(اختياري)</span>}
          </div>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'w-full h-11 pr-3.5 pl-9 text-sm bg-gym-surface border border-gym-border rounded-md text-gym-text appearance-none transition-all duration-150',
              'focus:outline-none focus:border-gym-black focus:ring-2 focus:ring-gym-primary/20',
              'disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed cursor-pointer',
              error && 'border-gym-error focus:border-gym-error',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled selected>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute left-3 pointer-events-none text-gym-text-muted flex items-center justify-center">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error ? (
          <span className="text-xs text-gym-error">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-gym-text-muted">{helperText}</span>
        ) : null}
      </div>
    )
  }
)

Select.displayName = 'Select'
