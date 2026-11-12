import React, { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2, ChevronDown } from 'lucide-react'
import { downloadExport, type ExportEndpoint, type ExportParams } from '@/services/exportApi'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useToast } from '@/components/feedback/Toast'

interface ExportDropdownProps {
  endpoint: ExportEndpoint
  params?: ExportParams
  label?: string
  className?: string
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  endpoint,
  params,
  label = 'تصدير البيانات',
  className = '',
}) => {
  const { user } = useAuth()
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // RBAC permission check
  // TRAINER cannot export any gym data
  if (user?.role === 'TRAINER') {
    return null
  }

  // RECEPTIONIST cannot export financial payments or sensitive audit logs
  if (
    user?.role === 'RECEPTIONIST' &&
    (endpoint === 'payments' || endpoint === 'activity-logs')
  ) {
    return null
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleExport = async (format: 'xlsx' | 'csv') => {
    if (isExporting) return
    setIsExporting(true)
    setIsOpen(false)

    try {
      await downloadExport(endpoint, {
        ...params,
        format,
      })
      toast.success(
        format === 'xlsx'
          ? 'تم تصدير ملف Excel بنجاح'
          : 'تم تصدير ملف CSV بنجاح'
      )
    } catch (error: any) {
      let errorMsg = 'حدث خطأ أثناء تصدير البيانات، يرجى المحاولة لاحقاً'
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text()
          const parsed = JSON.parse(text)
          if (parsed.message) errorMsg = parsed.message
        } catch {
          // Fallback to default
        }
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message
      } else if (error.message) {
        errorMsg = error.message
      }
      toast.error(errorMsg)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className={`relative inline-block text-right font-cairo ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={isExporting}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 shadow-2xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        title={label}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#B8941F]" />
        ) : (
          <Download className="w-4 h-4 text-[#B8941F]" />
        )}
        <span>{isExporting ? 'جاري التصدير...' : label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-48 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            disabled={isExporting}
            onClick={() => handleExport('xlsx')}
            className="w-full text-right flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-zinc-900">ملف Excel</div>
              <div className="text-[10px] text-zinc-400 font-mono">(.xlsx)</div>
            </div>
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={() => handleExport('csv')}
            className="w-full text-right flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:text-[#B8941F] transition-colors cursor-pointer border-t border-zinc-100"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-zinc-900">ملف CSV (مفصول بفاصلة)</div>
              <div className="text-[10px] text-zinc-400 font-mono">(.csv - UTF-8)</div>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

export default ExportDropdown
