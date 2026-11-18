import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Calendar,
  CheckCircle2,
  RotateCcw,
  Search,
  ChevronLeft,
  X,
  QrCode,
  Building,
  Flame,
  AlertTriangle,
  Loader2,
  UserCheck,
  LogOut,
  Maximize2,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { attendanceApi } from '../services/attendanceApi'
import { membersApi } from '@/features/members/services/membersApi'
import { ExportDropdown } from '@/components/ui/ExportDropdown'
import type { AttendanceItem, TodayAttendanceSummary } from '../types/attendance.types'
import type { MemberItem } from '@/features/members/types/member.types'
import { useRealtimeSync } from '@/services/socket'

// Real SVG Icons
const WhatsAppSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

const PhoneCallSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
)

const formatWhatsAppUrl = (phone?: string | null) => {
  if (!phone) return '#'
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '2' + cleaned
  } else if (!cleaned.startsWith('20') && cleaned.length === 10) {
    cleaned = '20' + cleaned
  }
  return `https://wa.me/${cleaned}`
}

const formatDateClean = (dateStr?: string | null | Date) => {
  if (!dateStr) return '—'
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
  } catch {
    return '—'
  }
}

const formatTimeClean = (dateStr?: string | null) => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d)
  } catch {
    return '—'
  }
}

export const TraineeAttendancePage: React.FC = () => {
  const navigate = useNavigate()

  // Real Data States
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceItem[]>([])
  const [liveAttendees, setLiveAttendees] = useState<AttendanceItem[]>([])
  const [todaySummary, setTodaySummary] = useState<TodayAttendanceSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'inside' | 'completed'>('all')

  // Selected item for drawer
  const [selectedRecord, setSelectedRecord] = useState<AttendanceItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Quick Check-in Modal
  const [checkInModalOpen, setCheckInModalOpen] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [memberSearchResults, setMemberSearchResults] = useState<MemberItem[]>([])
  const [quickMembers, setQuickMembers] = useState<MemberItem[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null)
  const [isSearchingMember, setIsSearchingMember] = useState(false)
  const [isLoadingQuickMembers, setIsLoadingQuickMembers] = useState(false)
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false)

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Load Data
  const loadAttendance = useCallback(async () => {
    try {
      setIsLoading(true)
      const [listRes, insideRes, summaryRes] = await Promise.all([
        attendanceApi.list({ limit: 50 }).catch(() => ({
          attendance: [],
          pagination: { page: 1, limit: 50, total: 0, totalPages: 1 },
        })),
        attendanceApi.getCurrentlyInside().catch(() => []),
        attendanceApi.getTodaySummary().catch(() => null),
      ])

      setAttendanceRecords(listRes.attendance || [])
      setLiveAttendees(insideRes || [])
      if (summaryRes) setTodaySummary(summaryRes)
    } catch {
      triggerToast('تعذر تحميل سجلات الحضور', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAttendance()
    const interval = setInterval(loadAttendance, 60000)
    return () => clearInterval(interval)
  }, [loadAttendance])

  // Instant Real-Time WebSocket sync for Trainee Attendance
  useRealtimeSync(undefined, () => {
    loadAttendance()
  })

  // Load Quick Members for Modal
  const loadQuickMembers = useCallback(async () => {
    try {
      setIsLoadingQuickMembers(true)
      const res = await membersApi.list({ limit: 12, status: 'active' })
      setQuickMembers(res.members || [])
    } catch {
      // fallback
    } finally {
      setIsLoadingQuickMembers(false)
    }
  }, [])

  useEffect(() => {
    if (checkInModalOpen) {
      loadQuickMembers()
    }
  }, [checkInModalOpen, loadQuickMembers])

  // Search Members for Check-in
  useEffect(() => {
    if (!memberSearchQuery.trim()) {
      setMemberSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingMember(true)
        const res = await membersApi.list({ search: memberSearchQuery.trim(), limit: 8 })
        setMemberSearchResults(res.members || [])
      } catch {
        setMemberSearchResults([])
      } finally {
        setIsSearchingMember(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [memberSearchQuery])

  // Handle Quick Check-in
  const handleConfirmCheckIn = async () => {
    if (!selectedMember) {
      triggerToast('يرجى اختيار المتدرب أولاً', 'error')
      return
    }

    try {
      setIsSubmittingCheckIn(true)
      await attendanceApi.checkIn(selectedMember.id)
      triggerToast(`تم تسجيل حضور ${selectedMember.name} بنجاح!`)
      setCheckInModalOpen(false)
      setSelectedMember(null)
      setMemberSearchQuery('')
      setMemberSearchResults([])
      await loadAttendance()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'فشل تسجيل الدخول'
      triggerToast(msg, 'error')
    } finally {
      setIsSubmittingCheckIn(false)
    }
  }

  // Handle Check-out
  const handleCheckOut = async (attendanceId: string, memberName: string) => {
    try {
      await attendanceApi.checkOut(attendanceId)
      triggerToast(`تم تسجيل خروج ${memberName} بنجاح!`)
      if (drawerOpen) setDrawerOpen(false)
      await loadAttendance()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'فشل تسجيل الخروج'
      triggerToast(msg, 'error')
    }
  }

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((record) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (record.member?.name || '').toLowerCase().includes(q) ||
        (record.member?.memberCode || '').toLowerCase().includes(q) ||
        (record.member?.phone || '').includes(q)

      const isInside = !record.checkOutAt
      let matchesStatus = true
      if (statusFilter === 'inside') matchesStatus = isInside
      if (statusFilter === 'completed') matchesStatus = !isInside

      return matchesSearch && matchesStatus
    })
  }, [attendanceRecords, searchQuery, statusFilter])

  // KPIs
  const insideCount = todaySummary ? todaySummary.currentlyInside : liveAttendees.length
  const completedCount = todaySummary
    ? todaySummary.checkedOutToday
    : attendanceRecords.filter((r) => r.checkOutAt).length
  const totalToday = todaySummary ? todaySummary.totalCheckInsToday : attendanceRecords.length

  const currentDateFormatted = formatDateClean(new Date())

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-cairo" dir="rtl">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-zinc-900 text-white shadow-2xl border border-gym-gold/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              toastType === 'success'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {toastType === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
          </div>
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-zinc-400 hover:text-white mr-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium mb-1">
            <span
              onClick={() => navigate('/app/trainer/dashboard')}
              className="hover:text-zinc-800 cursor-pointer"
            >
              لوحة تحكم المدرب
            </span>
            <ChevronLeft className="w-3 h-3 text-zinc-400" />
            <span className="text-zinc-900 font-bold">سجل حضور المتدربين</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            سجل حضور المتدربين
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            متابعة حركة المتدربين وتوقيتات بدء وانتهاء التمارين الرياضية اليوم
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-bold border border-zinc-200">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span>{currentDateFormatted}</span>
          </div>

          <ExportDropdown endpoint="attendance" />

          <button
            type="button"
            onClick={() => {
              setSelectedMember(null)
              setMemberSearchQuery('')
              setCheckInModalOpen(true)
            }}
            className="px-4 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <QrCode className="w-4 h-4 text-gym-gold" />
            <span>تسجيل حضور متدرب</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: داخل الجيم الآن */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">داخل الجيم الآن</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-zinc-900 tracking-tight">{insideCount}</span>
              <span className="text-xs text-zinc-400 font-bold">متدربين</span>
            </div>
            <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>مباشر</span>
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">يجري تمارينهم في صالة النادي حالياً</p>
        </div>

        {/* Card 2: أتموا التمارين اليوم */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">أتموا التمرين اليوم</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-zinc-900 tracking-tight">{completedCount}</span>
              <span className="text-xs text-zinc-400 font-bold">متدربين</span>
            </div>
            <span className="bg-zinc-100 text-zinc-600 text-[11px] font-bold px-2 py-0.5 rounded">
              مغادرين
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">تم تسجيل خروجهم بنجاح اليوم</p>
        </div>

        {/* Card 3: إجمالي تسجيلات الدخول */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">إجمالي الدخول اليوم</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-zinc-900 tracking-tight">{totalToday}</span>
              <span className="text-xs text-zinc-400 font-bold">تسجيل دخول</span>
            </div>
            <span className="bg-[#FAF0D3] text-[#7E6517] text-[11px] font-bold px-2 py-0.5 rounded border border-[#ECD9A2]">
              اليوم
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">إجمالي الحركات المسجلة عبر البوابة</p>
        </div>

        {/* Card 4: نسبة الإشغال */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">حالة الصالة الميدانية</span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF0D3] text-[#7E6517] flex items-center justify-center border border-[#ECD9A2]">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {insideCount > 10 ? 'نشطة' : 'هادئة'}
            </span>
            <span className="text-emerald-700 text-[11px] font-bold">جاهزة للتمارين</span>
          </div>
          <p className="text-[11px] text-zinc-400">سعة الصالة تستوعب متدربين إضافيين</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-3 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم المتدرب، رقم الهاتف، أو كود العضوية..."
            className="w-full pl-4 pr-10 py-2 rounded-xl border border-zinc-200 bg-zinc-50/50 text-xs sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-gym-gold/20 focus:bg-white transition-all font-bold"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Segmented Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl text-xs font-bold w-full md:w-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'all'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            الكل ({attendanceRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inside')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'inside'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            داخل الجيم ({insideCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'completed'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            غادر ({completedCount})
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setSearchQuery('')
            setStatusFilter('all')
          }}
          className="px-3 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-600 text-xs font-semibold flex items-center gap-1.5"
          title="إعادة ضبط"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>إعادة ضبط</span>
        </button>
      </div>

      {/* Trainees Attendance Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gym-gold mb-2" />
            <span>جاري تحميل سجل الحضور...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-zinc-300 mx-auto mb-2" />
            <h4 className="text-base font-bold text-zinc-900 mb-1">لا توجد سجلات حضور مطابقة</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4">
              جرب تغيير كلمات البحث أو إلغاء فلاتر الحالة.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 font-bold">
                  <th className="py-3.5 px-4">المتدرب</th>
                  <th className="py-3.5 px-4">رقم العضوية</th>
                  <th className="py-3.5 px-4 text-center">الحالة</th>
                  <th className="py-3.5 px-4">وقت الحضور</th>
                  <th className="py-3.5 px-4">وقت الخروج</th>
                  <th className="py-3.5 px-4 text-center">مدة التواجد</th>
                  <th className="py-3.5 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60">
                {filteredRecords.map((item) => {
                  const isInside = !item.checkOutAt
                  const checkInTime = formatTimeClean(item.checkInAt)
                  const checkOutTime = item.checkOutAt ? formatTimeClean(item.checkOutAt) : '—'
                  const durationStr = item.durationMinutes
                    ? `${Math.floor(item.durationMinutes / 60)}س ${item.durationMinutes % 60}د`
                    : isInside
                    ? 'الآن بالصالة'
                    : '—'

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={item.member?.avatarUrl || undefined}
                            name={item.member?.name || 'عضو'}
                            size="sm"
                            className="border border-zinc-200 shadow-2xs shrink-0"
                          />
                          <div>
                            <div className="font-extrabold text-zinc-900 text-sm flex items-center gap-2">
                              <span>{item.member?.name || 'عضو'}</span>
                              {isInside && (
                                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                                  نشط بالصالة
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono">
                              {item.subscription?.planName || 'اشتراك عام'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-zinc-600 font-bold">
                        {item.member?.memberCode || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isInside ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>داخل الجيم</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 text-xs font-bold border border-zinc-200">
                            <span>غادر الصالة</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-800">
                        {checkInTime}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-zinc-600">
                        {checkOutTime}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-zinc-900">
                        {durationStr}
                      </td>

                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          {isInside && (
                            <button
                              type="button"
                              onClick={() => handleCheckOut(item.id, item.member?.name || 'العضو')}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>خروج</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecord(item)
                              setDrawerOpen(true)
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition"
                          >
                            تفاصيل
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trainee Details Drawer */}
      {drawerOpen && selectedRecord && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-end bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white h-full max-w-md w-full p-6 shadow-2xl overflow-y-auto space-y-6 text-right flex flex-col justify-between animate-in slide-in-from-left">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={selectedRecord.member?.avatarUrl || undefined}
                    name={selectedRecord.member?.name || 'عضو'}
                    size="lg"
                    className="w-12 h-12 ring-2 ring-emerald-500/20 shadow-xs shrink-0"
                  />
                  <div>
                    <h3 className="text-lg font-black text-zinc-950">
                      {selectedRecord.member?.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-400 font-mono">
                        كود: {selectedRecord.member?.memberCode}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-xl border border-zinc-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Attendance Details */}
              <div className="space-y-3 text-xs">
                <h4 className="font-bold text-zinc-900 text-sm">بيانات جلسة التمرين</h4>
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">نوع الباقة:</span>
                    <span className="font-bold text-zinc-900">
                      {selectedRecord.subscription?.planName || 'اشتراك عام'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">وقت تسجيل الدخول:</span>
                    <span className="font-bold text-zinc-900">
                      {formatTimeClean(selectedRecord.checkInAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">وقت تسجيل الخروج:</span>
                    <span className="font-bold text-zinc-900">
                      {selectedRecord.checkOutAt
                        ? formatTimeClean(selectedRecord.checkOutAt)
                        : 'متواجد حالياً بالصالة'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">مدة التواجد:</span>
                    <span className="font-bold text-zinc-900">
                      {selectedRecord.durationMinutes
                        ? `${selectedRecord.durationMinutes} دقيقة`
                        : 'قيد التمرين الآن'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Communication Bar */}
              {selectedRecord.member?.phone && (
                <div className="space-y-2 text-xs">
                  <h4 className="font-bold text-zinc-900 text-sm">التواصل مع المتدرب</h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    <a
                      href={`tel:${selectedRecord.member.phone}`}
                      className="flex items-center justify-center gap-2 p-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl font-bold transition"
                    >
                      <PhoneCallSvg className="w-4 h-4 text-white" />
                      <span>اتصال</span>
                    </a>
                    <a
                      href={formatWhatsAppUrl(selectedRecord.member.phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 p-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold transition"
                    >
                      <WhatsAppSvg className="w-4 h-4 fill-white" />
                      <span>واتساب</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-zinc-100 space-y-2">
              {!selectedRecord.checkOutAt && (
                <button
                  type="button"
                  onClick={() =>
                    handleCheckOut(selectedRecord.id, selectedRecord.member?.name || 'العضو')
                  }
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل خروج المتدرب من الصالة</span>
                </button>
              )}
              {selectedRecord.member && (
                <button
                  type="button"
                  onClick={() => {
                    const mId = selectedRecord.member!.id
                    setDrawerOpen(false)
                    navigate(`/app/members/${mId}`)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black bg-zinc-950 text-white hover:bg-zinc-800 transition"
                >
                  <span>فتح ملف المتدرب الشامل</span>
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Quick Check-in Modal */}
      {checkInModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-4 text-right animate-in zoom-in-95 max-h-[90vh] flex flex-col justify-between">
            {/* Modal Header */}
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                    <QrCode className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-zinc-950">تسجيل حضور فوري للمتدرب</h3>
                    <div className="text-xs text-zinc-500">اختر متدرباً أو ابحث بالاسم، الهاتف أو كود العضوية</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckInModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="mt-4 space-y-2">
                <label className="block text-xs font-bold text-zinc-800">
                  بحث عن متدرب
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، رقم الهاتف أو كود العضوية (مثال: GYM-000001)..."
                    value={memberSearchQuery}
                    onChange={(e) => {
                      setMemberSearchQuery(e.target.value)
                      if (selectedMember) setSelectedMember(null)
                    }}
                    className="w-full pl-9 pr-10 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-gym-gold/20 focus:bg-white transition"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  {isSearchingMember ? (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                    </div>
                  ) : memberSearchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMemberSearchQuery('')
                        setMemberSearchResults([])
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Modal Body / Results / Selection */}
            <div className="flex-1 overflow-y-auto max-h-72 space-y-3 py-1 pr-0.5">
              {/* If a Member is Selected */}
              {selectedMember ? (
                <div className="p-4 bg-amber-50/60 border border-amber-200/90 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={selectedMember.avatarUrl || undefined}
                        name={selectedMember.name}
                        size="md"
                        className="w-12 h-12 border-2 border-gym-gold shadow-xs shrink-0"
                      />
                      <div>
                        <div className="text-sm font-black text-zinc-950 flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                          <span>{selectedMember.name}</span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {selectedMember.isActive ? 'نشط' : 'غير نشط'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mt-0.5">
                          <span className="bg-zinc-200 px-1.5 py-0.5 rounded font-bold text-zinc-800">
                            {selectedMember.memberCode}
                          </span>
                          <span dir="ltr">{selectedMember.phone}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMember(null)
                        setMemberSearchQuery('')
                      }}
                      className="text-xs font-bold text-amber-900 bg-amber-200/60 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition"
                    >
                      تغيير
                    </button>
                  </div>

                  {/* Active Presence Warning if already inside */}
                  {liveAttendees.some(
                    (att) => att.member?.id === selectedMember.id || att.memberId === selectedMember.id
                  ) && (
                    <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-xl flex items-center gap-2 text-amber-900 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>تنبيه: هذا المتدرب مسجل حضوره حالياً داخل الصالة الرياضية!</span>
                    </div>
                  )}
                </div>
              ) : memberSearchQuery.trim().length >= 1 ? (
                /* Search Results or No Results */
                memberSearchResults.length > 0 ? (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-zinc-500">نتائج البحث ({memberSearchResults.length}):</span>
                    <div className="border border-zinc-200 rounded-xl bg-white shadow-xs overflow-hidden divide-y divide-zinc-100">
                      {memberSearchResults.map((m) => {
                        const isInside = liveAttendees.some(
                          (att) => att.member?.id === m.id || att.memberId === m.id
                        )
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedMember(m)
                              setMemberSearchResults([])
                            }}
                            className="w-full p-3 text-right hover:bg-amber-50/70 flex items-center justify-between transition group"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={m.avatarUrl || undefined}
                                name={m.name}
                                size="sm"
                                className="w-9 h-9 border border-zinc-200"
                              />
                              <div>
                                <div className="text-xs font-extrabold text-zinc-900 group-hover:text-amber-900 flex items-center gap-1.5">
                                  <span>{m.name}</span>
                                  {isInside && (
                                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                                      بالصالة
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-zinc-400 font-mono mt-0.5" dir="ltr">
                                  {m.phone}
                                </div>
                              </div>
                            </div>
                            <span className="text-[11px] font-mono font-bold bg-zinc-100 px-2 py-1 rounded text-zinc-700">
                              {m.memberCode}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : !isSearchingMember ? (
                  <div className="space-y-3">
                    {memberSearchQuery.trim().toUpperCase().startsWith('TR') && (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>تنبيه: الكود المدخل ({memberSearchQuery}) يخص مدرباً وليس متدرباً. أكواد المتدربين تبدأ بـ GYM- (مثال: GYM-000001).</span>
                      </div>
                    )}
                    <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-center space-y-1.5">
                      <Users className="w-7 h-7 text-zinc-400 mx-auto" />
                      <p className="text-xs font-bold text-zinc-700">
                        لم يتم العثور على متدرب يطابق "{memberSearchQuery}"
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        تأكد من كتابة اسم المتدرب أو رقم هاتفه أو كود العضوية (مثال: GYM-000001).
                      </p>
                    </div>

                    {/* Keep quick members visible below so user doesn't get stuck */}
                    {quickMembers.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-zinc-500">أو اختر من المتدربين المتاحين:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                          {quickMembers.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedMember(m)
                                setMemberSearchQuery('')
                              }}
                              className="p-2 rounded-xl border border-zinc-200 hover:border-amber-400 hover:bg-amber-50/50 bg-white text-right flex items-center justify-between transition group shadow-2xs"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <Avatar
                                  src={m.avatarUrl || undefined}
                                  name={m.name}
                                  size="sm"
                                  className="w-7 h-7 border border-zinc-200 shrink-0"
                                />
                                <div className="truncate">
                                  <div className="text-xs font-bold text-zinc-900 truncate">
                                    {m.name}
                                  </div>
                                  <div className="text-[10px] text-zinc-400 font-mono truncate">
                                    {m.memberCode}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null
              ) : (
                /* Default: Quick Trainees / Active Members */
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500 font-bold">
                    <span>المتدربون المتاحون (اختيار فوري بنقرة واحدة):</span>
                    {isLoadingQuickMembers && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  </div>
                  {quickMembers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {quickMembers.map((m) => {
                        const isInside = liveAttendees.some(
                          (att) => att.member?.id === m.id || att.memberId === m.id
                        )
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMember(m)}
                            className="p-2.5 rounded-xl border border-zinc-200 hover:border-amber-400 hover:bg-amber-50/50 bg-white text-right flex items-center justify-between transition group shadow-2xs"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Avatar
                                src={m.avatarUrl || undefined}
                                name={m.name}
                                size="sm"
                                className="w-8 h-8 border border-zinc-200 shrink-0"
                              />
                              <div className="truncate">
                                <div className="text-xs font-bold text-zinc-900 group-hover:text-amber-950 truncate">
                                  {m.name}
                                </div>
                                <div className="text-[10px] text-zinc-400 font-mono truncate">
                                  {m.memberCode}
                                </div>
                              </div>
                            </div>
                            {isInside ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" title="داخل الصالة" />
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-zinc-400">
                      لا يوجد أعضاء نشطون حالياً
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setCheckInModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!selectedMember || isSubmittingCheckIn}
                onClick={handleConfirmCheckIn}
                className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition ${
                  !selectedMember || isSubmittingCheckIn
                    ? 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed border border-transparent'
                    : 'bg-[#F5D86B] hover:bg-[#ECCB50] text-zinc-950 font-black shadow-md cursor-pointer border border-[#E5C652]'
                }`}
              >
                {isSubmittingCheckIn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>تأكيد تسجيل الحضور</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default TraineeAttendancePage
