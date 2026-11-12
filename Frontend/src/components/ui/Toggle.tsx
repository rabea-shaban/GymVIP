import React from 'react'
import { cn } from '@/lib/utils'

export interface ToggleProps {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  disabled?: boolean
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'gold'
  className?: string
  startIcon?: React.ReactNode
}

export const Toggle: React.FC<ToggleProps> = ({
  pressed,
  onPressedChange,
  disabled = false,
  children,
  size = 'md',
  variant = 'default',
  className,
  startIcon,
}) => {
  const sizes = {
    sm: 'h-8 px-2.5 text-xs gap-1.5',
    md: 'h-10 px-3.5 text-sm gap-2',
    lg: 'h-11 px-4 text-base gap-2.5',
  }

  const variants = {
    default: pressed
      ? 'bg-gym-black text-white'
      : 'bg-transparent text-gym-text-secondary hover:bg-zinc-100 hover:text-gym-text',
    outline: pressed
      ? 'bg-zinc-900 text-white border-zinc-900'
      : 'bg-transparent border border-gym-border text-gym-text hover:bg-zinc-50',
    gold: pressed
      ? 'bg-gym-primary text-gym-black font-bold shadow-gold'
      : 'bg-transparent text-gym-text hover:bg-gym-primary/10',
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      disabled={disabled}
      onClick={() => !disabled && onPressedChange(!pressed)}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed',
        sizes[size],
        variants[variant],
        className
      )}
    >
      {startIcon && <span className="shrink-0">{startIcon}</span>}
      <span>{children}</span>
    </button>
  )
}
