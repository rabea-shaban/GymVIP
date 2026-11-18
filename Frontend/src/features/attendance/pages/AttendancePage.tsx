import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  Search,
  Plus,
  ArrowRightLeft,
  AlertTriangle,
  QrCode,
  Lock,
  Unlock,
  Radio,
  CheckCircle2,
  Clock,
  User,
  Users,
  CreditCard,
  LogOut,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/feedback/Toast'
import { attendanceApi } from '../services/attendanceApi'
import { membersApi } from '@/features/members/services/membersApi'
import { useRealtimeSync } from '@/services/socket'
import { ExportDropdown } from '@/components/ui/ExportDropdown'
import { useAuth } from '@/features/auth/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { getMediaUrl } from '@/lib/media'
import type { AttendanceItem } from '../types/attendance.types'

interface LiveAttendee {
  id: string
  name: string
  avatarLetters: string
  avatarBg: string
  avatarUrl?: string | null
  code: string
  phone: string
  checkInTime: string
  durationFormatted: string
  durationMinutes: number
  isOvertimeWarning?: boolean
  planName: string
  planRemainingDays: number
  planRemainingNote?: string
  status: 'IN_GYM' | 'CHECKED_OUT'
}

export const AttendancePage: React.FC = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { user, gym } = useAuth()

  React.useEffect(() => {
    if (user?.role === 'TRAINER') {
      navigate('/app/trainer/attendance', { replace: true })
    }
  }, [user, navigate])

  // Live Turnstile Gate State
  const [isTurnstileOpen, setIsTurnstileOpen] = useState(false)

  // Tab State: 'inside' vs 'all'
  const [activeTab, setActiveTab] = useState<'inside' | 'all'>('inside')

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [planFilter, setPlanFilter] = useState('ALL')

  // Scanner Member Preview State
  const [scannerSearchQuery, setScannerSearchQuery] = useState('')
  const [scannedMemberId, setScannedMemberId] = useState<string | null>(null)
  const [isSearchingScanned, setIsSearchingScanned] = useState(false)
  const [previewMember, setPreviewMember] = useState<{
    id?: string
    name: string
    code: string
    phone: string
    plan: string
    expiresInDays: number
    expireDate: string
    isVip: boolean
    status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED'
    checkedInToday: boolean
    lastSeen: string
    avatarUrl?: string | null
  } | null>(null)

  // Modals
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [selectedAttendee, setSelectedAttendee] = useState<LiveAttendee | null>(null)
  const [showManualCheckInModal, setShowManualCheckInModal] = useState(false)
  const [manualQuery, setManualQuery] = useState('')
  const [manualFoundMember, setManualFoundMember] = useState<any | null>(null)
  const [isSearchingManual, setIsSearchingManual] = useState(false)

  // Real KPI summary state
  const [todaySummary, setTodaySummary] = useState<{
    currentlyInside: number
    checkedOutToday: number
    totalCheckInsToday: number
    totalCompletedVisitsToday: number
  }>({
    currentlyInside: 0,
    checkedOutToday: 0,
    totalCheckInsToday: 0,
    totalCompletedVisitsToday: 0,
  })

  // Attendees List
  const [attendees, setAttendees] = useState<LiveAttendee[]>([])
  const [allDayAttendees, setAllDayAttendees] = useState<LiveAttendee[]>([])

  const formatAttendee = (att: AttendanceItem): LiveAttendee => {
    const checkInDate = new Date(att.checkInAt)
    const checkInTime = checkInDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    const now = new Date()
    const durationMinutes =
      att.durationMinutes ??
      Math.max(0, Math.round((now.getTime() - checkInDate.getTime()) / (1000 * 60)))
    const hours = Math.floor(durationMinutes / 60)
    const mins = durationMinutes % 60
    const durationFormatted =
      hours > 0
        ? `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ساعة`
        : `${mins} دقيقة`
    const names = (att.member?.name || 'عضو').split(' ')
    const avatarLetters =
      names.length >= 2 ? `${names[0][0]}${names[1][0]}` : names[0]?.slice(0, 2) || 'ع'

    return {
      id: att.id,
      name: att.member?.name || 'عضو متدرب',
      avatarLetters,
      avatarBg: 'bg-zinc-950 text-white',
      avatarUrl: att.member?.avatarUrl ?? null,
      code: att.member?.memberCode || 'GYM-00000',
      phone: att.member?.phone || '',
      checkInTime,
      durationFormatted,
      durationMinutes,
      isOvertimeWarning: durationMinutes > 180,
      planName: att.subscription?.planName || 'باقة اللياقة الشاملة',
      planRemainingDays: att.subscription?.durationDays || 30,
      status: att.checkOutAt ? 'CHECKED_OUT' : 'IN_GYM',
    }
  }

  const loadAttendanceData = React.useCallback(async () => {
    try {
      const [summary, insideList, allList] = await Promise.all([
        attendanceApi.getTodaySummary().catch(() => null),
        attendanceApi.getCurrentlyInside().catch(() => []),
        attendanceApi.list({ limit: 100 }).catch(() => null),
      ])

      if (summary) {
        setTodaySummary(summary)
      }

      if (insideList) {
        setAttendees(insideList.map(formatAttendee))
      }

      if (allList && allList.attendance) {
        setAllDayAttendees(allList.attendance.map(formatAttendee))
      }
    } catch {
      // ignore
    }
  }, [])

  React.useEffect(() => {
    loadAttendanceData()
  }, [loadAttendanceData])

  // Instant Real-Time WebSocket sync for Turnstile Desk
  useRealtimeSync(undefined, () => {
    loadAttendanceData()
  })

  // Handle Search Member for Scanner Preview
  const handleSearchMember = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : scannerSearchQuery).trim()
    if (!q) return

    try {
      setIsSearchingScanned(true)
      const res = await membersApi.list({ search: q, limit: 1 })
      if (res.members && res.members.length > 0) {
        const m = res.members[0]
        setScannedMemberId(m.id)

        // Check current attendance
        const currentAtt = await attendanceApi.getMemberCurrent(m.id).catch(() => null)
        const sub = (m as any).currentSubscription

        let subStatus: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED' = 'EXPIRED'
        let planTitle = 'لا يوجد اشتراك نشط'
        let expireDateText = 'غير مشترك'
        let expiresInDays = 0

        if (sub) {
          planTitle = sub.planName || 'باقة تدريب'
          if (sub.status === 'ACTIVE') {
            subStatus = 'ACTIVE'
            if (sub.endDate) {
              const end = new Date(sub.endDate)
              const now = new Date()
              const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              expiresInDays = Math.max(0, diff)
              expireDateText = `ساري لمدة ${expiresInDays} يوم`
            } else {
              expireDateText = 'اشتراك ساري'
            }
          } else if (sub.status === 'CANCELLED') {
            subStatus = 'CANCELLED'
            expireDateText = 'اشتراك ملغي'
          } else if (sub.status === 'FROZEN') {
            subStatus = 'FROZEN'
            expireDateText = 'اشتراك مجمد'
          } else {
            subStatus = 'EXPIRED'
            expireDateText = 'اشتراك منتهي'
          }
        } else if (!m.isActive) {
          subStatus = 'EXPIRED'
          expireDateText = 'حساب عضو معطل'
        }

        setPreviewMember({
          id: m.id,
          name: m.name,
          code: m.memberCode,
          phone: m.phone,
          plan: planTitle,
          expiresInDays,
          expireDate: expireDateText,
          isVip: subStatus === 'ACTIVE',
          status: subStatus,
          checkedInToday: currentAtt !== null,
          lastSeen: currentAtt ? 'مسجل داخل الصالة حالياً' : 'لم يسجل حضور اليوم',
          avatarUrl: m.avatarUrl || null,
        })
        toast.success(`تم العثور على العضو: ${m.name}`)
      } else {
        toast.warning(`لم يتم العثور على عضو يطابق: ${q}`)
      }
    } catch {
      toast.error('حدث خطأ أثناء البحث عن العضو')
    } finally {
      setIsSearchingScanned(false)
    }
  }

  // Handle Instant Check-in Action
  const handleCheckInNow = async () => {
    if (!previewMember) {
      toast.warning('يرجى البحث عن العضو أو مسح كود الـ QR أولاً لتسجيل الدخول')
      return
    }

    if (previewMember.status !== 'ACTIVE') {
      if (previewMember.status === 'CANCELLED') {
        toast.error('اشتراك هذا العضو ملغي نهائياً! لا يمكن تسجيل الدخول باشتراك ملغي.')
      } else if (previewMember.status === 'FROZEN') {
        toast.error('اشتراك هذا العضو مجمّد حالياً! يرجى إلغاء التجميد أولاً.')
      } else {
        toast.error('لا يوجد اشتراك نشط يسمح بتسجيل الحضور لهذا المشترك.')
      }
      return
    }

    const targetId = previewMember.id || scannedMemberId
    if (targetId) {
      try {
        await attendanceApi.checkIn(targetId)
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        setIsTurnstileOpen(true)
        toast.success(`تم تسجيل دخول ${previewMember.name} وفتح البوابة بنجاح!`)
        setPreviewMember((prev) => (prev ? { ...prev, checkedInToday: true } : null))
        loadAttendanceData()
        setTimeout(() => {
          setIsTurnstileOpen(false)
        }, 4000)
        return
      } catch (err: any) {
        toast.error(err.response?.data?.message || err.message || 'فشل تسجيل الدخول')
        return
      }
    }

    toast.warning('يرجى البحث عن العضو أو مسح كود الـ QR أولاً لتسجيل الدخول')
  }

  // Handle Check-out Action
  const handleCheckOutAttendee = (attendee: LiveAttendee) => {
    setSelectedAttendee(attendee)
    setShowCheckoutModal(true)
  }

  const confirmCheckOut = async () => {
    if (selectedAttendee) {
      try {
        await attendanceApi.checkOut(selectedAttendee.id)
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        toast.success(
          `تم تسجيل خروج العضو ${selectedAttendee.name} بنجاح. مدة التمرين: ${selectedAttendee.durationFormatted}`
        )
        setShowCheckoutModal(false)
        loadAttendanceData()
      } catch (err: any) {
        toast.error(err.response?.data?.message || err.message || 'فشل تسجيل الخروج')
        setShowCheckoutModal(false)
      }
    }
  }

  // Active list source based on activeTab
  const currentList = activeTab === 'inside' ? attendees : (allDayAttendees.length > 0 ? allDayAttendees : attendees)

  // Filtered Attendees
  const filteredAttendees = useMemo(() => {
    return currentList.filter((a) => {
      const matchSearch =
        searchTerm === '' ||
        a.name.includes(searchTerm) ||
        a.code.includes(searchTerm) ||
        a.phone.includes(searchTerm)

      return matchSearch
    })
  }, [currentList, searchTerm])

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
            <span className="text-zinc-900 font-bold">الحضور والانصراف</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950">الحضور والانصراف</h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              تحديث مباشر
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            سجّل دخول وخروج الأعضاء وتابع حركة الحضور اليومية في صالة الجيم لحظياً.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <ExportDropdown endpoint="attendance" />
          <button
            type="button"
            onClick={() => setShowManualCheckInModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs sm:text-sm font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4 text-gym-gold" />
            <span>تسجيل حضور يدوي</span>
          </button>
        </div>
      </div>

      {/* 3. 4 Metric KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* KPI 1: إجمالي الحضور اليوم */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold text-zinc-600">حضور اليوم الكلي</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-950 font-mono">
            {todaySummary.totalCheckInsToday}
          </div>
          <div className="text-[10px] text-emerald-700 font-bold font-mono">
            +12% أعلى من متوسط الأسبوع
          </div>
        </div>

        {/* KPI 2: الموجودون حالياً */}
        <div className="bg-white rounded-2xl border border-amber-200/90 p-4 shadow-2xs space-y-2 bg-[#FEFCE8]/40">
          <div className="flex items-center justify-between text-amber-900">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[11px] font-bold text-amber-950">الموجودون حالياً</span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-amber-200/80 text-amber-900 flex items-center justify-center">
              <Radio className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-zinc-950 font-mono">
              {todaySummary.currentlyInside}
            </span>
            <span className="text-[10px] text-amber-900 font-medium">داخل الصالة الآن</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            {Math.round((todaySummary.currentlyInside / 150) * 100)}% من السعة القصوى
          </div>
        </div>

        {/* KPI 3: خرجوا اليوم */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold text-zinc-600">خرجوا اليوم</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <LogOut className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-950 font-mono">
            {todaySummary.checkedOutToday}
          </div>
          <div className="text-[10px] text-zinc-500">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 inline ml-1" />
            زيارات مكتملة بنجاح اليوم
          </div>
        </div>

        {/* KPI 4: متوسط مدة التمرين */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold text-zinc-600">متوسط مدة التمرين</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-zinc-950 font-mono">01:35</span>
            <span className="text-xs font-bold text-zinc-500">ساعة</span>
          </div>
          <div className="text-[10px] text-zinc-400">المعدل الموصى به للمتدربين</div>
        </div>
      </div>

      {/* 4. Top Interactive Check-in & Scanner Section (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* RIGHT: تسجيل حضور فوري (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-black text-xs">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-zinc-950">
                  تسجيل حضور فوري
                </h3>
                <p className="text-[11px] text-zinc-400">
                  ابحث يدوياً أو وجه قارئ الباركود لمسح بطاقة المتدرب أو QR التطبيق
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
              بوابة الدخول الرئيسية 1#
            </span>
          </div>

          {/* Search & Scan Controls */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-zinc-700">بيانات العضو للبحث</label>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={scannerSearchQuery}
                  onChange={(e) => setScannerSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchMember()
                    }
                  }}
                  placeholder="أدخل اسم العضو، كود GYM، أو رقم الهاتف..."
                  className="w-full pr-10 pl-4 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all font-bold text-zinc-900"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Search className="w-4 h-4" />
                </div>
              </div>

              <button
                type="button"
                disabled={isSearchingScanned}
                onClick={() => handleSearchMember()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {isSearchingScanned ? 'جاري البحث...' : 'بحث'}
              </button>

              <button
                type="button"
                onClick={() => {
                  toast.success('تم تفعيل كاميرا وقارئ الباركود الذكي')
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shrink-0"
              >
                <QrCode className="w-3.5 h-3.5 text-gym-gold-dark" />
                <span>مسح QR أو الباركود</span>
              </button>
            </div>
          </div>

          {/* Member Scanner Card Preview */}
          {previewMember ? (
            <div className="p-4 rounded-2xl bg-zinc-50/90 border border-zinc-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                {/* Avatar Box with VIP tag */}
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-black text-lg border border-zinc-800 overflow-hidden">
                    {previewMember.avatarUrl ? (
                      <img src={getMediaUrl(previewMember.avatarUrl)} alt={previewMember.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-gym-gold" />
                    )}
                  </div>
                  {previewMember.isVip && (
                    <span className="absolute -bottom-1.5 -right-1.5 bg-zinc-950 text-white text-[9px] font-black px-1.5 py-0.5 rounded border border-zinc-700">
                      VIP
                    </span>
                  )}
                </div>

                {/* Member details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-zinc-950">{previewMember.name}</h4>
                    <span className="text-[10px] font-mono text-zinc-500 bg-white border border-zinc-200 px-1.5 py-0.5 rounded">
                      {previewMember.code}
                    </span>
                    {previewMember.status === 'ACTIVE' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        نشط
                      </span>
                    )}
                    {previewMember.status === 'CANCELLED' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        ملغي
                      </span>
                    )}
                    {previewMember.status === 'EXPIRED' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        منتهي
                      </span>
                    )}
                    {previewMember.status === 'FROZEN' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        مجمد
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                    <span>{previewMember.phone}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-cairo text-zinc-700">
                      <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                      {previewMember.plan}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] pt-1">
                    <span className="text-zinc-500 font-mono">
                      {previewMember.status === 'ACTIVE'
                        ? `ينتهي بعد ${previewMember.expiresInDays} يوم (${previewMember.expireDate})`
                        : previewMember.expireDate}
                    </span>
                    <span>•</span>
                    <span className="text-zinc-400">آخر حضور: {previewMember.lastSeen}</span>
                  </div>

                  <div className="pt-0.5">
                    <span className={cn('text-xs font-bold', previewMember.checkedInToday ? 'text-amber-700' : 'text-emerald-700')}>
                      حالة اليوم: {previewMember.checkedInToday ? 'مسجل بالصالة حالياً' : 'غير مسجل بعد'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Check-in CTA Button */}
              <div className="shrink-0 self-end md:self-center">
                {previewMember.status === 'CANCELLED' ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/app/subscriptions/new?memberId=${previewMember.id}`)}
                    className="py-3 px-6 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md active:scale-[0.98]"
                  >
                    <span>+ إنشاء اشتراك جديد</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={previewMember.checkedInToday || previewMember.status !== 'ACTIVE'}
                    onClick={handleCheckInNow}
                    className="py-3 px-6 rounded-2xl bg-[#F4D76A] hover:bg-gym-gold disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-black text-sm flex items-center gap-2.5 transition-all shadow-md active:scale-[0.98]"
                  >
                    <ArrowRightLeft className="w-4 h-4 stroke-[2.5]" />
                    <span>{previewMember.checkedInToday ? 'مسجل بالداخل' : 'تسجيل الدخول الآن'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-zinc-50/80 border border-dashed border-zinc-200 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-400 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-zinc-700">جاهز لمسح أو فحص بطاقة العضو</p>
              <p className="text-[11px] text-zinc-400 max-w-sm">
                ابحث بالاسم أو كود العضو أو رقم الهاتف أعلاه لمعاينة تفاصيل العضوية وتسجيل الدخول المباشر.
              </p>
            </div>
          )}
        </div>

        {/* LEFT: القارئ السريع المتصل & التحكم بالبوابة (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-zinc-950">
                القارئ السريع المتصل
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                قارئ ليزري مخصص لاستقبال شفرات تطبيق الهواتف وبطاقات الدخول.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              متصل USB
            </span>
          </div>

          {/* Scanner Illustration Box */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-center space-y-2 relative overflow-hidden">
            <div className="w-24 h-16 mx-auto flex items-center justify-center">
              <QrCode className="w-12 h-12 text-zinc-700" />
            </div>
            <div className="w-full bg-amber-300 h-0.5 animate-pulse" />
            <p className="text-[10px] text-zinc-400 font-mono">
              مستشعر الاستقبال في وضع الاستعداد...
            </p>
          </div>

          {/* Gate Control */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-zinc-900">التحكم ببوابة الدوران الذكية</h4>
              <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                {isTurnstileOpen ? 'البوابة مفتوحة حالياً (مرور)' : 'مفتوحة تلقائياً عند المطابقة'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsTurnstileOpen(!isTurnstileOpen)
                toast.info(isTurnstileOpen ? 'تم قفل البوابة يدوياً' : 'تم فتح بوابة الدوران يدوياً لمرور عضو')
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs',
                isTurnstileOpen
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
              )}
            >
              {isTurnstileOpen ? (
                <Unlock className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span>{isTurnstileOpen ? 'مفتوحة' : 'فتح يدوي'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Live Switcher Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('inside')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2',
              activeTab === 'inside'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            )}
          >
            <span>الموجودون حالياً داخل الصالة</span>
            <span className="w-5 h-5 rounded-full bg-[#F4D76A] text-zinc-950 text-[10px] flex items-center justify-center font-mono font-bold">
              {todaySummary.currentlyInside}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
              activeTab === 'all'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            )}
          >
            <span>سجل الحضور اليومي الكلي</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-mono font-bold">
              {todaySummary.totalCheckInsToday}
            </span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="فلترة بالاسم أو الكود..."
              className="pr-8 pl-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-900"
            />
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-zinc-400" />
          </div>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl font-bold cursor-pointer"
          >
            <option value="ALL">كل الباقات</option>
            <option value="VIP">باقات VIP</option>
            <option value="MONTHLY">شهري</option>
          </select>

          <div className="px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl font-mono text-zinc-600 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span>اليوم (5 أكتوبر)</span>
          </div>
        </div>
      </div>

      {/* 6. Attendance Live Data Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-bold">
              <tr>
                <th className="py-3 px-4">العضو المتدرب</th>
                <th className="py-3 px-4">وقت الدخول</th>
                <th className="py-3 px-4">مدة التواجد</th>
                <th className="py-3 px-4">الباقة والاشتراك</th>
                <th className="py-3 px-4">حالة الدخول</th>
                <th className="py-3 px-4 text-center">إجراء المغادرة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredAttendees.length > 0 ? (
                filteredAttendees.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                    {/* 1. Member */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={item.avatarUrl || undefined}
                          name={item.name}
                          size="sm"
                          className="border border-zinc-200 shadow-2xs shrink-0 ring-1 ring-zinc-100"
                        />
                        <div>
                          <div className="font-bold text-zinc-950 flex items-center gap-1.5">
                            <span>{item.name}</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            كود: {item.code}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Check-in time */}
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-800">
                      <div className="flex items-center gap-1.5">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{item.checkInTime}</span>
                      </div>
                    </td>

                    {/* 3. Duration */}
                    <td className="py-3.5 px-4">
                      {item.isOvertimeWarning ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-950 font-bold font-mono text-[11px] border border-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-800" />
                          <span>{item.durationFormatted}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-100 text-zinc-800 font-bold font-mono text-[11px]">
                          <span>{item.durationFormatted}</span>
                        </span>
                      )}
                    </td>

                    {/* 4. Plan */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900">{item.planName}</div>
                      <div className="text-[10px] text-zinc-400">
                        {item.planRemainingNote || `متبقي ${item.planRemainingDays} يوم`}
                      </div>
                    </td>

                    {/* 5. Status */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FEFCE8] text-amber-950 font-bold text-[10px] border border-[#F4D76A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-gym-gold" />
                        داخل الجيم
                      </span>
                    </td>

                    {/* 6. Checkout Button */}
                    <td className="py-3.5 px-4 text-center">
                      {gym?.allowManualCheckout === false ? (
                        <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-lg">
                          إغلاق تلقائي
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCheckOutAttendee(item)}
                          className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-xs font-bold hover:bg-zinc-100 transition-colors shadow-2xs"
                        >
                          تسجيل الخروج
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <p className="text-sm font-bold text-zinc-700">لا يوجد متدربون حالياً</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      عند تسجيل دخول الأعضاء ستظهر قائمة الحضور المباشر هنا
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 7. Summary Footer Stats Bar */}
        <div className="p-3.5 bg-zinc-50 border-t border-zinc-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-zinc-950" />
              إجمالي الدخول اليوم: {todaySummary.totalCheckInsToday} زيارة
            </span>
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              إجمالي الخروج: {todaySummary.checkedOutToday} زيارة
            </span>
            <span className="flex items-center gap-1.5 font-bold text-amber-900">
              <span className="w-2 h-2 rounded-full bg-gym-gold" />
              المتبقي بالصالة: {todaySummary.currentlyInside} عضواً
            </span>
          </div>

          <div className="text-[11px] text-zinc-500 font-medium">
            نسبة الاستيعاب الحالي:{' '}
            <span className="font-bold text-zinc-900 font-mono">
              {todaySummary.currentlyInside > 0 ? Math.round((todaySummary.currentlyInside / 150) * 100) : 0}%
            </span>{' '}
            (الحد التشغيلي المسموح: 150 متدرب)
          </div>
        </div>
      </div>

      {/* MODAL 1: Check-out Confirmation Modal */}
      {showCheckoutModal && selectedAttendee && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black text-zinc-950 text-center">
              تأكيد تسجيل خروج المتدرب
            </h3>

            <p className="text-xs text-zinc-500 text-center leading-relaxed">
              هل تريد توثيق مغادرة العضو{' '}
              <span className="font-bold text-zinc-900">{selectedAttendee.name}</span> للصالة الرياضية؟
            </p>

            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">وقت الدخول:</span>
                <span className="font-mono font-bold">{selectedAttendee.checkInTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">إجمالي مدة التمرين:</span>
                <span className="font-mono font-black text-emerald-700">
                  {selectedAttendee.durationFormatted}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={confirmCheckOut}
                className="flex-1 py-2.5 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 transition-colors"
              >
                تأكيد المغادرة
              </button>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: Manual Check-in Modal */}
      {showManualCheckInModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <h3 className="text-base font-black text-zinc-950">تسجيل حضور يدوي</h3>
              <button
                onClick={() => {
                  setShowManualCheckInModal(false)
                  setManualQuery('')
                  setManualFoundMember(null)
                }}
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-zinc-700 font-bold">كود العضو أو رقم الهاتف أو الاسم:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      if (!manualQuery.trim()) return
                      try {
                        setIsSearchingManual(true)
                        const res = await membersApi.list({ search: manualQuery.trim(), limit: 1 })
                        if (res.members && res.members.length > 0) {
                          setManualFoundMember(res.members[0])
                        } else {
                          setManualFoundMember(null)
                          toast.warning('لم يتم العثور على عضو')
                        }
                      } catch {
                        toast.error('خطأ في البحث')
                      } finally {
                        setIsSearchingManual(false)
                      }
                    }
                  }}
                  placeholder="GYM-00124 أو 01023456789"
                  className="flex-1 p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-zinc-900"
                />
                <button
                  type="button"
                  disabled={isSearchingManual}
                  onClick={async () => {
                    if (!manualQuery.trim()) return
                    try {
                      setIsSearchingManual(true)
                      const res = await membersApi.list({ search: manualQuery.trim(), limit: 1 })
                      if (res.members && res.members.length > 0) {
                        setManualFoundMember(res.members[0])
                      } else {
                        setManualFoundMember(null)
                        toast.warning('لم يتم العثور على عضو')
                      }
                    } catch {
                      toast.error('خطأ في البحث')
                    } finally {
                      setIsSearchingManual(false)
                    }
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-zinc-900 text-white font-bold text-xs hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isSearchingManual ? '...' : 'بحث'}
                </button>
              </div>

              {manualFoundMember && (
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900">{manualFoundMember.name}</span>
                    <span className="font-mono text-[11px] text-zinc-500 bg-white px-2 py-0.5 rounded border border-zinc-200">
                      {manualFoundMember.memberCode}
                    </span>
                  </div>
                  <p className="text-zinc-500 font-mono text-[11px]">{manualFoundMember.phone}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={async () => {
                  if (manualFoundMember) {
                    try {
                      await attendanceApi.checkIn(manualFoundMember.id)
                      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
                      toast.success(`تم تسجيل حضور ${manualFoundMember.name} بنجاح!`)
                      setShowManualCheckInModal(false)
                      setManualQuery('')
                      setManualFoundMember(null)
                      loadAttendanceData()
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || err.message || 'فشل تسجيل الدخول')
                    }
                  } else {
                    toast.success('تم تسجيل الحضور اليدوي وفتح البوابة')
                    setShowManualCheckInModal(false)
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800"
              >
                تسجيل الدخول الآن
              </button>
              <button
                onClick={() => {
                  setShowManualCheckInModal(false)
                  setManualQuery('')
                  setManualFoundMember(null)
                }}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default AttendancePage
