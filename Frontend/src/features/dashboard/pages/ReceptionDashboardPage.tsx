import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  UserPlus,
  CreditCard,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  QrCode,
  Receipt,
  ChevronLeft,
  X,
  Building,
  Wallet,
  FileText,
  Award,
  Zap,
  Loader2,
  LogOut,
  UserCheck,
  Maximize2,
  Minimize2,
  Clock,
} from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'
import { dashboardApi } from '../services/dashboardApi'
import { attendanceApi } from '@/features/attendance/services/attendanceApi'
import { paymentsApi } from '@/features/payments/services/paymentsApi'
import { membersApi } from '@/features/members/services/membersApi'
import type { DashboardOverviewData } from '../types/dashboard.types'
import type { AttendanceItem } from '@/features/attendance/types/attendance.types'
import type { PaymentItem } from '@/features/payments/types/payment.types'
import type { MemberItem } from '@/features/members/types/member.types'
import { Avatar } from '@/components/ui/Avatar'
import { useRealtimeSync } from '@/services/socket'

export const ReceptionDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, gym } = useAuth()

  // Fullscreen / Kiosk Mode State
  const [isFullscreen, setIsFullscreen] = useState(() => {
    return searchParams.get('fullscreen') === 'true' || searchParams.get('kiosk') === 'true'
  })

  // Real Data States
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null)
  const [liveAttendees, setLiveAttendees] = useState<AttendanceItem[]>([])
  const [recentPayments, setRecentPayments] = useState<PaymentItem[]>([])
  const [recentMembers, setRecentMembers] = useState<MemberItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Search Bar State
  const [searchQuery, setSearchQuery] = useState('')

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
    }, 4000)
  }

  // Modals
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Quick Attendance Form States
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [attendanceSearchResults, setAttendanceSearchResults] = useState<MemberItem[]>([])
  const [selectedAttendanceMember, setSelectedAttendanceMember] = useState<MemberItem | null>(null)
  const [isSearchingMember, setIsSearchingMember] = useState(false)
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false)

  // Quick Payment Form States
  const [paymentMemberSearch, setPaymentMemberSearch] = useState('')
  const [paymentSearchResults, setPaymentSearchResults] = useState<MemberItem[]>([])
  const [selectedPaymentMember, setSelectedPaymentMember] = useState<MemberItem | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('500')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'WALLET'>('CASH')
  const [walletProvider, setWalletProvider] = useState<'VODAFONE_CASH' | 'INSTAPAY' | 'ORANGE_CASH'>('VODAFONE_CASH')
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)

  // Live Digital Clock for Kiosk
  const [currentTime, setCurrentTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  const liveTimeFormatted = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(currentTime)

  // Fullscreen Handlers
  const handleEnterFullscreen = async () => {
    setIsFullscreen(true)
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Ignored if browser blocks native fullscreen
    }
  }

  const handleExitFullscreen = async () => {
    setIsFullscreen(false)
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen()
      }
    } catch {
      // Ignored
    }
  }

  // Listen to native Fullscreen & Escape key
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        handleExitFullscreen()
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

  // Load Dashboard Data
  const loadAllData = useCallback(async () => {
    try {
      setErrorMessage(null)
      const [ovData, insideData, payData, memData] = await Promise.all([
        dashboardApi.getOverview().catch(() => null),
        attendanceApi.getCurrentlyInside().catch(() => []),
        paymentsApi.list({ limit: 5 }).catch(() => ({ payments: [] })),
        membersApi.list({ limit: 5 }).catch(() => ({ members: [] })),
      ])

      if (ovData) setOverview(ovData)
      setLiveAttendees(insideData)
      setRecentPayments(payData.payments || [])
      setRecentMembers(memData.members || [])
    } catch (err: any) {
      setErrorMessage(err?.message || 'تعذر تحميل بيانات الاستقبال')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAllData()
    const interval = setInterval(loadAllData, 30000)
    return () => clearInterval(interval)
  }, [loadAllData])

  // Instant Real-Time WebSocket updates for Reception Desk
  useRealtimeSync(undefined, () => {
    loadAllData()
  })

  // Quick Attendance Member Autocomplete
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

  // Quick Payment Member Autocomplete
  useEffect(() => {
    if (!paymentMemberSearch.trim() || paymentMemberSearch.length < 2) {
      setPaymentSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingMember(true)
        const res = await membersApi.list({ search: paymentMemberSearch, limit: 5 })
        setPaymentSearchResults(res.members)
      } catch {
        setPaymentSearchResults([])
      } finally {
        setIsSearchingMember(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [paymentMemberSearch])

  // Handle Quick Check-in
  const handleConfirmAttendance = async () => {
    if (!selectedAttendanceMember) {
      triggerToast('يرجى اختيار العضو أولاً', 'error')
      return
    }

    try {
      setIsSubmittingAttendance(true)
      await attendanceApi.checkIn(selectedAttendanceMember.id)
      triggerToast(`تم تسجيل دخول ${selectedAttendanceMember.name} بنجاح!`)
      setShowAttendanceModal(false)
      setSelectedAttendanceMember(null)
      setAttendanceSearch('')
      setAttendanceSearchResults([])
      await loadAllData()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'فشل تسجيل الدخول'
      triggerToast(msg, 'error')
    } finally {
      setIsSubmittingAttendance(false)
    }
  }

  // Handle Quick Check-out
  const handleCheckOut = async (attendanceId: string, memberName: string) => {
    try {
      await attendanceApi.checkOut(attendanceId)
      triggerToast(`تم تسجيل خروج ${memberName} بنجاح!`)
      await loadAllData()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'فشل تسجيل الخروج'
      triggerToast(msg, 'error')
    }
  }

  // Handle Quick Payment
  const handleConfirmPayment = async () => {
    if (!selectedPaymentMember) {
      triggerToast('يرجى اختيار العضو أولاً', 'error')
      return
    }

    try {
      setIsSubmittingPayment(true)
      const memberDetails = await membersApi.getById(selectedPaymentMember.id)
      const activeSub =
        memberDetails.currentSubscription ||
        (memberDetails as any).subscriptions?.find(
          (s: any) => s.status === 'ACTIVE' || s.status === 'EXPIRED'
        )

      if (!activeSub) {
        triggerToast('هذا العضو ليس لديه اشتراك متاح لإضافة دفعة له. يرجى إنشاء اشتراك أولاً.', 'error')
        return
      }

      await paymentsApi.create({
        subscriptionId: activeSub.id,
        amount: Number(paymentAmount),
        method: paymentMethod,
        walletProvider: paymentMethod === 'WALLET' ? walletProvider : undefined,
      })

      triggerToast('تم تسجيل الدفعة وإضافة الإيصال بنجاح!')
      setShowPaymentModal(false)
      setSelectedPaymentMember(null)
      setPaymentMemberSearch('')
      setPaymentSearchResults([])
      await loadAllData()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'فشل تسجيل الدفعة'
      triggerToast(msg, 'error')
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  // Handle Top Search Submit
  const handleTopSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/app/members?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const currentDateFormatted = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  // Format standard numerals
  const formatNum = (num: number | string | undefined | null) => {
    if (num === undefined || num === null) return '0'
    const n = typeof num === 'string' ? parseFloat(num) : num
    if (isNaN(n)) return '0'
    return n.toLocaleString('en-US')
  }

  // Common Dashboard Content
  const renderDashboardContent = (isKioskView: boolean) => (
    <>
      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold">تعذر مزامنة بعض بيانات الاستقبال</div>
              <div className="text-xs text-rose-700 mt-0.5">{errorMessage}</div>
            </div>
          </div>
          <button
            onClick={loadAllData}
            className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Normal Welcome Header (Visible when NOT in full kiosk mode) */}
      {!isKioskView && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight flex items-center gap-2">
                <span>أهلاً بك، {user?.name || 'فريق الاستقبال'}</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>مكتب الاستقبال الرئيسي • متصل الآن</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 font-medium">
              <span>متابعة حركة المتدربين والاشتراكات والتحصيل اليومي</span>
              <span>|</span>
              <span className="font-bold text-zinc-700">{currentDateFormatted}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            {/* Fullscreen Button */}
            <button
              onClick={handleEnterFullscreen}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white border border-zinc-200/90 text-zinc-800 hover:bg-zinc-50 shadow-2xs transition active:scale-95 group"
              title="فتح شاشة الاستقبال بعرض كامل بدون القوائم الجانبية"
            >
              <Maximize2 className="w-4 h-4 text-zinc-600 group-hover:text-gym-gold transition-colors" />
              <span>عرض كامل للشاشة</span>
            </button>

            <button
              onClick={() => navigate('/app/members/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-zinc-950 text-white hover:bg-zinc-800 shadow-sm transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ إضافة عضو جديد</span>
            </button>

            <button
              onClick={() => {
                setSelectedAttendanceMember(null)
                setAttendanceSearch('')
                setShowAttendanceModal(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gym-gold hover:bg-[#E5C158] text-amber-950 shadow-sm transition active:scale-95"
            >
              <QrCode className="w-4 h-4 text-amber-950" />
              <span>تسجيل حضور</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Search Box */}
      <form onSubmit={handleTopSearch} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث بسرعة: اسم العضو، رقم الهاتف (010...)، أو كود العضوية ثم اضغط Enter..."
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-zinc-200/90 rounded-2xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-gym-gold/20 focus:border-gym-gold shadow-2xs transition"
        />
        <button
          type="submit"
          className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center transition"
          title="بحث فوري"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {/* 5 KPI Stat Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-zinc-200/70 rounded-2xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: أعضاء جدد هذا الشهر */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-zinc-300 transition">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-500">الأعضاء الجدد (الشهر)</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-zinc-950">
                {overview?.members?.newThisMonth ?? 0}
              </span>
              <div className="text-right">
                <span className="text-[11px] font-bold text-zinc-500">
                  من إجمالي {overview?.members?.total ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: الحضور اليوم */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-zinc-300 transition">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center">
                <Building className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-500">دخول اليوم</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-zinc-950">
                {overview?.attendance?.checkInsToday ?? 0}
              </span>
              <div className="text-right">
                <span className="text-[11px] font-bold text-emerald-600">
                  {liveAttendees.length} بالصالة الآن
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: اشتراكات نشطة */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-zinc-300 transition">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-500">اشتراكات نشطة</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-zinc-950">
                {overview?.subscriptions?.active ?? 0}
              </span>
              <div className="text-right">
                <span className="text-[11px] font-bold text-zinc-500">
                  {overview?.subscriptions?.frozen ?? 0} مجمد
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: مدفوعات اليوم */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-zinc-300 transition">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-500">تحصيل اليوم</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-xl sm:text-2xl font-black text-zinc-950">
                {formatNum(overview?.payments?.collectedToday)}{' '}
                <span className="text-xs font-bold text-zinc-600">ج.م</span>
              </div>
              <div className="text-[10px] text-zinc-400 text-right">المسجل بالخزينة</div>
            </div>
          </div>

          {/* Card 5: مبالغ مستحقة */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-zinc-300 transition">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-500">مبالغ مستحقة</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-xl sm:text-2xl font-black text-rose-600">
                {formatNum(overview?.payments?.outstandingAmount)}{' '}
                <span className="text-xs font-bold text-rose-600">ج.م</span>
              </div>
              <div className="text-[10px] text-zinc-400 text-right">متبقيات الاشتراكات</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Shortcuts Panel */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm sm:text-base font-black text-zinc-950">الإجراءات السريعة</h2>
          <span className="text-xs text-zinc-400 font-normal">اختصارات لوحة تحكم الاستقبال اليومية</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action 1: Add Member */}
          <button
            onClick={() => navigate('/app/members/new')}
            className="p-4 bg-zinc-50 hover:bg-zinc-100/90 rounded-2xl border border-zinc-200/70 flex flex-col items-center text-center transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center mb-2.5 group-hover:scale-110 transition shadow-2xs">
              <UserPlus className="w-5 h-5 text-gym-gold" />
            </div>
            <span className="text-xs font-bold text-zinc-950">إضافة عضو</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">إنشاء ملف عضو جديد</span>
          </button>

          {/* Action 2: Quick Attendance */}
          <button
            onClick={() => {
              setSelectedAttendanceMember(null)
              setAttendanceSearch('')
              setShowAttendanceModal(true)
            }}
            className="p-4 bg-zinc-50 hover:bg-zinc-100/90 rounded-2xl border border-zinc-200/70 flex flex-col items-center text-center transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FAF0D3] text-[#7E6517] flex items-center justify-center mb-2.5 group-hover:scale-110 transition border border-[#ECD9A2] shadow-2xs">
              <QrCode className="w-5 h-5 text-[#B8941F]" />
            </div>
            <span className="text-xs font-bold text-zinc-950">تسجيل حضور</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">تسجيل دخول عضو</span>
          </button>

          {/* Action 3: Record Payment */}
          <button
            onClick={() => {
              setSelectedPaymentMember(null)
              setPaymentMemberSearch('')
              setShowPaymentModal(true)
            }}
            className="p-4 bg-zinc-50 hover:bg-zinc-100/90 rounded-2xl border border-zinc-200/70 flex flex-col items-center text-center transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2.5 group-hover:scale-110 transition border border-emerald-200 shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-zinc-950">تسجيل دفعة</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">تحصيل نقدي أو كاش</span>
          </button>

          {/* Action 4: Create Subscription */}
          <button
            onClick={() => navigate('/app/subscriptions/new')}
            className="p-4 bg-zinc-50 hover:bg-zinc-100/90 rounded-2xl border border-zinc-200/70 flex flex-col items-center text-center transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-2.5 group-hover:scale-110 transition border border-slate-200 shadow-2xs">
              <Award className="w-5 h-5 text-zinc-700" />
            </div>
            <span className="text-xs font-bold text-zinc-950">إنشاء اشتراك</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">إضافة باقة لعضو</span>
          </button>

          {/* Action 5: Renew Subscription */}
          <button
            onClick={() => navigate('/app/subscriptions')}
            className="p-4 bg-zinc-50 hover:bg-zinc-100/90 rounded-2xl border border-zinc-200/70 flex flex-col items-center text-center transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center mb-2.5 group-hover:scale-110 transition border border-amber-200 shadow-2xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-zinc-950">إدارة الاشتراكات</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">تجديد أو ترقية</span>
          </button>

          {/* Action 6: Find Member */}
          <button
            onClick={() => navigate('/app/members')}
            className="p-4 bg-zinc-50 hover:bg-zinc-100/90 rounded-2xl border border-zinc-200/70 flex flex-col items-center text-center transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center mb-2.5 group-hover:scale-110 transition border border-blue-200 shadow-2xs">
              <Search className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-zinc-950">البحث عن عضو</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">الوصول السريع لملف</span>
          </button>
        </div>
      </div>

      {/* Middle Section: Live Gym Attendance & Expiring Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Panel: Live Attendance Table */}
        <div className="lg:col-span-8 bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="text-base font-black text-zinc-950">الحضور الآن في الصالة</h3>
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[#FAF0D3] text-[#7E6517]">
                {liveAttendees.length} متدرب
              </span>
            </div>

            <div className="text-xs text-zinc-500 font-semibold">
              إجمالي تسجيلات الدخول اليوم: {overview?.attendance?.checkInsToday ?? 0}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-zinc-50/80 text-zinc-500 font-bold border-y border-zinc-100">
                  <th className="py-3 px-4">العضو</th>
                  <th className="py-3 px-3">الكود</th>
                  <th className="py-3 px-3 text-center">وقت الدخول</th>
                  <th className="py-3 px-3 text-center">مدة التواجد</th>
                  <th className="py-3 px-4 text-left">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {liveAttendees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-zinc-400 font-medium">
                      لا يوجد متدربون متواجدون في الصالة حالياً
                    </td>
                  </tr>
                ) : (
                  liveAttendees.map((att) => {
                    const checkInTime = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    }).format(new Date(att.checkInAt))
                    const durationStr = att.durationMinutes
                      ? `${Math.floor(att.durationMinutes / 60)}س ${att.durationMinutes % 60}د`
                      : 'أقل من دقيقة'

                    return (
                      <tr key={att.id} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={att.member?.avatarUrl || undefined}
                              name={att.member?.name || 'عضو'}
                              size="sm"
                              className="border border-zinc-200 shadow-2xs"
                            />
                            <div>
                              <span className="font-bold text-zinc-900 block">
                                {att.member?.name || 'عضو'}
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                {att.subscription?.planName || 'اشتراك عام'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-zinc-700">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200/80 text-xs">
                            {att.member?.memberCode || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-zinc-700">
                          {checkInTime}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-zinc-900">
                          {durationStr}
                        </td>
                        <td className="py-3 px-4 text-left">
                          <button
                            type="button"
                            onClick={() => handleCheckOut(att.id, att.member?.name || 'العضو')}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-100 hover:bg-rose-50 hover:text-rose-600 text-zinc-800 transition flex items-center gap-1.5 ml-auto"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>تسجيل خروج</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <button
              onClick={() => navigate('/app/attendance')}
              className="font-bold text-zinc-900 hover:text-amber-800 transition flex items-center gap-1"
            >
              <span>عرض سجل الحضور اليومي الكامل</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-zinc-400 text-[11px]">يتم التحديث تلقائياً بشكل دوري</span>
          </div>
        </div>

        {/* Left Panel: Expiring Subscriptions */}
        <div className="lg:col-span-4 bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black text-zinc-950">اشتراكات تنتهي قريباً</h3>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              {overview?.upcomingExpirations?.length ?? 0} بحاجة لمتابعة
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="text-zinc-400 border-b border-zinc-100 font-bold">
                  <th className="pb-2">العضو</th>
                  <th className="pb-2">الباقة</th>
                  <th className="pb-2 text-center">المهلة</th>
                  <th className="pb-2 text-left">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {!overview?.upcomingExpirations || overview.upcomingExpirations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-400">
                      لا توجد اشتراكات تشارف على الانتهاء حالياً
                    </td>
                  </tr>
                ) : (
                  overview.upcomingExpirations.slice(0, 5).map((item) => (
                    <tr key={item.subscriptionId} className="hover:bg-zinc-50/50 transition">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={item.memberAvatarUrl || undefined}
                            name={item.memberName}
                            size="sm"
                            className="border border-zinc-200 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-zinc-900 block">{item.memberName}</span>
                            <span className="text-[10px] text-zinc-400">{item.memberPhone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-zinc-500 text-[11px]">{item.planName}</td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.daysRemaining <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.daysRemaining <= 0 ? 'ينتهي اليوم' : `باقي ${item.daysRemaining} أيام`}
                        </span>
                      </td>
                      <td className="py-2.5 text-left">
                        <button
                          onClick={() => navigate(`/app/subscriptions/${item.subscriptionId}/renew`)}
                          className="text-[11px] font-bold text-amber-700 hover:text-amber-900"
                        >
                          تجديد
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Payments & Recent Members */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Recent Payments */}
        <div className="lg:col-span-4 bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black text-zinc-950">آخر المدفوعات المسجلة</h3>
            <button
              onClick={() => navigate('/app/payments')}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition flex items-center gap-1"
            >
              <span>عرض الكل</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentPayments.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              لا توجد مدفوعات مسجلة حتى الآن
            </div>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((payment) => {
                const methodLabel = payment.method === 'CASH' ? 'نقدي (كاش)' : 'محفظة إلكترونية'
                const pTime = new Date(payment.createdAt).toLocaleTimeString('ar-EG', {
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <div
                    key={payment.id}
                    className="p-3 bg-zinc-50 rounded-xl flex items-center justify-between hover:bg-zinc-100/70 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900">
                          {payment.member?.name || 'عضو'}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {methodLabel} • {pTime}
                        </div>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="text-xs font-black text-zinc-950">
                        {formatNum(payment.amount)} ج.م
                      </div>
                      <span className="inline-block text-[10px] font-bold text-emerald-600">
                        مكتملة
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <button
            onClick={() => {
              setSelectedPaymentMember(null)
              setPaymentMemberSearch('')
              setShowPaymentModal(true)
            }}
            className="w-full py-2.5 bg-zinc-950 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition flex items-center justify-center gap-2 shadow-2xs"
          >
            <CreditCard className="w-4 h-4 text-gym-gold" />
            <span>تسجيل دفعة جديدة</span>
          </button>
        </div>

        {/* Right Panel: Recent Members */}
        <div className="lg:col-span-8 bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-zinc-950">آخر الأعضاء المنضمين</h3>
              <p className="text-xs text-zinc-400 mt-0.5">أحدث المشتركين المسجلين بالاستقبال</p>
            </div>
            <button
              onClick={() => navigate('/app/members')}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition flex items-center gap-1"
            >
              <span>عرض كافة الأعضاء</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentMembers.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-400">
              لم يتم العثور على أعضاء مسجلين في النظام
            </div>
          ) : (
            <div className="space-y-3">
              {recentMembers.map((member) => {
                const joinDate = new Date(member.createdAt).toLocaleDateString('ar-EG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })

                return (
                  <div
                    key={member.id}
                    className="p-3.5 bg-zinc-50 hover:bg-zinc-100/70 rounded-2xl border border-zinc-200/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={member.avatarUrl || undefined}
                        name={member.name}
                        size="md"
                        className="border border-zinc-200 shadow-2xs"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 text-xs sm:text-sm">
                            {member.name}
                          </span>
                          <span className="text-[11px] text-zinc-700 font-bold bg-zinc-100 border border-zinc-200/80 px-1.5 py-0.2 rounded">
                            {member.memberCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          تاريخ التسجيل: {joinDate} • الهاتف: {member.phone}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/app/members/${member.id}`)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 self-end sm:self-auto transition"
                    >
                      عرض الملف
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )

  return (
    <>
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

      {/* FULLSCREEN KIOSK VIEW (Takes 100% of entire monitor without sidebar or top app header) */}
      {isFullscreen ? (
        <div className="fixed inset-0 z-50 bg-[#F4F4F6] overflow-y-auto font-cairo text-right" dir="rtl">
          {/* Dedicated Kiosk Top Bar */}
          <header className="sticky top-0 z-40 bg-zinc-950 text-white border-b border-zinc-800 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xl">
            {/* Right: Branding & Kiosk Badge */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-gym-gold to-amber-600 flex items-center justify-center font-black text-amber-950 text-sm shadow-gold-glow">
                VIP
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-white">{gym?.name || 'جيم في أي بي'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>شاشة الاستقبال الكاملة (Kiosk)</span>
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">مكتب الاستقبال الرئيسي • وضع العمل المستقل</p>
              </div>
            </div>

            {/* Center: Live Digital Clock & Date */}
            <div className="hidden md:flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-4 py-1.5 rounded-xl text-xs">
              <Clock className="w-4 h-4 text-[#F5D86B]" />
              <span className="font-bold text-[#F5D86B] text-sm tracking-wider">{liveTimeFormatted}</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-300 font-medium">{currentDateFormatted}</span>
            </div>

            {/* Left: Quick Actions & Exit Button */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedAttendanceMember(null)
                  setAttendanceSearch('')
                  setShowAttendanceModal(true)
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-[#F5D86B] hover:bg-[#ECCB50] text-zinc-950 transition active:scale-95 shadow-sm"
              >
                <QrCode className="w-4 h-4 text-zinc-950" />
                <span>تسجيل حضور</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/app/members/new')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition active:scale-95 border border-zinc-700"
              >
                <UserPlus className="w-4 h-4 text-zinc-300" />
                <span>+ إضافة عضو</span>
              </button>

              <button
                type="button"
                onClick={handleExitFullscreen}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition active:scale-95 shadow-sm"
                title="الخروج من وضع الشاشة الكاملة (أو اضغط زر Esc)"
              >
                <Minimize2 className="w-4 h-4" />
                <span>خروج من ملء الشاشة (Esc)</span>
              </button>
            </div>
          </header>

          {/* Full-width Kiosk Canvas */}
          <div className="max-w-[1700px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {renderDashboardContent(true)}
          </div>
        </div>
      ) : (
        /* NORMAL EMBEDDED VIEW (Inside AppShell) */
        <div className="space-y-6 max-w-7xl mx-auto pb-12 font-cairo" dir="rtl">
          {renderDashboardContent(false)}
        </div>
      )}

      {/* QUICK MODAL 1: Quick Attendance Check-in */}
      {showAttendanceModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 text-right animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950">تسجيل حضور فوري بالاستقبال</h3>
                  <div className="text-xs text-zinc-500">ابحث باسم العضو، الهاتف، أو الكود</div>
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
                اسم العضو / كود العضوية / رقم الهاتف
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
                        <div className="text-[10px] text-zinc-400 font-bold">{m.phone}</div>
                      </div>
                      <span className="text-[11px] font-bold bg-zinc-100 px-2 py-0.5 rounded text-zinc-700">
                        {m.memberCode}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedAttendanceMember && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>تم تحديد العضو: {selectedAttendanceMember.name} ({selectedAttendanceMember.memberCode})</span>
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
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#F5D86B] text-zinc-950 hover:bg-[#ECCB50] disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
              >
                {isSubmittingAttendance && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>تأكيد تسجيل الدخول</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* QUICK MODAL 2: Quick Payment Modal */}
      {showPaymentModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 text-right animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950">تسجيل دفعة بالاستقبال</h3>
                  <div className="text-xs text-zinc-500">تحصيل اشتراك كاش أو محفظة</div>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  البحث عن العضو
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو الهاتف..."
                    value={paymentMemberSearch}
                    onChange={(e) => {
                      setPaymentMemberSearch(e.target.value)
                      if (selectedPaymentMember) setSelectedPaymentMember(null)
                    }}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {isSearchingMember && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                    </div>
                  )}
                </div>

                {paymentSearchResults.length > 0 && !selectedPaymentMember && (
                  <div className="mt-1 border border-zinc-200 rounded-xl bg-white shadow-lg overflow-hidden divide-y divide-zinc-100 max-h-40 overflow-y-auto">
                    {paymentSearchResults.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedPaymentMember(m)
                          setPaymentMemberSearch(`${m.name} (${m.memberCode})`)
                          setPaymentSearchResults([])
                        }}
                        className="w-full p-2 text-right hover:bg-emerald-50 flex items-center justify-between transition text-xs"
                      >
                        <div>
                          <div className="font-bold text-zinc-900">{m.name}</div>
                          <div className="text-[10px] text-zinc-400 font-bold">{m.phone}</div>
                        </div>
                        <span className="font-bold bg-zinc-100 px-2 py-0.5 rounded text-[11px] text-zinc-700">
                          {m.memberCode}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedPaymentMember && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span>العضو المختار: {selectedPaymentMember.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaymentMember(null)
                        setPaymentMemberSearch('')
                      }}
                      className="text-zinc-400 hover:text-rose-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  المبلغ المحصل (ج.م)
                </label>
                <input
                  type="number"
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-base font-black text-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">طريقة الدفع</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      paymentMethod === 'CASH'
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    نقدي (كاش)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('WALLET')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      paymentMethod === 'WALLET'
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    محفظة إلكترونية
                  </button>
                </div>
              </div>

              {paymentMethod === 'WALLET' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">نوع المحفظة</label>
                  <select
                    value={walletProvider}
                    onChange={(e: any) => setWalletProvider(e.target.value)}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none"
                  >
                    <option value="VODAFONE_CASH">فودافون كاش</option>
                    <option value="INSTAPAY">انستاباي (InstaPay)</option>
                    <option value="ORANGE_CASH">أورنج كاش</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!selectedPaymentMember || !paymentAmount || isSubmittingPayment}
                onClick={handleConfirmPayment}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
              >
                {isSubmittingPayment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>تأكيد تسجيل الدفعة</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default ReceptionDashboardPage
