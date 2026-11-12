import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Users,
  CreditCard,
  CalendarCheck,
  Award,
  BarChart3,
  Settings,
  X,
  UserCheck,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

interface SearchItem {
  id: string
  title: string
  category: string
  url: string
  icon: React.ReactNode
}

const SEARCH_ITEMS: SearchItem[] = [
  { id: '1', title: 'لوحة التحكم', category: 'الرئيسية', url: '/app/dashboard', icon: <BarChart3 className="w-4 h-4" /> },
  { id: '2', title: 'قائمة المشتركين', category: 'المشتركين', url: '/app/members', icon: <Users className="w-4 h-4" /> },
  { id: '3', title: 'إضافة مشترك جديد', category: 'المشتركين', url: '/app/members/new', icon: <Users className="w-4 h-4" /> },
  { id: '4', title: 'الاشتراكات الحالية', category: 'الاشتراكات', url: '/app/subscriptions', icon: <Award className="w-4 h-4" /> },
  { id: '5', title: 'خطط العضوية والباقات', category: 'الاشتراكات', url: '/app/plans', icon: <Award className="w-4 h-4" /> },
  { id: '6', title: 'تسجيل الحضور والانصراف', category: 'العمليات', url: '/app/attendance', icon: <CalendarCheck className="w-4 h-4" /> },
  { id: '7', title: 'سجل المدفوعات والاشتراكات', category: 'العمليات', url: '/app/payments', icon: <CreditCard className="w-4 h-4" /> },
  { id: '8', title: 'تسجيل دفعة جديدة', category: 'العمليات', url: '/app/payments/new', icon: <CreditCard className="w-4 h-4" /> },
  { id: '9', title: 'طاقم المدربين', category: 'المدربين', url: '/app/trainers', icon: <UserCheck className="w-4 h-4" /> },
  { id: '10', title: 'التقارير المالية والإحصائيات', category: 'التقارير', url: '/app/reports', icon: <BarChart3 className="w-4 h-4" /> },
  { id: '11', title: 'إعدادات النظام والصالة', category: 'النظام', url: '/app/settings', icon: <Settings className="w-4 h-4" /> },
]

export interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
    }
  }, [isOpen])

  const filteredItems = SEARCH_ITEMS.filter((item) =>
    item.title.includes(query) || item.category.includes(query)
  )

  const handleSelect = (url: string) => {
    navigate(url)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" showCloseButton={false} className="p-0 overflow-hidden">
      <div className="p-3 border-b border-zinc-100 flex items-center gap-2">
        <Search className="w-5 h-5 text-zinc-400 shrink-0 mr-2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن صفحة، عضو، اشتراك، عملية..."
          className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none py-1"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-zinc-400 hover:text-zinc-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto p-2">
        {filteredItems.length > 0 ? (
          <div className="space-y-1">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.url)}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-100/80 text-right transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-zinc-100 text-zinc-600 group-hover:bg-gym-black group-hover:text-gym-gold flex items-center justify-center transition-colors">
                    {item.icon}
                  </div>
                  <span className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900">
                    {item.title}
                  </span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-500 font-medium">
                  {item.category}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-zinc-400">
            لا توجد نتائج بحث مطابقة لـ "{query}"
          </div>
        )}
      </div>

      <div className="p-2.5 bg-zinc-50 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center justify-between">
        <span>استخدم الأسهم للتنقل و Enter للاختيار</span>
        <kbd className="px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-[10px] text-zinc-600 shadow-2xs">ESC للإغلاق</kbd>
      </div>
    </Modal>
  )
}
