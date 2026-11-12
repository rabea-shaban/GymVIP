import React, { useState } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GlobalSearchProps {
  placeholder?: string
  value?: string
  defaultValue?: string
  onChange?: (val: string) => void
  onSearch?: (val: string) => void
  isLoading?: boolean
  shortcut?: string
  className?: string
  fullWidth?: boolean
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  placeholder = 'ابحث عن مشترك، اشتراك، دفعة...',
  value: controlledValue,
  defaultValue = '',
  onChange,
  onSearch,
  isLoading = false,
  shortcut = 'Ctrl+K',
  className,
  fullWidth = true,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    if (!isControlled) setInternalValue(next)
    onChange?.(next)
  }

  const handleClear = () => {
    if (!isControlled) setInternalValue('')
    onChange?.('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch?.(value)
    }
  }

  return (
    <div className={cn('relative flex items-center font-body', fullWidth ? 'w-full' : 'w-auto', className)}>
      <div className="absolute right-3.5 pointer-events-none text-gym-text-muted flex items-center justify-center">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-gym-primary" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </div>

      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full h-11 pr-10 pl-20 text-sm bg-gym-surface border border-gym-border rounded-md text-gym-text placeholder:text-gym-text-muted transition-all duration-150 focus:outline-none focus:border-gym-black focus:ring-2 focus:ring-gym-primary/20 shadow-sm"
      />

      <div className="absolute left-3 flex items-center gap-1.5">
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-gym-text-muted hover:text-gym-text p-1 rounded hover:bg-zinc-100 transition-colors"
            title="مسح"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {shortcut && (
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-gym-text-muted bg-zinc-100 border border-gym-border rounded shadow-2xs">
            {shortcut}
          </kbd>
        )}
      </div>
    </div>
  )
}
