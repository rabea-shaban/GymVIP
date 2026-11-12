import React from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
  className?: string
  id?: string
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  className,
  id,
}) => {
  const switchId = id || (label ? `switch-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

  return (
    <div className={cn('flex items-center justify-between gap-4 select-none', className)}>
      {(label || description) && (
        <label
          htmlFor={switchId}
          className={cn('flex flex-col text-right cursor-pointer', disabled && 'cursor-not-allowed opacity-60')}
        >
          {label && <span className="text-sm font-medium text-zinc-900">{label}</span>}
          {description && <span className="text-xs text-zinc-500">{description}</span>}
        </label>
      )}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gym-gold focus:ring-offset-2',
          checked ? 'bg-gym-black' : 'bg-zinc-200',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
            checked ? '-translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  )
}
