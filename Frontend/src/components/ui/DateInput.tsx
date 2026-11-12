import { forwardRef } from 'react'
import { Calendar } from 'lucide-react'
import { Input, InputProps } from './Input'

export interface DateInputProps extends Omit<InputProps, 'type'> {}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ startIcon = <Calendar className="w-4 h-4" />, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="date"
        startIcon={startIcon}
        className="cursor-pointer"
        {...props}
      />
    )
  }
)

DateInput.displayName = 'DateInput'
