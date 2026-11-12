import React from 'react'
import { FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  actionIcon?: React.ReactNode
  className?: string
  compact?: boolean
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className,
  compact = false,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-zinc-300 bg-white/50 p-8',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-4">
        {icon || <FolderOpen className="w-6 h-6 text-zinc-400" />}
      </div>
      <h3 className="text-base font-bold text-zinc-900 mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="sm"
          onClick={onAction}
          startIcon={actionIcon}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
