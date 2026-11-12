import React, { forwardRef } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
  error?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, checked, disabled, onChange, ...props }, ref) => {
    const checkboxId = id || (label ? `cb-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={checkboxId}
          className={cn(
            'inline-flex items-start gap-2.5 cursor-pointer select-none text-right',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="relative flex items-center justify-center mt-0.5">
            <input
              id={checkboxId}
              type="checkbox"
              ref={ref}
              checked={checked}
              disabled={disabled}
              onChange={onChange}
              className="peer sr-only"
              {...props}
            />
            <div
              className={cn(
                'w-4 h-4 rounded border border-zinc-300 bg-white transition-all flex items-center justify-center',
                'peer-checked:bg-gym-black peer-checked:border-gym-black',
                'peer-focus:ring-2 peer-focus:ring-gym-gold/40 peer-focus:ring-offset-1',
                error && 'border-red-500',
                className
              )}
            >
              <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
            </div>
          </div>
          {(label || description) && (
            <div className="flex flex-col">
              {label && <span className="text-sm font-medium text-zinc-800">{label}</span>}
              {description && <span className="text-xs text-zinc-500">{description}</span>}
            </div>
          )}
        </label>
        {error && <span className="text-xs text-red-600 mr-6">{error}</span>}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
