import React, { useState } from 'react'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMediaUrl } from '@/lib/media'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  name?: string
  size?: AvatarSize
  status?: 'online' | 'offline' | 'busy' | 'away'
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  name,
  size = 'md',
  status,
  className,
  ...props
}) => {
  const [hasError, setHasError] = useState(false)

  React.useEffect(() => {
    setHasError(false)
  }, [src])

  const sizes: Record<AvatarSize, string> = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }

  const statusDotSizes: Record<AvatarSize, string> = {
    xs: 'w-1.5 h-1.5 bottom-0 right-0 ring-1',
    sm: 'w-2 h-2 bottom-0 right-0 ring-1.5',
    md: 'w-2.5 h-2.5 bottom-0.5 right-0.5 ring-2',
    lg: 'w-3 h-3 bottom-0.5 right-0.5 ring-2',
    xl: 'w-4 h-4 bottom-1 right-1 ring-2',
  }

  const statusColors = {
    online: 'bg-gym-success',
    offline: 'bg-zinc-400',
    busy: 'bg-gym-error',
    away: 'bg-gym-warning',
  }

  const getInitials = (text?: string) => {
    if (!text) return ''
    const parts = text.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2)
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase()
  }

  const resolvedSrc = getMediaUrl(src)

  return (
    <div className="relative inline-flex shrink-0 select-none">
      <div
        className={cn(
          'relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden bg-gym-black text-gym-primary font-bold font-cairo shadow-xs border border-zinc-800',
          sizes[size],
          className
        )}
        {...props}
      >
        {resolvedSrc && !hasError ? (
          <img
            src={resolvedSrc}
            alt={alt || name || 'صورة المستخدم'}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
          />
        ) : name ? (
          <span>{getInitials(name)}</span>
        ) : (
          <User className="w-1/2 h-1/2 text-gym-primary" />
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute rounded-full ring-white',
            statusDotSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  )
}

export interface AvatarGroupProps {
  children: React.ReactNode
  max?: number
  size?: AvatarSize
  className?: string
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  children,
  max = 4,
  size = 'md',
  className,
}) => {
  const childrenArray = React.Children.toArray(children)
  const visibleAvatars = childrenArray.slice(0, max)
  const remainingCount = childrenArray.length - max

  const excessSizes: Record<AvatarSize, string> = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }

  return (
    <div className={cn('flex items-center -space-x-2 space-x-reverse', className)}>
      {visibleAvatars.map((child, index) => (
        <div key={index} className="ring-2 ring-white rounded-full">
          {child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'relative inline-flex items-center justify-center rounded-full bg-zinc-200 text-gym-text font-bold font-cairo ring-2 ring-white',
            excessSizes[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}
