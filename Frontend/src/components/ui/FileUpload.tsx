import React, { useState, useRef } from 'react'
import { UploadCloud, File, X, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface FileUploadProps {
  label?: string
  helperText?: string
  accept?: string
  maxSizeMB?: number
  onFileSelect?: (file: File | null) => void
  disabled?: boolean
  error?: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label = 'رفع ملف أو صورة',
  helperText = 'PNG, JPG, PDF حتى 10 ميجابايت',
  accept,
  maxSizeMB = 10,
  onFileSelect,
  disabled = false,
  error,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`حجم الملف يجب ألا يتجاوز ${maxSizeMB} ميجابايت`)
      return
    }
    setSelectedFile(file)
    onFileSelect?.(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleRemove = () => {
    setSelectedFile(null)
    onFileSelect?.(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-1.5 text-right font-body">
      {label && <span className="text-xs font-semibold text-gym-text">{label}</span>}

      {!selectedFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed border-gym-border rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 bg-zinc-50/50 hover:bg-zinc-50 hover:border-gym-primary/60',
            isDragging && 'border-gym-primary bg-gym-primary/5',
            disabled && 'opacity-50 cursor-not-allowed bg-zinc-100',
            error && 'border-gym-error'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            disabled={disabled}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="sr-only"
          />

          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-gym-text-muted mb-2">
            <UploadCloud className="w-5 h-5 text-gym-primary-dark" />
          </div>

          <p className="text-sm font-semibold text-gym-text">
            اسحب وأفلت الملف هنا، أو <span className="text-gym-primary-dark underline">تصفح من جهازك</span>
          </p>
          <p className="text-xs text-gym-text-muted mt-1">{helperText}</p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3.5 bg-zinc-50 border border-gym-border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-emerald-50 text-gym-success flex items-center justify-center">
              <File className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-gym-text line-clamp-1">{selectedFile.name}</span>
              <span className="text-[11px] text-gym-text-muted">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-gym-success" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isIconOnly
              onClick={handleRemove}
              className="text-gym-text-muted hover:text-gym-error"
              title="إزالة الملف"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {error && <span className="text-xs text-gym-error">{error}</span>}
    </div>
  )
}
