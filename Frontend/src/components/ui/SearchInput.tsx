import React, { forwardRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  isRequired?: boolean
  isOptional?: boolean
  onClear?: () => void
  isLoading?: boolean
  shortcutKey?: string
  fullWidth?: boolean
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      value,
      onChange,
      onClear,
      label,
      helperText,
      error,
      isRequired,
      isOptional,
      isLoading = false,
      shortcutKey,
      fullWidth = true,
      placeholder = 'ابحث عن مشترك، اشتراك، دفعة...',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const hasValue = Boolean(value)
    const inputId = id || (label ? `search-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <div className={cn('flex flex-col gap-1.5 text-right font-body', fullWidth ? 'w-full' : 'w-auto')}>
        {label && (
          <div className="flex items-center justify-between text-xs font-semibold text-gym-text">
            <label htmlFor={inputId} className="cursor-pointer">
              {label}
              {isRequired && <span className="text-gym-error mr-1">*</span>}
            </label>
            {isOptional && <span className="text-gym-text-muted font-normal text-[11px]">(اختياري)</span>}
          </div>
        )}

        <div className="relative flex items-center">
          <div className="absolute right-3.5 pointer-events-none text-gym-text-muted flex items-center justify-center shrink-0">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gym-primary" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>

          <input
            id={inputId}
            ref={ref}
            type="text"
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              'w-full h-11 pr-10 pl-16 text-sm bg-gym-surface border border-gym-border rounded-md text-gym-text placeholder:text-gym-text-muted transition-all duration-150',
              'focus:outline-none focus:border-gym-black focus:ring-2 focus:ring-gym-primary/20 shadow-sm',
              'disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed',
              error && 'border-gym-error focus:border-gym-error',
              className
            )}
            {...props}
          />

          <div className="absolute left-3 flex items-center gap-1.5">
            {hasValue && onClear && !disabled && (
              <button
                type="button"
                onClick={onClear}
                className="text-gym-text-muted hover:text-gym-text p-1 rounded hover:bg-zinc-100 transition-colors"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {shortcutKey && (
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-gym-text-muted bg-zinc-100 border border-gym-border rounded shadow-2xs">
                {shortcutKey}
              </kbd>
            )}
          </div>
        </div>

        {error ? (
          <span className="text-xs text-gym-error">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-gym-text-muted">{helperText}</span>
        ) : null}
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'
