import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, UserPlus, CreditCard, CalendarCheck, Award, ChevronDown, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'

export const QuickActionsMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentRole = user?.role || 'OWNER'

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const ALL_ACTIONS: Array<{
    title: string
    subtitle: string
    icon: React.ReactNode
    path: string
    roles?: UserRole[]
  }> = [
    {
      title: 'إضافة مشترك جديد',
      subtitle: 'تسجيل عضو وبياناته الشخصية',
      icon: <UserPlus className="w-4 h-4 text-gym-gold" />,
      path: '/app/members/new',
      roles: ['OWNER', 'MANAGER', 'RECEPTIONIST'],
    },
    {
      title: 'تسجيل دفعة نقدية / إلكترونية',
      subtitle: 'تحصيل اشتراك نقداً أو فودافون كاش',
      icon: <CreditCard className="w-4 h-4 text-emerald-500" />,
      path: '/app/payments/new',
      roles: ['OWNER', 'MANAGER', 'RECEPTIONIST'],
    },
    {
      title: 'تسجيل حضور عضو',
      subtitle: 'إثبات حضور سريع بالهاتف أو الكود',
      icon: <CalendarCheck className="w-4 h-4 text-blue-500" />,
      path: '/app/attendance',
      roles: ['OWNER', 'MANAGER', 'RECEPTIONIST'],
    },
    {
      title: 'تسجيل حضور متدرب',
      subtitle: 'إثبات حضور سريع لبدء التمرين',
      icon: <CalendarCheck className="w-4 h-4 text-gym-gold" />,
      path: '/app/trainer/attendance',
      roles: ['TRAINER'],
    },
    {
      title: 'متابعة المتدربين',
      subtitle: 'استعراض بيانات المتدربين والتمارين',
      icon: <Users className="w-4 h-4 text-amber-500" />,
      path: '/app/trainer/trainees',
      roles: ['TRAINER'],
    },
    {
      title: 'إضافة اشتراك جديد',
      subtitle: 'تجديد أو ربط اشتراك بباقة',
      icon: <Award className="w-4 h-4 text-amber-500" />,
      path: '/app/subscriptions/new',
      roles: ['OWNER', 'MANAGER', 'RECEPTIONIST'],
    },
  ]

  const actions = ALL_ACTIONS.filter(
    (act) => !act.roles || act.roles.includes(currentRole as UserRole)
  )

  const handleNavigate = (path: string) => {
    navigate(path)
    setIsOpen(false)
  }

  return (
    <div className="relative inline-block text-right" ref={menuRef}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        startIcon={<Plus className="w-4 h-4 text-gym-black font-bold" />}
        endIcon={<ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', isOpen && 'rotate-180')} />}
        className="font-bold shadow-xs hover:shadow-md"
      >
        <span>إجراء سريع</span>
      </Button>

      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-72 bg-white rounded-xl shadow-xl border border-zinc-200/90 py-2 z-40 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-zinc-100 text-xs font-bold text-zinc-400">
            العمليات السريعة
          </div>
          <div className="p-1 space-y-1">
            {actions.map((act) => (
              <button
                key={act.path + act.title}
                type="button"
                onClick={() => handleNavigate(act.path)}
                className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-zinc-50 text-right transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-zinc-200/70 transition-colors">
                  {act.icon}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-900 group-hover:text-gym-black">
                    {act.title}
                  </span>
                  <span className="text-[11px] text-zinc-500 line-clamp-1">
                    {act.subtitle}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
