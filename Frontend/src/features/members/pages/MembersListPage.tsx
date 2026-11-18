import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  UserPlus,
  Search,
  RotateCcw,
  MoreVertical,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  X,
  Award,
  ArrowRightLeft,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/feedback/Toast'
import { membersApi } from '../services/membersApi'
import type { MemberItem, MemberPagination, MemberStats } from '../types/member.types'
import { ExportDropdown } from '@/components/ui/ExportDropdown'
import { useRealtimeSync } from '@/services/socket'
import { getMediaUrl } from '@/lib/media'

interface MemberRecord {
  id: string
  code: string
  name: string
  registeredDate: string
  avatarLetters: string
  avatarBg: string
  avatarUrl?: string | null
  phone: string
  planName: string
  isVip?: boolean
  expirationFormatted: string
  expirationDate?: string
  expirationType?: 'normal' | 'expiring' | 'expired' | 'frozen' | 'none'
  lastAttendance: string
  lastAttendanceTime?: string
  currentSubscriptionId?: string | null
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'FROZEN' | 'NONE'
  statusText: string
}

export const MembersListPage: React.FC = () => {
  const navigate = useNavigate()
  const toast = useToast()

  // Pagination & Loading States
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [pagination, setPagination] = useState<MemberPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })
  const [stats, setStats] = useState<MemberStats | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Selected Checkboxes
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Drawer & Modals State
  const [showDrawer, setShowDrawer] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Filters State
  const [searchTerm, setSearchTerm] = useState('')
  const [memberStatusFilter, setMemberStatusFilter] = useState('ALL')
  const [subStatusFilter, setSubStatusFilter] = useState('ALL')
  const [genderFilter, setGenderFilter] = useState('ALL')
  const [registeredFilter, setRegisteredFilter] = useState('ALL')

  // Live API members
  const [liveMembers, setLiveMembers] = useState<MemberRecord[]>([])

  // Fetch members with server-side pagination & filters
  const loadMembers = React.useCallback(
    async (targetPage = page, targetLimit = pageSize) => {
      setIsLoading(true)
      try {
        const statusParam =
          memberStatusFilter === 'ALL'
            ? 'all'
            : memberStatusFilter === 'ACTIVE'
            ? 'active'
            : memberStatusFilter === 'EXPIRED'
            ? 'inactive'
            : 'all'

        const res = await membersApi.list({
          search: searchTerm.trim() || undefined,
          status: statusParam,
          gender: genderFilter === 'MALE' ? 'MALE' : genderFilter === 'FEMALE' ? 'FEMALE' : undefined,
          page: targetPage,
          limit: targetLimit,
        })

        const mapped: MemberRecord[] = res.members.map((m: MemberItem) => {
          const sub = m.currentSubscription
          const att = m.lastAttendance

          let planName = sub?.planName || 'بدون اشتراك'
          let status: MemberRecord['status'] = 'NONE'
          let statusText = 'بدون اشتراك'
          let expirationFormatted = '--'
          let expirationDate = ''
          let expirationType: MemberRecord['expirationType'] = 'none'

          if (sub) {
            const endDate = new Date(sub.endDate)
            const now = new Date()
            const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

            if (sub.status === 'FROZEN') {
              status = 'FROZEN'
              statusText = 'مجمد'
              expirationFormatted = `مجمد حتى ${endDate.toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' })}`
              expirationType = 'frozen'
            } else if (sub.status === 'CANCELLED') {
              status = 'EXPIRED'
              statusText = 'ملغي'
              expirationFormatted = 'اشتراك ملغي'
              expirationType = 'expired'
            } else if (diffDays <= 0 || sub.status === 'EXPIRED') {
              status = 'EXPIRED'
              statusText = 'منتهي'
              expirationFormatted = `منتهي منذ ${Math.abs(diffDays)} يوم`
              expirationType = 'expired'
            } else if (diffDays <= 7) {
              status = 'EXPIRING'
              statusText = 'قريب من الانتهاء'
              expirationFormatted = `ينتهي بعد ${diffDays} أيام`
              expirationType = 'expiring'
            } else {
              status = 'ACTIVE'
              statusText = 'نشط'
              expirationFormatted = `ينتهي بعد ${diffDays} يوم`
              expirationType = 'normal'
            }
            expirationDate = endDate.toLocaleDateString('ar-EG', { day: '2-digit', month: 'long', year: 'numeric' })
          } else if (m.isActive) {
            status = 'ACTIVE'
            statusText = 'نشط'
            expirationFormatted = 'عضوية نشطة'
          }

          let lastAttendance = 'لا يوجد حضور'
          if (att?.checkInAt) {
            const checkIn = new Date(att.checkInAt)
            const isToday = checkIn.toDateString() === new Date().toDateString()
            const timeStr = checkIn.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
            lastAttendance = isToday ? `اليوم، ${timeStr}` : checkIn.toLocaleDateString('ar-EG')
          }

          const nameLetters =
            m.name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((n) => n[0])
              .join('') || m.name.slice(0, 2)

          return {
            id: m.id,
            code: m.memberCode,
            name: m.name,
            registeredDate: `عضو منذ ${new Date(m.createdAt).toLocaleDateString('ar-EG', { day: '2-digit', month: 'long', year: 'numeric' })}`,
            avatarLetters: nameLetters,
            avatarBg: 'bg-zinc-950 text-white',
            avatarUrl: m.avatarUrl || null,
            phone: m.phone,
            planName,
            isVip: planName.includes('VIP') || planName.includes('ماسية'),
            expirationFormatted,
            expirationDate,
            expirationType,
            lastAttendance,
            currentSubscriptionId: sub?.id || null,
            status,
            statusText,
          }
        })

        setLiveMembers(mapped)
        if (res.pagination) {
          setPagination(res.pagination)
          setPage(res.pagination.page)
        }
        if (res.stats) {
          setStats(res.stats)
        }
      } catch (err) {
        console.error('Failed to load members:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [searchTerm, memberStatusFilter, genderFilter, page, pageSize]
  )

  // Trigger initial fetch and reload on filter change
  React.useEffect(() => {
    setPage(1)
    loadMembers(1, pageSize)
  }, [searchTerm, memberStatusFilter, genderFilter])

  // Instant Real-Time WebSocket updates for Members List
  useRealtimeSync(undefined, () => {
    loadMembers(page, pageSize)
  })

  // Pagination navigation handlers
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === page) return
    setPage(newPage)
    loadMembers(newPage, pageSize)
  }

  const handlePageSizeChange = (newLimit: number) => {
    setPageSize(newLimit)
    setPage(1)
    loadMembers(1, newLimit)
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredMembers.map((m) => m.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('')
    setMemberStatusFilter('ALL')
    setSubStatusFilter('ALL')
    setGenderFilter('ALL')
    setRegisteredFilter('ALL')
    setSelectedIds([])
    setPage(1)
    loadMembers(1, pageSize)
    toast.info('تمت إعادة ضبط جميع الفلاتر')
  }

  const handleToggleMemberStatus = async (memberId: string, currentStatus: boolean) => {
    try {
      await membersApi.updateStatus(memberId, !currentStatus)
      toast.success('تم تحديث حالة العضو بنجاح')
      loadMembers(page, pageSize)
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'فشل تحديث حالة العضو')
    }
  }

  // Filtered Members
  const filteredMembers = useMemo(() => {
    let list = liveMembers

    if (subStatusFilter === 'VIP') {
      list = list.filter((m) => m.isVip)
    } else if (subStatusFilter === 'MONTHLY') {
      list = list.filter((m) => m.planName.includes('شهر'))
    }

    return list
  }, [liveMembers, subStatusFilter])

  return (
    <div className="space-y-6 pb-20 font-cairo">

      {/* 2. Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mb-1.5">
            <span
              onClick={() => navigate('/app/dashboard')}
              className="hover:text-zinc-700 cursor-pointer"
            >
              لوحة التحكم
            </span>
            <span>&gt;</span>
            <span className="text-zinc-900 font-bold">الأعضاء</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950">قائمة الأعضاء</h1>
            <span className="text-[11px] font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 rounded-full font-mono">
              {(stats?.total ?? pagination.total).toLocaleString('ar-EG')} عضو
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            إدارة أعضاء الجيم ومتابعة بياناتهم واشتراكاتهم وحالتهم بدقة واحترافية.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <ExportDropdown
            endpoint="members"
            params={{
              search: searchTerm.trim() || undefined,
              status:
                memberStatusFilter === 'ALL'
                  ? undefined
                  : memberStatusFilter,
            }}
          />

          <button
            type="button"
            onClick={() => navigate('/app/members/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F4D76A] hover:bg-gym-gold text-zinc-950 text-xs sm:text-sm font-black transition-all shadow-xs active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
            <span>+ إضافة عضو</span>
          </button>
        </div>
      </div>


      {/* 3. 5 KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: إجمالي الأعضاء */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold text-zinc-600">إجمالي الأعضاء</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-950 font-mono">
            {(stats?.total ?? pagination.total).toLocaleString('ar-EG')}
          </div>
          <div className="text-[10px] text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full inline-block font-medium">
            كل الفروع
          </div>
        </div>

        {/* KPI 2: أعضاء نشطون */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold text-zinc-600">أعضاء نشطون</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-950 font-mono">
            {(stats?.active ?? pagination.total).toLocaleString('ar-EG')}
          </div>
          <div className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full inline-block font-bold font-mono">
            {stats && stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}%` : '100%'}
          </div>
        </div>

        {/* KPI 3: اشتراكات منتهية */}
        <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-[11px] font-bold text-rose-800">اشتراكات منتهية</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">
            {(stats?.expired ?? 0).toLocaleString('ar-EG')}
          </div>
          <div className="text-[10px] text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full inline-block font-bold">
            تحتاج متابعة
          </div>
        </div>

        {/* KPI 4: تنتهي خلال 7 أيام */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold text-zinc-600">تنتهي خلال 7 أيام</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-950 font-mono">
            {(stats?.expiringSoon ?? 0).toLocaleString('ar-EG')}
          </div>
          <div className="text-[10px] text-amber-900 bg-[#FEFCE8] border border-[#F4D76A] px-2 py-0.5 rounded-full inline-block font-bold">
            تجديدات قادمة
          </div>
        </div>

        {/* KPI 5: أعضاء جدد هذا الشهر */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold text-zinc-600">أعضاء جدد هذا الشهر</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-950 font-mono">
            {(stats?.newThisMonth ?? 0).toLocaleString('ar-EG')}
          </div>
          <div className="text-[10px] text-amber-950 bg-[#F4D76A] px-2 py-0.5 rounded-full inline-block font-bold font-mono">
            جديد
          </div>
        </div>
      </div>

      {/* 4. Single Unified Search & Filters Row */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-3.5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          {/* Search Input (4 cols) */}
          <div className="lg:col-span-4 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم العضو أو رقم الهاتف..."
              className="w-full pr-9 pl-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all font-medium text-zinc-900"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Member Status Dropdown (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={memberStatusFilter}
              onChange={(e) => setMemberStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold cursor-pointer"
            >
              <option value="ALL">حالة العضو: الكل</option>
              <option value="ACTIVE">نشط</option>
              <option value="EXPIRING">قريب من الانتهاء</option>
              <option value="EXPIRED">منتهي</option>
              <option value="FROZEN">مجمد</option>
            </select>
          </div>

          {/* Sub Status Dropdown (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={subStatusFilter}
              onChange={(e) => setSubStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold cursor-pointer"
            >
              <option value="ALL">حالة الاشتراك: الكل</option>
              <option value="VIP">باقة VIP</option>
              <option value="MONTHLY">شهري</option>
            </select>
          </div>

          {/* Gender Dropdown (1.5 cols) */}
          <div className="lg:col-span-1.5">
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold cursor-pointer"
            >
              <option value="ALL">الجنس: الكل</option>
              <option value="MALE">ذكور</option>
              <option value="FEMALE">إناث</option>
            </select>
          </div>

          {/* Registration Date Dropdown (1.5 cols) */}
          <div className="lg:col-span-1.5">
            <select
              value={registeredFilter}
              onChange={(e) => setRegisteredFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-bold cursor-pointer"
            >
              <option value="ALL">تاريخ التسجيل: الكل</option>
              <option value="THIS_MONTH">هذا الشهر</option>
              <option value="THIS_YEAR">هذا العام</option>
            </select>
          </div>

          {/* Reset Button (1 col) */}
          <div className="lg:col-span-1">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full py-2 px-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة ضبط</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Members Data Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-bold">
              <tr>
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredMembers.length && filteredMembers.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded text-gym-gold focus:ring-gym-gold accent-zinc-950 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">العضو</th>
                <th className="py-3.5 px-4">رقم العضوية</th>
                <th className="py-3.5 px-4">الهاتف</th>
                <th className="py-3.5 px-4">الاشتراك</th>
                <th className="py-3.5 px-4">تاريخ الانتهاء</th>
                <th className="py-3.5 px-4">آخر حضور</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((item) => {
                  const isChecked = selectedIds.includes(item.id)
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'hover:bg-zinc-50/70 transition-colors',
                        isChecked && 'bg-[#FEFCE8]/50'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(item.id)}
                          className="w-4 h-4 rounded text-gym-gold focus:ring-gym-gold accent-zinc-950 cursor-pointer"
                        />
                      </td>

                      {/* Member Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden',
                              item.avatarBg
                            )}
                          >
                            {item.avatarUrl ? (
                              <img src={getMediaUrl(item.avatarUrl)} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              item.avatarLetters
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-950 hover:text-gym-gold-dark cursor-pointer transition-colors">
                              {item.name}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {item.registeredDate}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                        {item.code}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono text-zinc-800" dir="ltr">
                        {item.phone}
                      </td>

                      {/* Plan */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 font-bold text-zinc-900">
                          <span>{item.planName}</span>
                          {item.isVip && <Award className="w-3.5 h-3.5 text-gym-gold" />}
                        </div>
                      </td>

                      {/* Expiration */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span
                            className={cn(
                              'font-bold block text-xs',
                              item.expirationType === 'expiring' && 'text-amber-800 font-black',
                              item.expirationType === 'expired' && 'text-rose-600 font-black',
                              item.expirationType === 'frozen' && 'text-zinc-700',
                              item.expirationType === 'normal' && 'text-zinc-800'
                            )}
                          >
                            {item.expirationFormatted}
                          </span>
                          {item.expirationDate && (
                            <span className="text-[10px] text-zinc-400 font-mono block">
                              {item.expirationDate}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Last Attendance */}
                      <td className="py-3.5 px-4 font-mono text-xs text-zinc-700">
                        <div className="flex items-center gap-1">
                          {item.lastAttendance.includes('اليوم') && (
                            <ArrowRightLeft className="w-3 h-3 text-emerald-600 shrink-0" />
                          )}
                          <span>{item.lastAttendance}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {item.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                            نشط
                          </span>
                        )}
                        {item.status === 'EXPIRING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                            قريب من الانتهاء
                          </span>
                        )}
                        {item.status === 'EXPIRED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                            منتهي
                          </span>
                        )}
                        {item.status === 'FROZEN' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold text-[10px]">
                            مجمد
                          </span>
                        )}
                        {item.status === 'NONE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-bold text-[10px]">
                            بدون اشتراك
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Expiring / Expired: Renew Action */}
                          {item.status === 'EXPIRING' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (item.currentSubscriptionId) {
                                  navigate(`/app/subscriptions/${item.currentSubscriptionId}/renew`)
                                } else {
                                  navigate(`/app/subscriptions/renew?memberId=${item.id}`)
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#F4D76A] hover:bg-gym-gold text-zinc-950 text-xs font-black shadow-2xs cursor-pointer"
                            >
                              تجديد
                            </button>
                          )}

                          {item.status === 'EXPIRED' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (item.currentSubscriptionId) {
                                  navigate(`/app/subscriptions/${item.currentSubscriptionId}/renew`)
                                } else {
                                  navigate(`/app/subscriptions/renew?memberId=${item.id}`)
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer"
                            >
                              تجديد
                            </button>
                          )}

                          {item.status === 'NONE' && (
                            <button
                              type="button"
                              onClick={() => navigate(`/app/subscriptions/new?memberId=${item.id}`)}
                              className="px-2.5 py-1 rounded-lg bg-[#F4D76A] hover:bg-gym-gold text-zinc-950 text-xs font-black shadow-2xs cursor-pointer"
                            >
                              إنشاء اشتراك
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMember(item)
                              setShowDrawer(true)
                            }}
                            className="px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors"
                          >
                            {item.status === 'ACTIVE' || item.status === 'FROZEN'
                              ? 'عرض الملف'
                              : 'عرض'}
                          </button>

                          {item.status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMember(item)
                                setShowDeleteModal(true)
                              }}
                              className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    <p className="text-sm font-bold text-zinc-700">لا توجد نتائج مطابقة</p>
                    <p className="text-xs text-zinc-400 mt-1">جرب تغيير شروط البحث أو الفلاتر</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Table Footer & Pagination (تفاعلية بالكامل) */}
        <div className="p-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          {/* Member count summary */}
          <div className="text-zinc-500 font-medium flex items-center gap-2">
            <span>
              عرض{' '}
              <span className="font-bold text-zinc-900 font-mono">
                {pagination.total === 0
                  ? 0
                  : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, pagination.total)}`}
              </span>{' '}
              من{' '}
              <span className="font-bold text-zinc-900 font-mono">
                {pagination.total.toLocaleString('ar-EG')}
              </span>{' '}
              عضو
            </span>
            {isLoading && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#D4AF37] font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري التحديث...</span>
              </span>
            )}
          </div>

          {/* Rows per page selector */}
          <div className="flex items-center gap-2 text-zinc-600">
            <span>الصفوف بالصفحة:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              disabled={isLoading}
              className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg font-bold font-mono cursor-pointer hover:bg-zinc-100 focus:outline-none focus:border-zinc-900 transition-colors"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Dynamic Page Buttons */}
          <div className="flex items-center gap-1 font-mono">
            {/* Previous Page Button */}
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => handlePageChange(page - 1)}
              className={cn(
                'px-2.5 py-1 rounded-lg border border-zinc-200 font-cairo font-bold transition-all',
                page <= 1 || isLoading
                  ? 'text-zinc-300 border-zinc-100 cursor-not-allowed bg-zinc-50/50'
                  : 'text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 active:scale-95'
              )}
            >
              السابق
            </button>

            {/* Smart Page Numbers */}
            {Array.from({ length: Math.max(1, pagination.totalPages) }, (_, i) => i + 1).map((p) => {
              if (
                pagination.totalPages > 7 &&
                p !== 1 &&
                p !== pagination.totalPages &&
                Math.abs(p - page) > 1
              ) {
                if (p === 2 || p === pagination.totalPages - 1) {
                  return (
                    <span key={p} className="px-1 text-zinc-400 select-none">
                      ...
                    </span>
                  )
                }
                return null
              }

              const isActive = p === page
              return (
                <button
                  key={p}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handlePageChange(p)}
                  className={cn(
                    'w-7 h-7 rounded-lg font-bold flex items-center justify-center transition-all',
                    isActive
                      ? 'bg-zinc-950 text-white shadow-xs scale-105'
                      : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 active:scale-95'
                  )}
                >
                  {p}
                </button>
              )
            })}

            {/* Next Page Button */}
            <button
              type="button"
              disabled={page >= pagination.totalPages || isLoading}
              onClick={() => handlePageChange(page + 1)}
              className={cn(
                'px-2.5 py-1 rounded-lg border border-zinc-200 font-cairo font-bold transition-all',
                page >= pagination.totalPages || isLoading
                  ? 'text-zinc-300 border-zinc-100 cursor-not-allowed bg-zinc-50/50'
                  : 'text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 active:scale-95'
              )}
            >
              التالي
            </button>
          </div>
        </div>
      </div>

      {/* DRAWER: Member Quick Preview Drawer */}
      {showDrawer && selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-base font-black text-zinc-950">الملف السريع للعضو</h3>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-2">
              <div
                className={cn(
                  'w-16 h-16 rounded-full mx-auto flex items-center justify-center text-xl font-bold overflow-hidden border-2 border-gym-gold/40',
                  selectedMember.avatarBg
                )}
              >
                {selectedMember.avatarUrl ? (
                  <img src={getMediaUrl(selectedMember.avatarUrl)} alt={selectedMember.name} className="w-full h-full object-cover" />
                ) : (
                  selectedMember.avatarLetters
                )}
              </div>
              <h4 className="text-lg font-black text-zinc-950">{selectedMember.name}</h4>
              <p className="text-xs text-zinc-500 font-mono">{selectedMember.code} • {selectedMember.phone}</p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">الاشتراك الحالي:</span>
                <span className="font-bold text-zinc-900">{selectedMember.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">تاريخ الانتهاء:</span>
                <span className="font-mono font-bold">{selectedMember.expirationDate || selectedMember.expirationFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">آخر حضور:</span>
                <span className="font-mono">{selectedMember.lastAttendance}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setShowDrawer(false)
                  navigate(`/app/members/${selectedMember.id}`)
                }}
                className="w-full py-2.5 rounded-xl bg-zinc-950 text-white font-bold text-xs hover:bg-zinc-800 transition-colors"
              >
                فتح الملف الكامل
              </button>
              <button
                onClick={() => {
                  setShowDrawer(false)
                  if (selectedMember.currentSubscriptionId) {
                    navigate(`/app/subscriptions/${selectedMember.currentSubscriptionId}/renew`)
                  } else {
                    navigate(`/app/subscriptions/renew?memberId=${selectedMember.id}`)
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-[#F4D76A] hover:bg-gym-gold text-zinc-950 font-black text-xs transition-colors cursor-pointer"
              >
                تجديد الاشتراك
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation Modal */}
      {showDeleteModal && selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black text-zinc-950 text-center">
              تأكيد أرشفة أو حذف العضو
            </h3>

            <p className="text-xs text-zinc-500 text-center leading-relaxed">
              هل أنت متأكد من حذف العضو{' '}
              <span className="font-bold text-zinc-900">{selectedMember.name}</span> ({selectedMember.code})؟
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  handleToggleMemberStatus(selectedMember.id, selectedMember.status === 'ACTIVE')
                  setShowDeleteModal(false)
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                تأكيد التعطيل
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MembersListPage
