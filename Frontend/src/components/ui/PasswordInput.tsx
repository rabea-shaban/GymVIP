import { forwardRef, useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Input, InputProps } from './Input'

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  ({ placeholder = '••••••••', startIcon = <Lock className="w-4 h-4" />, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          startIcon={startIcon}
          endIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="pointer-events-auto p-1 text-gym-text-muted hover:text-gym-text transition-colors focus:outline-none"
              title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          {...props}
        />
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'
