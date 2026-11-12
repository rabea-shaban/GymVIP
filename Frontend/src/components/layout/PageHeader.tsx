import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}) => {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex flex-col gap-1 text-right">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-400 mb-0.5">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <React.Fragment key={crumb.label + idx}>
                  {crumb.href && !isLast ? (
                    <Link
                      to={crumb.href}
                      className="hover:text-gym-gold transition-colors text-zinc-500 font-medium"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={cn(isLast ? 'text-zinc-800 font-semibold' : 'text-zinc-500')}>
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />}
                </React.Fragment>
              )
            })}
          </nav>
        )}
        <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">{title}</h1>
        {description && <p className="text-xs sm:text-sm text-zinc-500">{description}</p>}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0">
          {actions}
        </div>
      )}
    </div>
  )
}
