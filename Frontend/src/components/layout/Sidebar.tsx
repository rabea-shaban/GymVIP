import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Award,
  Sparkles,
  CalendarCheck,
  CreditCard,
  UserCheck,
  BarChart3,
  ShieldCheck,
  History,
  Bell,
  Settings,
  ChevronRight,
  ChevronLeft,
  X,
  Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string | number
  roles?: UserRole[]
}

interface NavSection {
  title: string
  items: NavItem[]
  roles?: UserRole[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'الرئيسية',
    items: [
      {
        title: 'لوحة التحكم',
        href: '/app/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'إدارة المشتركين',
    items: [
      {
        title: 'المشتركين',
        href: '/app/members',
        icon: Users,
      },
      {
        title: 'الاشتراكات',
        href: '/app/subscriptions',
        icon: Award,
      },
      {
        title: 'خطط العضوية',
        href: '/app/plans',
        icon: Sparkles,
        roles: ['OWNER', 'MANAGER'],
      },
    ],
  },
  {
    title: 'العمليات',
    items: [
      {
        title: 'شاشة الاستقبال السريعة',
        href: '/app/reception/dashboard',
        icon: Sparkles,
        roles: ['RECEPTIONIST', 'OWNER', 'MANAGER'],
      },
      {
        title: 'الحضور والانصراف',
        href: '/app/attendance',
        icon: CalendarCheck,
      },
      {
        title: 'المدفوعات',
        href: '/app/payments',
        icon: CreditCard,
        roles: ['OWNER', 'MANAGER', 'RECEPTIONIST'],
      },
    ],
  },
  {
    title: 'المدربين',
    items: [
      {
        title: 'المدربين',
        href: '/app/trainers',
        icon: UserCheck,
        roles: ['OWNER', 'MANAGER', 'RECEPTIONIST'],
      },
      {
        title: 'متدربيني',
        href: '/app/trainer/trainees',
        icon: Users,
        roles: ['TRAINER'],
      },
      {
        title: 'حضور متدربيني',
        href: '/app/trainer/attendance',
        icon: CalendarCheck,
        roles: ['TRAINER'],
      },
    ],
  },
  {
    title: 'التقارير',
    roles: ['OWNER', 'MANAGER'],
    items: [
      {
        title: 'التقارير والإحصائيات',
        href: '/app/reports',
        icon: BarChart3,
      },
    ],
  },
  {
    title: 'الإدارة',
    roles: ['OWNER', 'MANAGER'],
    items: [
      {
        title: 'المستخدمين والصلاحيات',
        href: '/app/users',
        icon: ShieldCheck,
      },
      {
        title: 'سجل النشاط',
        href: '/app/activity-log',
        icon: History,
      },
    ],
  },
  {
    title: 'النظام',
    items: [
      {
        title: 'الإشعارات',
        href: '/app/notifications',
        icon: Bell,
      },
      {
        title: 'الإعدادات',
        href: '/app/settings',
        icon: Settings,
        roles: ['OWNER', 'MANAGER'],
      },
    ],
  },
]

export interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen: boolean
  onCloseMobile: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { user } = useAuth()
  const location = useLocation()

  const currentRole = user?.role || 'OWNER'

  const filteredSections = NAV_SECTIONS.map((section) => {
    if (section.roles && !section.roles.includes(currentRole)) {
      return null
    }

    const filteredItems = section.items
      .filter((item) => {
        if (item.roles && !item.roles.includes(currentRole)) {
          return false
        }
        return true
      })
      .map((item) => {
        if (item.href === '/app/dashboard' && currentRole === 'TRAINER') {
          return { ...item, href: '/app/trainer/dashboard' }
        }
        return item
      })

    if (filteredItems.length === 0) return null

    return {
      ...section,
      items: filteredItems,
    }
  }).filter(Boolean) as NavSection[]

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 right-0 z-40 bg-gym-black text-white flex flex-col transition-all duration-300 ease-in-out border-l border-zinc-800/80 shadow-2xl',
          isCollapsed ? 'w-20' : 'w-64',
          isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-gym-gold to-amber-600 flex items-center justify-center shrink-0 shadow-gold-glow">
              <Crown className="w-5 h-5 text-gym-black stroke-[2.5]" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-lg tracking-wider text-white">Gym</span>
                  <span className="font-black text-lg text-gym-gold">VIP</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-medium">إدارة الصالات الرياضية</span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 dark-scrollbar">
          {filteredSections.map((section, sIndex) => (
            <div key={section.title + sIndex} className="space-y-1">
              {!isCollapsed && (
                <h4 className="px-3 text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  {section.title}
                </h4>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== '/app/dashboard' && location.pathname.startsWith(item.href))

                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={() => {
                        if (isMobileOpen) onCloseMobile()
                      }}
                      title={isCollapsed ? item.title : undefined}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative',
                        isActive
                          ? 'bg-zinc-900 text-gym-gold font-bold shadow-xs border border-zinc-800'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60',
                        isCollapsed && 'justify-center px-2'
                      )}
                    >
                      {/* Active Gold Indicator Bar (RTL right edge) */}
                      {isActive && (
                        <span className="absolute right-0 top-1.5 bottom-1.5 w-1 bg-gym-gold rounded-l-full" />
                      )}

                      <Icon
                        className={cn(
                          'w-5 h-5 shrink-0 transition-colors',
                          isActive ? 'text-gym-gold' : 'text-zinc-400 group-hover:text-zinc-200'
                        )}
                      />

                      {!isCollapsed && (
                        <span className="truncate flex-1 text-xs sm:text-sm font-semibold">
                          {item.title}
                        </span>
                      )}

                      {!isCollapsed && item.badge && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-gym-gold text-gym-black">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer / Collapse Trigger for Desktop */}
        <div className="hidden lg:flex items-center justify-between p-3 border-t border-zinc-800/80 bg-gym-black shrink-0">
          {!isCollapsed && (
            <div className="text-[11px] text-zinc-300 px-2 font-medium">
              GymVIP v1.0.0
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors flex items-center justify-center',
              isCollapsed && 'w-full'
            )}
            title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            {isCollapsed ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
