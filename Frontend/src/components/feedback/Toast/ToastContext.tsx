import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItemData {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  toasts: ToastItemData[]
  showToast: (toast: Omit<ToastItemData, 'id'>) => string
  removeToast: (id: string) => void
  success: (title: string, message?: string) => string
  error: (title: string, message?: string) => string
  warning: (title: string, message?: string) => string
  info: (title: string, message?: string) => string
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItemData[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((toast: Omit<ToastItemData, 'id'>): string => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastItemData = { ...toast, id }

    setToasts((prev) => [...prev, newToast])

    const duration = toast.duration ?? 4000
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }, [removeToast])

  const success = useCallback((title: string, message?: string) => showToast({ type: 'success', title, message }), [showToast])
  const error = useCallback((title: string, message?: string) => showToast({ type: 'error', title, message }), [showToast])
  const warning = useCallback((title: string, message?: string) => showToast({ type: 'warning', title, message }), [showToast])
  const info = useCallback((title: string, message?: string) => showToast({ type: 'info', title, message }), [showToast])

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const ToastContainer: React.FC<{ toasts: ToastItemData[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="assertive"
      className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none p-4"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  )
}

const ToastItem: React.FC<{ toast: ToastItemData; onRemove: () => void }> = ({ toast, onRemove }) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
  }

  const borderStyles = {
    success: 'border-r-4 border-r-emerald-500 border-zinc-200',
    error: 'border-r-4 border-r-red-500 border-zinc-200',
    warning: 'border-r-4 border-r-amber-500 border-zinc-200',
    info: 'border-r-4 border-r-blue-500 border-zinc-200',
  }

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-4 bg-white rounded-lg shadow-lg border text-right transition-all transform ease-out duration-300 animate-in slide-in-from-bottom-2',
        borderStyles[toast.type]
      )}
    >
      <div className="pt-0.5">{icons[toast.type]}</div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-zinc-900">{toast.title}</h4>
        {toast.message && <p className="text-xs text-zinc-600 mt-1">{toast.message}</p>}
      </div>
      <button
        onClick={onRemove}
        className="text-zinc-400 hover:text-zinc-600 p-1 rounded-md transition-colors"
        aria-label="إغلاق الإشعار"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
