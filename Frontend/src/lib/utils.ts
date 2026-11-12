import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines Tailwind classes with clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as Egyptian Pounds (ج.م)
 */
export function formatCurrency(amount: number): string {
  return `${new Intl.NumberFormat('ar-EG', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount)} ج.م`
}

/**
 * Formats a date string or object in standard Arabic format
 */
export function formatDate(date: string | Date | number, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }

  return new Intl.DateTimeFormat('ar-EG', defaultOptions).format(d)
}

/**
 * Formats Egyptian mobile numbers: e.g. 01012345678 -> 010 1234 5678
 */
export function formatEgyptianPhone(phone: string): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('01')) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`
  }
  return phone
}
