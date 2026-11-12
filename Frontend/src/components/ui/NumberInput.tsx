import { forwardRef } from 'react'
import { Plus, Minus } from 'lucide-react'
import { Input, InputProps } from './Input'

export interface NumberInputProps extends Omit<InputProps, 'type' | 'onChange'> {
  value?: number | string
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  onChange?: (val: number) => void
  unit?: string
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      defaultValue = 0,
      min = 0,
      max = 1000000,
      step = 1,
      onChange,
      unit,
      disabled,
      ...props
    },
    ref
  ) => {
    const numericValue = typeof value === 'number' ? value : Number(value || defaultValue)

    const handleIncrement = () => {
      if (disabled) return
      const next = Math.min(max, numericValue + step)
      onChange?.(next)
    }

    const handleDecrement = () => {
      if (disabled) return
      const next = Math.max(min, numericValue - step)
      onChange?.(next)
    }

    return (
      <div className="relative flex items-center">
        <Input
          ref={ref}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => onChange?.(Number(e.target.value))}
          endIcon={
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {unit && <span className="text-xs text-gym-text-muted font-medium">{unit}</span>}
              <div className="flex items-center gap-0.5 border border-gym-border rounded bg-zinc-50 p-0.5">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={disabled || numericValue <= min}
                  className="p-1 hover:bg-zinc-200 rounded text-gym-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="إنقاص"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={disabled || numericValue >= max}
                  className="p-1 hover:bg-zinc-200 rounded text-gym-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="زيادة"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          }
          {...props}
        />
      </div>
    )
  }
)

NumberInput.displayName = 'NumberInput'
