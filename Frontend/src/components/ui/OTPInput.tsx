import React, { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface OTPInputProps {
  length?: number
  value?: string
  onChange?: (otp: string) => void
  disabled?: boolean
  error?: boolean
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value = '',
  onChange,
  disabled = false,
  error = false,
}) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''))
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (value) {
      const valArray = value.split('').slice(0, length)
      setOtp([...valArray, ...Array(length - valArray.length).fill('')])
    }
  }, [value, length])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.slice(-1)
    if (!/^\d*$/.test(val)) return

    const newOtp = [...otp]
    newOtp[index] = val
    setOtp(newOtp)
    onChange?.(newOtp.join(''))

    // Focus next input in RTL flow
    if (val && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pastedData) return

    const newOtp = Array(length).fill('')
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i]
    }
    setOtp(newOtp)
    onChange?.(newOtp.join(''))
    inputsRef.current[Math.min(pastedData.length, length - 1)]?.focus()
  }

  return (
    <div className="flex items-center justify-center gap-2.5" dir="ltr" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={otp[index]}
          disabled={disabled}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className={cn(
            'w-11 h-12 text-center text-lg font-bold font-cairo bg-gym-surface border rounded-md transition-all duration-150',
            'focus:outline-none focus:border-gym-black focus:ring-2 focus:ring-gym-primary/20',
            error
              ? 'border-gym-error text-gym-error'
              : 'border-gym-border text-gym-text',
            otp[index] && 'border-zinc-700 bg-zinc-50/50',
            disabled && 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
          )}
        />
      ))}
    </div>
  )
}
