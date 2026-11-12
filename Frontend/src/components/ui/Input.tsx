import React, { forwardRef } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type InputState = 'default' | 'error' | 'success'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  successMessage?: string
  state?: InputState
  isRequired?: boolean
  isOptional?: boolean
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      helperText,
      error,
      successMessage,
      state: controlledState,
      isRequired,
      isOptional,
      startIcon,
      endIcon,
      fullWidth = true,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    const computedState: InputState = error
      ? 'error'
      : successMessage
      ? 'success'
      : controlledState || 'default'

    return (
      <div className={cn('flex flex-col gap-1.5 text-right font-body', fullWidth ? 'w-full' : 'w-auto')}>
        {label && (
          <div className="flex items-center justify-between text-xs font-semibold text-gym-text">
            <label htmlFor={inputId} className="cursor-pointer">
              {label}
              {isRequired && <span className="text-gym-error mr-1">*</span>}
            </label>
            {isOptional && <span className="text-gym-text-muted font-normal text-[11px]">(اختياري)</span>}
          </div>
        )}

        <div className="relative flex items-center">
          {startIcon && (
            <div className="absolute right-3 pointer-events-none text-gym-text-muted flex items-center justify-center shrink-0">
              {startIcon}
            </div>
          )}

          <input
            id={inputId}
            type={type}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full h-11 px-3.5 text-sm bg-gym-surface border border-gym-border rounded-md text-gym-text placeholder:text-gym-text-muted transition-all duration-150',
              'focus:outline-none focus:border-gym-black focus:ring-2 focus:ring-gym-primary/20',
              'disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed',
              startIcon && 'pr-10',
              (endIcon || computedState === 'error' || computedState === 'success') && 'pl-10',
              computedState === 'error' &&
                'border-gym-error focus:border-gym-error focus:ring-red-500/20 text-gym-error',
              computedState === 'success' &&
                'border-gym-success focus:border-gym-success focus:ring-emerald-500/20',
              className
            )}
            {...props}
          />

          <div className="absolute left-3 flex items-center justify-center gap-1.5 pointer-events-none">
            {computedState === 'error' && (
              <AlertCircle className="w-4 h-4 text-gym-error shrink-0" />
            )}
            {computedState === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-gym-success shrink-0" />
            )}
            {endIcon && <span className="text-gym-text-muted">{endIcon}</span>}
          </div>
        </div>

        {error ? (
          <span className="text-xs text-gym-error font-medium">{error}</span>
        ) : successMessage ? (
          <span className="text-xs text-gym-success font-medium">{successMessage}</span>
        ) : helperText ? (
          <span className="text-xs text-gym-text-muted">{helperText}</span>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'
