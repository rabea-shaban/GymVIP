import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  error?: string
  fullWidth?: boolean
  isRequired?: boolean
  isOptional?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      fullWidth = true,
      isRequired,
      isOptional,
      disabled,
      rows = 3,
      id,
      ...props
    },
    ref
  ) => {
    const textareaId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <div className={cn('flex flex-col gap-1.5 text-right font-body', fullWidth ? 'w-full' : 'w-auto')}>
        {label && (
          <div className="flex items-center justify-between text-xs font-semibold text-gym-text">
            <label htmlFor={textareaId} className="cursor-pointer">
              {label}
              {(isRequired || props.required) && <span className="text-gym-error mr-1">*</span>}
            </label>
            {isOptional && <span className="text-gym-text-muted font-normal text-[11px]">(اختياري)</span>}
          </div>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          className={cn(
            'w-full p-3 text-sm bg-gym-surface border border-gym-border rounded-md text-gym-text placeholder:text-gym-text-muted transition-all duration-150 resize-y',
            'focus:outline-none focus:border-gym-black focus:ring-2 focus:ring-gym-primary/20',
            'disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed',
            error && 'border-gym-error focus:border-gym-error',
            className
          )}
          {...props}
        />
        {error ? (
          <span className="text-xs text-gym-error">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-gym-text-muted">{helperText}</span>
        ) : null}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
