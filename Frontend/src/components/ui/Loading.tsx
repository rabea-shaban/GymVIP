import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from './Skeleton'
import { Card, CardContent } from './Card'

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  color?: 'gold' | 'black' | 'white' | 'muted'
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className, color = 'gold' }) => {
  const sizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  }

  const colors = {
    gold: 'text-gym-primary-dark',
    black: 'text-gym-black',
    white: 'text-white',
    muted: 'text-gym-text-muted',
  }

  return <Loader2 className={cn('animate-spin shrink-0', sizes[size], colors[color], className)} />
}

export const ButtonLoader: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'sm' }) => {
  return <Loader2 className={cn('animate-spin text-current shrink-0', size === 'sm' ? 'w-4 h-4' : 'w-5 h-5')} />
}

export const PageLoader: React.FC<{ message?: string }> = ({ message = 'جاري تهيئة النظام...' }) => {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center font-body">
      <div className="w-14 h-14 rounded-2xl bg-gym-black flex items-center justify-center shadow-gold mb-4">
        <Spinner size="lg" color="gold" />
      </div>
      <h3 className="text-sm font-bold font-cairo text-gym-text">{message}</h3>
      <p className="text-xs text-gym-text-muted mt-1">GymVIP Design System</p>
    </div>
  )
}

export const CardSkeleton: React.FC = () => {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton variant="circular" className="w-9 h-9" />
        </div>
        <Skeleton className="h-8 w-20" />
        <div className="pt-2 border-t border-zinc-100 flex items-center gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}
