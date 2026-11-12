import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  color?: 'gold' | 'black' | 'white'
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className, color = 'gold' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  }

  const colors = {
    gold: 'text-gym-gold',
    black: 'text-gym-black',
    white: 'text-white',
  }

  return (
    <Loader2
      className={cn('animate-spin shrink-0', sizes[size], colors[color], className)}
    />
  )
}

export interface LoadingStateProps {
  message?: string
  className?: string
  fullScreen?: boolean
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'جاري تحميل البيانات...',
  className,
  fullScreen = false,
}) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gym-bg/80 backdrop-blur-xs flex flex-col items-center justify-center z-50">
        <Spinner size="xl" />
        {message && <p className="text-sm font-semibold text-zinc-700 mt-4">{message}</p>}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center',
        className
      )}
    >
      <Spinner size="lg" />
      {message && <p className="text-xs text-zinc-500 mt-3 font-medium">{message}</p>}
    </div>
  )
}
