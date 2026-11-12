import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from './Card'
import { cn } from '@/lib/utils'

export type TrendDirection = 'up' | 'down' | 'neutral'

export interface StatCardProps {
  title: string
  value: string | number
  unit?: string
  trend?: TrendDirection
  trendPercentage?: string | number
  trendLabel?: string
  icon?: React.ReactNode
  description?: string
  accentColor?: 'gold' | 'black' | 'success' | 'warning' | 'info'
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  trend,
  trendPercentage,
  trendLabel = 'عن الشهر الماضي',
  icon,
  description,
  accentColor = 'black',
  className,
}) => {
  const iconColors = {
    gold: 'bg-gym-primary/10 text-gym-primary-dark',
    black: 'bg-gym-black text-gym-primary',
    success: 'bg-gym-success-bg text-gym-success-text',
    warning: 'bg-gym-warning-bg text-gym-warning-text',
    info: 'bg-gym-info-bg text-gym-info-text',
  }

  const topAccents = {
    gold: 'gold' as const,
    black: 'black' as const,
    success: 'success' as const,
    warning: 'warning' as const,
    info: 'none' as const,
  }

  return (
    <Card
      variant="default"
      accentBorderTop={topAccents[accentColor]}
      className={cn('relative hover:shadow-md transition-shadow', className)}
    >
      <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
        {/* Top row: Title + Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gym-text-secondary">{title}</span>
            {description && <span className="text-[11px] text-gym-text-muted">{description}</span>}
          </div>

          {icon && (
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconColors[accentColor])}>
              {icon}
            </div>
          )}
        </div>

        {/* Value + Unit */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-tabular-stat text-gym-text">{value}</span>
          {unit && <span className="text-xs font-semibold text-gym-text-muted">{unit}</span>}
        </div>

        {/* Bottom row: Trend badge + Trend comparison label */}
        {trend && (
          <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 text-xs">
            <span
              className={cn(
                'inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded text-[11px]',
                trend === 'up' && 'bg-emerald-50 text-gym-success',
                trend === 'down' && 'bg-red-50 text-gym-error',
                trend === 'neutral' && 'bg-zinc-100 text-gym-text-muted'
              )}
            >
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" />}
              {trend === 'neutral' && <Minus className="w-3 h-3" />}
              <span>{trendPercentage}</span>
            </span>

            {trendLabel && <span className="text-gym-text-muted text-[11px]">{trendLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
