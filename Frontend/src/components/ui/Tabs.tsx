import React from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: string | number
  disabled?: boolean
}

export interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (tabId: string) => void
  variant?: 'default' | 'pills' | 'underline'
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto select-none font-body',
        variant === 'underline' && 'border-b border-gym-border gap-2',
        variant === 'default' && 'p-1 bg-zinc-100 rounded-lg',
        variant === 'pills' && 'gap-2',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id

        if (variant === 'underline') {
          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all whitespace-nowrap',
                isActive
                  ? 'border-gym-primary text-gym-text font-bold'
                  : 'border-transparent text-gym-text-muted hover:text-gym-text hover:border-zinc-300',
                tab.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-pill font-bold',
                    isActive ? 'bg-gym-primary text-gym-black' : 'bg-zinc-200 text-gym-text-muted'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        }

        if (variant === 'pills') {
          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-pill transition-all whitespace-nowrap',
                isActive
                  ? 'bg-gym-black text-white shadow-sm'
                  : 'bg-zinc-100 text-gym-text-secondary hover:bg-zinc-200 hover:text-gym-text',
                tab.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-pill font-bold',
                    isActive ? 'bg-gym-primary text-gym-black' : 'bg-zinc-200 text-gym-text-muted'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        }

        return (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap',
              isActive
                ? 'bg-gym-surface text-gym-text shadow-xs font-bold'
                : 'text-gym-text-muted hover:text-gym-text hover:bg-white/50',
              tab.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-pill font-bold',
                  isActive ? 'bg-zinc-100 text-gym-text' : 'bg-zinc-200 text-gym-text-muted'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
