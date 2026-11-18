import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Menu,
  Search,
  Bell,
  User as UserIcon,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABELS } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Dropdown } from '@/components/ui/Dropdown'
import { Badge } from '@/components/ui/Badge'
import { QuickActionsMenu } from './QuickActionsMenu'
import { GlobalSearchModal } from './GlobalSearchModal'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/features/notifications/services/notificationsApi'
import { useSocketStatus } from '@/services/socket'

export interface HeaderProps {
  onOpenMobileSidebar: () => void
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileSidebar }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const isRealtimeConnected = useSocketStatus()

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  })
  const unreadCount = unreadData?.unreadCount ?? 0

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userMenuItems = [
    {
      id: 'profile',
      label: 'الملف الشخصي',
      icon: <UserIcon className="w-4 h-4" />,
      onClick: () => navigate('/app/profile'),
    },
    {
      id: 'settings',
      label: 'الإعدادات',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => navigate('/app/settings'),
    },
    {
      divider: true,
      label: '',
    },
    {
      id: 'logout',
      label: 'تسجيل الخروج',
      icon: <LogOut className="w-4 h-4" />,
      danger: true,
      onClick: handleLogout,
    },
  ]

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-zinc-200/80 px-4 sm:px-6 flex items-center justify-between shadow-subtle">
        {/* Left Side (RTL Start): Mobile Hamburger + Global Search */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            aria-label="فتح القائمة الرئيسية"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Trigger Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2.5 h-9 px-3.5 rounded-lg bg-zinc-100/90 hover:bg-zinc-200/70 border border-zinc-200 text-xs text-zinc-500 transition-colors w-40 sm:w-64 md:w-80 justify-between"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-zinc-400" />
              <span>بحث سريع...</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white rounded border border-zinc-200 text-zinc-500 shadow-2xs">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Side (RTL End): Quick Actions + Notifications + User Menu */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Live Real-time Sync Indicator */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-50 border border-zinc-200/80 text-[11px] font-bold text-zinc-600 select-none shadow-2xs"
            title={isRealtimeConnected ? 'متصل لحظياً عبر WebSocket - التحديث فوري بدون ريفرش' : 'جاري إعادة الاتصال...'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRealtimeConnected
                  ? 'bg-emerald-500 animate-pulse ring-2 ring-emerald-200'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-[10px] text-zinc-600 font-bold">
              {isRealtimeConnected ? 'تحديث لحظي نشط' : 'جاري الاتصال'}
            </span>
          </div>

          {/* Quick Actions Dropdown */}
          <QuickActionsMenu />

          {/* Notifications Trigger */}
          <Link
            to="/app/notifications"
            className="relative p-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            aria-label="الإشعارات"
            title="الإشعارات"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-gym-gold text-amber-950 text-[10px] font-black flex items-center justify-center ring-2 ring-white font-mono shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          <div className="h-6 w-px bg-zinc-200 hidden sm:block mx-1" />

          {/* User Profile Dropdown */}
          <Dropdown
            align="left"
            items={userMenuItems}
            trigger={
              <div className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-zinc-100 transition-colors select-none">
                <Avatar
                  name={user?.name || 'مستخدم'}
                  size="sm"
                  src={user?.avatarUrl}
                />
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-zinc-900 leading-tight">
                    {user?.name || 'مستخدم GymVIP'}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant="gold" size="sm" className="text-[10px] py-0 px-1.5">
                      {user?.role ? ROLE_LABELS[user.role] : 'مالك'}
                    </Badge>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-zinc-400 hidden sm:block" />
              </div>
            }
          />
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}
