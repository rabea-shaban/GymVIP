import React from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant =
  | 'gold'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'black'
  | 'outline'

export type GymStatus =
  | 'active'        // نشط
  | 'expired'       // منتهي
  | 'frozen'        // مجمد
  | 'pending'       // معلق
  | 'paid'          // مدفوع
  | 'unpaid'        // غير مدفوع
  | 'partial'       // مدفوع جزئياً

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  status?: GymStatus
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  status,
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  // Map preset Gym status to variants & default Arabic labels if no children provided
  let computedVariant: BadgeVariant = variant || 'neutral'
  let defaultLabel = children

  if (status) {
    switch (status) {
      case 'active':
      case 'paid':
        computedVariant = 'success'
        defaultLabel = children || (status === 'active' ? 'نشط' : 'مدفوع')
        break
      case 'expired':
      case 'unpaid':
        computedVariant = 'error'
        defaultLabel = children || (status === 'expired' ? 'منتهي' : 'غير مدفوع')
        break
      case 'frozen':
        computedVariant = 'info'
        defaultLabel = children || 'مجمد'
        break
      case 'pending':
      case 'partial':
        computedVariant = 'warning'
        defaultLabel = children || (status === 'pending' ? 'معلق' : 'مدفوع جزئياً')
        break
    }
  }

  const variants: Record<BadgeVariant, string> = {
    gold: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
    success: 'bg-gym-success-bg text-gym-success-text border border-emerald-200/80 font-semibold',
    warning: 'bg-gym-warning-bg text-gym-warning-text border border-amber-200/80 font-semibold',
    error: 'bg-gym-error-bg text-gym-error-text border border-red-200/80 font-semibold',
    info: 'bg-gym-info-bg text-gym-info-text border border-blue-200/80 font-semibold',
    neutral: 'bg-zinc-100 text-gym-text-secondary border border-gym-border font-medium',
    black: 'bg-gym-black text-white font-semibold',
    outline: 'bg-transparent text-gym-text border border-gym-border font-medium',
  }

  const dotColors: Record<BadgeVariant, string> = {
    gold: 'bg-amber-600',
    success: 'bg-gym-success',
    warning: 'bg-gym-warning',
    error: 'bg-gym-error',
    info: 'bg-gym-info',
    neutral: 'bg-zinc-400',
    black: 'bg-white',
    outline: 'bg-gym-text-muted',
  }

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 rounded-pill gap-1',
    md: 'text-xs px-2.5 py-1 rounded-pill gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 rounded-pill gap-2',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center select-none shrink-0 font-body transition-colors',
        variants[computedVariant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[computedVariant])} />}
      <span>{defaultLabel}</span>
    </span>
  )
}
