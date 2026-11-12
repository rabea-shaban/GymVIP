import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { DropdownItem } from './Dropdown'

export interface ContextMenuProps {
  items: DropdownItem[]
  children: React.ReactNode
  className?: string
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ items, children, className }) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const handleClick = () => setPosition(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setPosition({ x: e.clientX, y: e.clientY })
  }

  return (
    <div onContextMenu={handleContextMenu} className={cn('relative', className)}>
      {children}

      {position && (
        <div
          className="fixed z-50 min-w-[180px] bg-gym-surface rounded-lg shadow-xl border border-gym-border py-1.5 animate-in fade-in zoom-in-95 duration-150 font-body text-right"
          style={{ top: position.y, left: position.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={index} className="h-px bg-gym-border-subtle my-1" />
            }
            return (
              <button
                key={index}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.()
                  setPosition(null)
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-right transition-colors',
                  item.danger
                    ? 'text-gym-error hover:bg-red-50'
                    : 'text-gym-text hover:bg-zinc-100 hover:text-gym-black',
                  item.disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                )}
              >
                {item.icon && <span className="w-4 h-4 shrink-0">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
