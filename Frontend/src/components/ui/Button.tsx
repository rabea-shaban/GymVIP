import React, { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ButtonVariant =
  | 'primary'      // Black background, White text, gold hover/accent
  | 'gold'         // Gold background (#D4AF37), Black text (#0B0B0B)
  | 'secondary'    // Light neutral background (#F4F4F5), Dark text
  | 'outline'      // Transparent, Border (#E4E4E7), Dark text
  | 'ghost'        // Minimal transparent, hover neutral
  | 'danger'       // Red (#DC2626), White text
  | 'success'      // Green (#16A34A), White text

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  isIconOnly?: boolean
  fullWidth?: boolean
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isIconOnly = false,
      fullWidth = false,
      disabled,
      startIcon,
      endIcon,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gym-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]'

    const variants: Record<ButtonVariant, string> = {
      primary:
        'bg-gym-black text-white hover:bg-zinc-800 hover:border-zinc-700 active:bg-zinc-900 border border-zinc-900 shadow-sm',
      gold:
        'bg-gym-primary text-gym-black hover:bg-gym-primary-hover active:bg-gym-primary-dark font-bold shadow-sm hover:shadow-gold',
      secondary:
        'bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80 active:bg-zinc-300/80 border border-zinc-200/60',
      outline:
        'bg-transparent border border-gym-border text-gym-text hover:bg-zinc-100/80 hover:border-zinc-300 active:bg-zinc-200/60',
      ghost:
        'bg-transparent text-gym-text-secondary hover:text-gym-text hover:bg-zinc-100 active:bg-zinc-200/60',
      danger:
        'bg-gym-error text-white hover:bg-red-700 active:bg-red-800 shadow-sm focus-visible:ring-red-500',
      success:
        'bg-gym-success text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm focus-visible:ring-emerald-500',
    }

    const sizes: Record<ButtonSize, string> = {
      sm: isIconOnly ? 'w-8 h-8 p-0 text-xs' : 'text-xs px-3 py-1.5 gap-1.5 h-8',
      md: isIconOnly ? 'w-10 h-10 p-0 text-sm' : 'text-sm px-4 py-2 gap-2 h-10',
      lg: isIconOnly ? 'w-12 h-12 p-0 text-base' : 'text-base px-5 py-2.5 gap-2.5 h-12',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
        ) : startIcon ? (
          <span className="shrink-0 flex items-center justify-center">{startIcon}</span>
        ) : null}

        {(!isIconOnly || !isLoading) && children && <span>{children}</span>}

        {!isLoading && endIcon ? (
          <span className="shrink-0 flex items-center justify-center">{endIcon}</span>
        ) : null}
      </button>
    )
  }
)

Button.displayName = 'Button'
