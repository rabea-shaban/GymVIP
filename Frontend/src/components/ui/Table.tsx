import React from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from './Skeleton'

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gym-border bg-gym-surface shadow-xs">
      <table className={cn('w-full text-right text-sm font-body border-collapse', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <thead
      className={cn('bg-zinc-50 border-b border-gym-border text-xs text-gym-text-muted font-cairo font-semibold', className)}
      {...props}
    >
      {children}
    </thead>
  )
}

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <tbody className={cn('divide-y divide-gym-border-subtle text-gym-text', className)} {...props}>
      {children}
    </tbody>
  )
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isSelected?: boolean
}

export const TableRow: React.FC<TableRowProps> = ({
  className,
  isSelected = false,
  children,
  ...props
}) => {
  return (
    <tr
      className={cn(
        'transition-colors duration-150 hover:bg-zinc-50/80',
        isSelected && 'bg-gym-primary/5 hover:bg-gym-primary/10',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <th className={cn('py-3.5 px-4 font-semibold text-right whitespace-nowrap select-none', className)} {...props}>
      {children}
    </th>
  )
}

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <td className={cn('py-3.5 px-4 align-middle whitespace-nowrap', className)} {...props}>
      {children}
    </td>
  )
}

export const TableEmpty: React.FC<{ colSpan: number; message?: string; icon?: React.ReactNode }> = ({
  colSpan,
  message = 'لا توجد بيانات متاحة حالياً',
  icon,
}) => {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-gym-text-muted text-sm">
        <div className="flex flex-col items-center justify-center gap-2">
          {icon && <div className="text-gym-text-muted">{icon}</div>}
          <span>{message}</span>
        </div>
      </td>
    </tr>
  )
}

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 4, cols = 5 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="border-b border-gym-border-subtle">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="py-4 px-4">
              <Skeleton className="h-4 w-full max-w-[120px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
