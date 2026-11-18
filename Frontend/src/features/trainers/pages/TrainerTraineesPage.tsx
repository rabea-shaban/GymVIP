import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  ChevronLeft,
  X,
  QrCode,
  ArrowUpRight,
  Loader2,
  UserCheck,
  Award,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { membersApi } from '@/features/members/services/membersApi'
import { attendanceApi } from '@/features/attendance/services/attendanceApi'
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

const CopySvg: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
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
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
)

const IdCardSvg: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
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
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <line x1="6" y1="9" x2="10" y2="9" />
    <line x1="6" y1="13" x2="10" y2="13" />
    <circle cx="16" cy="11" r="2" />
  </svg>
)

// Formatting Helpers
const formatWhatsAppUrl = (phone: string) => {
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '2' + cleaned
  } else if (!cleaned.startsWith('20') && cleaned.length === 10) {
    cleaned = '20' + cleaned
  }
  return `https://wa.me/${cleaned}`
}

const formatDateClean = (dateStr?: string | null) => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
  } catch {
    return dateStr.slice(0, 10)
  }
}

const getRemainingDays = (endDateStr?: string | null) => {
  if (!endDateStr) return null
  const now = new Date()
  const end = new Date(endDateStr)
  const diffTime = end.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export const TrainerTraineesPage: React.FC = () => {
  const navigate = useNavigate()

  // Real Data States
  const [trainees, setTrainees] = useState<MemberItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    expiringSoon: 0,
  })

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Modals & Drawer
  const [selectedTrainee, setSelectedTrainee] = useState<MemberItem | null>(null)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [attendanceSearchResults, setAttendanceSearchResults] = useState<MemberItem[]>([])
  const [selectedAttendanceMember, setSelectedAttendanceMember] = useState<MemberItem | null>(null)
  const [isSearchingMember, setIsSearchingMember] = useState(false)
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    try {
      navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      triggerToast(`تم نسخ ${fieldName} بنجاح`)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      triggerToast('تعذر نسخ النص', 'error')
    }
  }

  // Keyboard Escape listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedTrainee) setSelectedTrainee(null)
        if (showAttendanceModal) setShowAttendanceModal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedTrainee, showAttendanceModal])

  // Toast
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3500)
  }

  // Load Trainees Data
  const loadTrainees = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await membersApi.list({
        search: searchQuery.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: currentPage,
        limit: 10,
      })

      setTrainees(res.members)
      setTotalCount(res.pagination.total)
      setTotalPages(res.pagination.totalPages || 1)

      if (res.stats) {
        setStats({
          total: res.stats.total,
          active: res.stats.active,
          expired: res.stats.expired,
          expiringSoon: res.stats.expiringSoon,
        })
      } else {
        const activeC = res.members.filter((m) => m.isActive).length
        setStats({
          total: res.pagination.total,
          active: activeC,
          expired: res.pagination.total - activeC,
          expiringSoon: 0,
        })
      }
    } catch {
      triggerToast('حدث خطأ أثناء تحميل بيانات المتدربين', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, statusFilter, currentPage])

  useEffect(() => {
    loadTrainees()
  }, [loadTrainees])

  // Instant Real-Time WebSocket sync for Trainees List
  useRealtimeSync(undefined, () => {
    loadTrainees()
  })

  // Quick Attendance Autocomplete
  useEffect(() => {
    if (!attendanceSearch.trim() || attendanceSearch.length < 2) {
      setAttendanceSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingMember(true)
        const res = await membersApi.list({ search: attendanceSearch, limit: 5 })
        setAttendanceSearchResults(res.members)
      } catch {
        setAttendanceSearchResults([])
      } finally {
        setIsSearchingMember(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [attendanceSearch])

  // Handle Quick Attendance Submit
  const handleConfirmAttendance = async () => {
    if (!selectedAttendanceMember) {
      triggerToast('يرجى اختيار المتدرب أولاً', 'error')
      return
    }

    try {
      setIsSubmittingAttendance(true)
      await attendanceApi.checkIn(selectedAttendanceMember.id)
      triggerToast(`تم تسجيل حضور ${selectedAttendanceMember.name} بنجاح!`)
      setShowAttendanceModal(false)
      setSelectedAttendanceMember(null)
      setAttendanceSearch('')
      setAttendanceSearchResults([])
      await loadTrainees()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'فشل تسجيل الحضور'
      triggerToast(msg, 'error')
    } finally {
      setIsSubmittingAttendance(false)
    }
  }

  // Handle Direct Quick Check-in from Trainee Drawer
  const handleDirectCheckIn = async (traineeId: string, traineeName: string) => {
    try {
      setIsSubmittingAttendance(true)
      await attendanceApi.checkIn(traineeId)
      triggerToast(`تم تسجيل حضور ${traineeName} بنجاح!`, 'success')
      await loadTrainees()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'فشل تسجيل الحضور'
      triggerToast(msg, 'error')
    } finally {
      setIsSubmittingAttendance(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-cairo" dir="rtl">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-gym-gold/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              toastType === 'success'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {toastType === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div className="text-sm font-medium">{toastMessage}</div>
          <button
            onClick={() => setShowToast(false)}
            className="text-zinc-400 hover:text-white mr-2 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Breadcrumb & Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 mb-1.5">
            <span
              onClick={() => navigate('/app/trainer/dashboard')}
              className="hover:text-zinc-800 cursor-pointer"
            >
              لوحة تحكم المدرب
            </span>
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-700">متدربوني</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tight">متدربوني</h1>
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[#FAF0D3] text-[#7E6517] border border-[#ECD9A2]">
              {totalCount} متدرب مسجل
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1 font-medium">
            إدارة ومتابعة المتدربين المرتبطين بك وجداول حضورهم والتزامهم التدريبي
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedAttendanceMember(null)
            setAttendanceSearch('')
            setShowAttendanceModal(true)
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-zinc-950 text-white hover:bg-zinc-800 shadow-sm transition active:scale-95 self-start md:self-auto"
        >
          <QrCode className="w-4 h-4 text-[#F5D86B]" />
          <span>تسجيل حضور متدرب</span>
        </button>
      </div>

      {/* 4 Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Trainees */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500">إجمالي المتدربين</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-950">{stats.total}</span>
            <div className="text-right">
              <div className="text-xs font-bold text-zinc-800">قاعدة المتدربين</div>
              <div className="text-[11px] text-zinc-400">مسجلين بالنظام</div>
            </div>
          </div>
        </div>

        {/* Card 2: Active Subscriptions */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500">اشتراكات نشطة</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-950">{stats.active}</span>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 mb-0.5">
                نشط حالياً
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Expiring Soon */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500">ينتهي اشتراكهم قريباً</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-950">{stats.expiringSoon}</span>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#FAF0D3] text-[#7E6517] border border-[#ECD9A2] mb-0.5">
                خلال 7 أيام
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Expired */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-500">اشتراك منتهي</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-950">{stats.expired}</span>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60 mb-0.5">
                مطلوب تجديد
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trainees Master Table */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        {/* Table Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="بحث بالاسم، رقم الهاتف، أو كود العضوية..."
              className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-gym-gold/20 focus:border-gym-gold transition"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'active', label: 'النشطين' },
              { id: 'inactive', label: 'غير النشطين' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setStatusFilter(f.id as any)
                  setCurrentPage(1)
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === f.id
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Master Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-zinc-50/80 text-zinc-500 font-bold border-y border-zinc-100">
                <th className="py-3 px-4">المتدرب</th>
                <th className="py-3 px-3">رقم الهاتف</th>
                <th className="py-3 px-3">الاشتراك الحالي</th>
                <th className="py-3 px-3 text-center">تاريخ الانتهاء</th>
                <th className="py-3 px-3 text-center">الحالة</th>
                <th className="py-3 px-4 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gym-gold mb-2" />
                    <span>جاري تحميل بيانات المتدربين...</span>
                  </td>
                </tr>
              ) : trainees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    لا يوجد متدربون يطابقون خيارات البحث الحالية
                  </td>
                </tr>
              ) : (
                trainees.map((trainee) => {
                  const subPlanName = trainee.currentSubscription?.planName || 'بدون اشتراك'
                  const endDate = formatDateClean(trainee.currentSubscription?.endDate)

                  return (
                    <tr key={trainee.id} className="hover:bg-zinc-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={trainee.avatarUrl || undefined}
                            name={trainee.name}
                            size="sm"
                            className="border border-zinc-200 shadow-2xs shrink-0 ring-1 ring-zinc-100"
                          />
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-zinc-900">{trainee.name}</span>
                            <span className="font-mono text-[11px] font-bold bg-[#FAF0D3] text-[#7E6517] border border-[#ECD9A2] px-2 py-0.5 rounded-md shadow-2xs">
                              {trainee.memberCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2" dir="ltr">
                          <span className="font-mono font-bold text-xs text-zinc-700">{trainee.phone}</span>
                          {trainee.phone && (
                            <div className="flex items-center gap-1">
                              <a
                                href={formatWhatsAppUrl(trainee.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition"
                                title="مراسلة عبر واتساب"
                              >
                                <WhatsAppSvg className="w-4 h-4 fill-emerald-600" />
                              </a>
                              <a
                                href={`tel:${trainee.phone}`}
                                className="p-1 rounded-md text-zinc-700 hover:bg-zinc-100 transition"
                                title="اتصال هاتفي"
                              >
                                <PhoneCallSvg className="w-4 h-4 text-zinc-700" />
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-zinc-800 bg-zinc-100 px-2.5 py-1 rounded-lg text-xs">
                          {subPlanName}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center font-semibold text-zinc-700">
                        {endDate}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {trainee.isActive ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            نشط
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-100 text-zinc-500 border border-zinc-200">
                            معطل
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTrainee(trainee)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition"
                          >
                            عرض سريع
                          </button>
                          <button
                            onClick={() => navigate(`/app/members/${trainee.id}`)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-900 hover:bg-black text-white transition"
                          >
                            الملف الشامل
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer */}
        <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-500 font-medium">
            عرض {trainees.length} من إجمالي {totalCount} متدرب مسجل
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                السابق
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                    currentPage === pg
                      ? 'bg-zinc-950 text-white'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                  }`}
                >
                  {pg}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trainee Details Drawer */}
      {selectedTrainee && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-end bg-black/60 backdrop-blur-2xs animate-in fade-in"
          onClick={() => setSelectedTrainee(null)}
        >
          <div
            className="bg-white h-full max-w-md w-full p-6 shadow-2xl overflow-y-auto text-right flex flex-col justify-between animate-in slide-in-from-left duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              {/* Drawer Topbar */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">بطاقة المتدرب السريعة</h3>
                    <p className="text-[10px] text-zinc-400 font-medium">بيانات الاشتراك والتواصل الفوري</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTrainee(null)}
                  className="text-zinc-400 hover:text-zinc-800 p-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition"
                  title="إغلاق (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Trainee Hero Card */}
              <div className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 text-white rounded-2xl p-4 shadow-lg border border-zinc-800/80 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-start gap-3.5 relative z-10">
                  <Avatar
                    src={selectedTrainee.avatarUrl || undefined}
                    name={selectedTrainee.name}
                    size="lg"
                    className="w-14 h-14 ring-2 ring-[#F5D86B] shadow-md text-lg shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-black text-white truncate">
                        {selectedTrainee.name}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          selectedTrainee.isActive
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {selectedTrainee.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 bg-zinc-800/90 px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-300 border border-zinc-700/60">
                        <IdCardSvg className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-[10px] text-zinc-400">كود:</span>
                        <span className="font-bold text-[#F5D86B]">{selectedTrainee.memberCode}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedTrainee.memberCode, 'كود العضوية')}
                          className="hover:text-white transition mr-1"
                          title="نسخ الكود"
                        >
                          {copiedField === 'كود العضوية' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <CopySvg className="w-3 h-3 text-zinc-400" />
                          )}
                        </button>
                      </div>

                      <div
                        className="inline-flex items-center gap-1.5 bg-zinc-800/90 px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-300 border border-zinc-700/60"
                        dir="ltr"
                      >
                        <PhoneCallSvg className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{selectedTrainee.phone}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedTrainee.phone, 'رقم الهاتف')}
                          className="hover:text-white transition ml-1"
                          title="نسخ رقم الهاتف"
                        >
                          {copiedField === 'رقم الهاتف' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <CopySvg className="w-3 h-3 text-zinc-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Info Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-gym-gold" />
                    <span>بيانات الاشتراك الحالي</span>
                  </h4>
                  {(() => {
                    const days = getRemainingDays(selectedTrainee.currentSubscription?.endDate)
                    if (days === null) return null
                    if (days <= 0) {
                      return (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          منتهي
                        </span>
                      )
                    }
                    if (days <= 7) {
                      return (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          متبقي {days} أيام
                        </span>
                      )
                    }
                    return (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        متبقي {days} يوم
                      </span>
                    )
                  })()}
                </div>

                <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-200/60">
                    <span className="text-zinc-500 font-medium">نوع الباقة:</span>
                    <span className="font-bold text-zinc-950 bg-white px-2.5 py-1 rounded-lg border border-zinc-200/60 shadow-2xs">
                      {selectedTrainee.currentSubscription?.planName || 'بدون اشتراك نشط'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-zinc-200/60 space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        <span>تاريخ البداية</span>
                      </div>
                      <div className="font-bold text-zinc-900 text-[11px]">
                        {formatDateClean(selectedTrainee.currentSubscription?.startDate)}
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-zinc-200/60 space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>تاريخ الانتهاء</span>
                      </div>
                      <div className="font-bold text-amber-700 text-[11px]">
                        {formatDateClean(selectedTrainee.currentSubscription?.endDate)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-200/40">
                    <span className="text-zinc-400">تاريخ التسجيل بالنادي:</span>
                    <span className="font-bold text-zinc-700">
                      {formatDateClean(selectedTrainee.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Communication Buttons */}
              <div className="space-y-2">
                <h4 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                  <PhoneCallSvg className="w-3.5 h-3.5 text-zinc-600" />
                  <span>التواصل المباشر مع المتدرب</span>
                </h4>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Real WhatsApp Button with Official WhatsApp SVG */}
                  <a
                    href={formatWhatsAppUrl(selectedTrainee.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 p-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-black text-xs shadow-sm hover:shadow-md transition active:scale-98"
                  >
                    <WhatsAppSvg className="w-4 h-4 fill-white shrink-0" />
                    <span>واتساب</span>
                  </a>

                  {/* Direct Phone Call Button with Real Phone SVG */}
                  <a
                    href={`tel:${selectedTrainee.phone}`}
                    className="flex items-center justify-center gap-2 p-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl font-black text-xs shadow-sm hover:shadow-md transition active:scale-98"
                  >
                    <PhoneCallSvg className="w-4 h-4 text-white shrink-0" />
                    <span>اتصال هاتفي</span>
                  </a>
                </div>
              </div>

              {/* Trainee Extra Info (Gender, Notes, Emergency) if present */}
              {(selectedTrainee.gender || selectedTrainee.emergencyContactPhone || selectedTrainee.notes) && (
                <div className="p-3 bg-zinc-50/80 rounded-xl border border-zinc-200/70 text-xs space-y-1.5">
                  <span className="text-[11px] font-bold text-zinc-500 block">معلومات إضافية:</span>
                  {selectedTrainee.gender && (
                    <div className="flex justify-between text-zinc-700">
                      <span>النوع:</span>
                      <span className="font-bold">{selectedTrainee.gender === 'MALE' ? 'ذكر' : 'أنثى'}</span>
                    </div>
                  )}
                  {selectedTrainee.emergencyContactPhone && (
                    <div className="flex justify-between text-zinc-700">
                      <span>رقم الطوارئ:</span>
                      <span className="font-mono font-bold" dir="ltr">{selectedTrainee.emergencyContactPhone}</span>
                    </div>
                  )}
                  {selectedTrainee.notes && (
                    <div className="text-zinc-600 text-[11px] mt-1 p-2 bg-white rounded-lg border border-zinc-200/60">
                      {selectedTrainee.notes}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Action Buttons */}
            <div className="pt-4 border-t border-zinc-100 space-y-2">
              {/* Quick Check-in Button */}
              <button
                type="button"
                disabled={isSubmittingAttendance}
                onClick={() => handleDirectCheckIn(selectedTrainee.id, selectedTrainee.name)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-[#FAF0D3] text-[#7E6517] hover:bg-[#F3E2B3] border border-[#ECD9A2] transition active:scale-98 disabled:opacity-50"
              >
                {isSubmittingAttendance ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4 text-[#7E6517]" />
                )}
                <span>تسجيل حضور فوري للمتدرب</span>
              </button>

              {/* Full Profile Navigation */}
              <button
                type="button"
                onClick={() => {
                  const id = selectedTrainee.id
                  setSelectedTrainee(null)
                  navigate(`/app/members/${id}`)
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black bg-zinc-950 text-white hover:bg-zinc-800 shadow-md transition active:scale-98"
              >
                <span>فتح ملف العضو الشامل</span>
                <ArrowUpRight className="w-4 h-4 text-gym-gold" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Manual Attendance Modal */}
      {showAttendanceModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 text-right animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950">تسجيل حضور سريع للمتدرب</h3>
                  <div className="text-xs text-zinc-500">ابحث باسم المتدرب أو الكود أو الهاتف</div>
                </div>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-zinc-800">
                ابحث عن المتدرب
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث هنا..."
                  value={attendanceSearch}
                  onChange={(e) => {
                    setAttendanceSearch(e.target.value)
                    if (selectedAttendanceMember) setSelectedAttendanceMember(null)
                  }}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-gym-gold/20"
                />
                {isSearchingMember && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                  </div>
                )}
              </div>

              {/* Autocomplete Results */}
              {attendanceSearchResults.length > 0 && !selectedAttendanceMember && (
                <div className="border border-zinc-200 rounded-xl bg-white shadow-lg overflow-hidden divide-y divide-zinc-100 max-h-48 overflow-y-auto">
                  {attendanceSearchResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedAttendanceMember(m)
                        setAttendanceSearch(`${m.name} (${m.memberCode})`)
                        setAttendanceSearchResults([])
                      }}
                      className="w-full p-2.5 text-right hover:bg-amber-50 flex items-center justify-between transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-zinc-900">{m.name}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">{m.phone}</div>
                      </div>
                      <span className="text-[11px] font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-600">
                        {m.memberCode}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedAttendanceMember && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>تم تحديد المتدرب: {selectedAttendanceMember.name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAttendanceModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!selectedAttendanceMember || isSubmittingAttendance}
                onClick={handleConfirmAttendance}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#F5D86B] text-zinc-950 hover:bg-[#ECCB50] disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingAttendance && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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

export default TrainerTraineesPage
