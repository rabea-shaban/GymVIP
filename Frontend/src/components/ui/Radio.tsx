import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface RadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface RadioGroupProps {
  name: string
  options: RadioOption[]
  value?: string
  onChange?: (value: string) => void
  label?: string
  error?: string
  className?: string
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  label,
  error,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-2 text-right', className)}>
      {label && <span className="text-xs font-semibold text-zinc-700">{label}</span>}
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex items-start gap-2.5 p-3 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-white cursor-pointer transition-all',
              value === option.value && 'border-gym-gold bg-gym-gold/5 ring-1 ring-gym-gold',
              option.disabled && 'opacity-50 cursor-not-allowed bg-zinc-50'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => onChange?.(option.value)}
              className="mt-1 text-gym-black focus:ring-gym-gold h-4 w-4 border-zinc-300"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-zinc-900">{option.label}</span>
              {option.description && (
                <span className="text-xs text-zinc-500 mt-0.5">{option.description}</span>
              )}
            </div>
          </label>
        ))}
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, id, disabled, ...props }, ref) => {
    const radioId = id || (label ? `radio-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <label
        htmlFor={radioId}
        className={cn(
          'inline-flex items-start gap-2 cursor-pointer select-none text-right',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          id={radioId}
          type="radio"
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-4 h-4 text-gym-black focus:ring-gym-gold border-zinc-300 mt-0.5 cursor-pointer',
            className
          )}
          {...props}
        />
        {(label || description) && (
          <div className="flex flex-col">
            {label && <span className="text-sm font-medium text-zinc-800">{label}</span>}
            {description && <span className="text-xs text-zinc-500">{description}</span>}
          </div>
        )}
      </label>
    )
  }
)

Radio.displayName = 'Radio'
