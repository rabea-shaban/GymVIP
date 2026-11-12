import React from 'react'
import { cn } from '@/lib/utils'

export type IconSize = '16' | '18' | '20' | '24' | 16 | 18 | 20 | 24

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  icon: React.ElementType
  size?: IconSize
  className?: string
}

export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = '20',
  className,
  ...props
}) => {
  const sizeMap: Record<string, string> = {
    '16': 'w-4 h-4',
    '18': 'w-[18px] h-[18px]',
    '20': 'w-5 h-5',
    '24': 'w-6 h-6',
  }

  return (
    <IconComponent
      className={cn(sizeMap[String(size)] || 'w-5 h-5', 'shrink-0', className)}
      {...props}
    />
  )
}
