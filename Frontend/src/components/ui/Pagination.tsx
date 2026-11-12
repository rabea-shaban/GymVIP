import React from 'react'
import { ChevronRight, ChevronLeft, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  pageSize?: number
  className?: string
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className,
}) => {
  if (totalPages <= 1) return null

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const delta = 1

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i)
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...')
      }
    }
    return pages
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 select-none text-xs text-zinc-600',
        className
      )}
    >
      {totalItems !== undefined && pageSize !== undefined && (
        <div>
          عرض{' '}
          <span className="font-bold text-zinc-900">
            {Math.min((currentPage - 1) * pageSize + 1, totalItems)}
          </span>{' '}
          إلى{' '}
          <span className="font-bold text-zinc-900">
            {Math.min(currentPage * pageSize, totalItems)}
          </span>{' '}
          من إجمالي <span className="font-bold text-zinc-900">{totalItems}</span> عنصر
        </div>
      )}

      <div className="flex items-center gap-1">
        {/* Next/Previous in RTL: Right arrow is Previous page, Left arrow is Next page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-white flex items-center gap-1 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="الصفحة السابقة"
        >
          <ChevronRight className="w-4 h-4" />
          <span className="hidden sm:inline">السابق</span>
        </button>

        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((page, idx) => {
            if (page === '...') {
              return (
                <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-zinc-400">
                  <MoreHorizontal className="w-4 h-4" />
                </span>
              )
            }

            const pageNum = page as number
            const isActive = pageNum === currentPage

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  'w-8 h-8 rounded-lg font-medium transition-colors flex items-center justify-center',
                  isActive
                    ? 'bg-gym-black text-white font-bold'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                )}
              >
                {pageNum}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-white flex items-center gap-1 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="الصفحة التالية"
        >
          <span className="hidden sm:inline">التالي</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
