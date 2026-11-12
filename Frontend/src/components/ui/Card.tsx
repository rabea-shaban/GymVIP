import React from 'react'
import { cn } from '@/lib/utils'

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'interactive'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  accentBorderTop?: 'gold' | 'black' | 'success' | 'warning' | 'error' | 'none'
  hoverEffect?: boolean
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'default',
  accentBorderTop = 'none',
  hoverEffect = false,
  children,
  ...props
}) => {
  const variants: Record<CardVariant, string> = {
    default: 'bg-gym-surface rounded-lg border border-gym-border shadow-sm',
    elevated: 'bg-gym-surface rounded-lg border border-gym-border/80 shadow-md',
    outlined: 'bg-gym-surface rounded-lg border-2 border-gym-border shadow-none',
    interactive:
      'bg-gym-surface rounded-lg border border-gym-border shadow-sm hover:shadow-md hover:border-zinc-400/80 transition-all duration-200 cursor-pointer',
  }

  const topBorders = {
    none: '',
    gold: 'border-t-3 border-t-gym-primary',
    black: 'border-t-3 border-t-gym-black',
    success: 'border-t-3 border-t-gym-success',
    warning: 'border-t-3 border-t-gym-warning',
    error: 'border-t-3 border-t-gym-error',
  }

  return (
    <div
      className={cn(
        'text-right overflow-hidden',
        variants[variant],
        topBorders[accentBorderTop],
        hoverEffect && 'hover:shadow-md hover:border-zinc-300 transition-all duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div className={cn('p-5 border-b border-gym-border-subtle flex flex-col gap-1', className)} {...props}>
      {children}
    </div>
  )
}

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, children, ...props }) => {
  return (
    <h3 className={cn('text-base font-bold font-cairo text-gym-text tracking-tight', className)} {...props}>
      {children}
    </h3>
  )
}

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, children, ...props }) => {
  return (
    <p className={cn('text-xs text-gym-text-muted font-body', className)} {...props}>
      {children}
    </p>
  )
}

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div className={cn('p-5 font-body', className)} {...props}>
      {children}
    </div>
  )
}

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div className={cn('p-5 pt-0 flex items-center justify-between gap-3 font-body', className)} {...props}>
      {children}
    </div>
  )
}
