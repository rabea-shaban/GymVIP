import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Calendar,
  CheckCircle2,
  RotateCcw,
  Search,
  ChevronLeft,
  X,
  Phone,
  MessageCircle,
  QrCode,
  Building,
  Flame,
  AlertTriangle,
  Loader2,
  UserCheck,
  LogOut,
  Maximize2
} from 'lucide-react'
import { attendanceApi } from '../services/attendanceApi'
import { membersApi } from '@/features/members/services/membersApi'
import { ExportDropdown } from '@/components/ui/ExportDropdown'
import type { AttendanceItem } from '../types/attendance.types'
import type { MemberItem } from '@/features/members/types/member.types'

export const TraineeAttendancePage: React.FC = () => {
  const navigate = useNavigate()

  // Real Data States
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceItem[]>([])
  const [liveAttendees, setLiveAttendees] = useState<AttendanceItem[]>([])
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
  const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null)
  const [isSearchingMember, setIsSearchingMember] = useState(false)
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
      const [listRes, insideRes] = await Promise.all([
        attendanceApi.list({ limit: 50 }).catch(() => ({ attendance: [] })),
        attendanceApi.getCurrentlyInside().catch(() => []),
      ])

      setAttendanceRecords(listRes.attendance || [])
      setLiveAttendees(insideRes || [])
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

  // Search Members for Check-in
  useEffect(() => {
    if (!memberSearchQuery.trim() || memberSearchQuery.length < 2) {
      setMemberSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingMember(true)
        const res = await membersApi.list({ search: memberSearchQuery, limit: 5 })
        setMemberSearchResults(res.members)
      } catch {
        setMemberSearchResults([])
      } finally {
        setIsSearchingMember(false)
      }
    }, 300)

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
  const insideCount = liveAttendees.length
  const completedCount = attendanceRecords.filter((r) => r.checkOutAt).length
  const totalToday = attendanceRecords.length

  const currentDateFormatted = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

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
                  const initials = (item.member?.name || 'م').slice(0, 2)
                  const checkInTime = new Date(item.checkInAt).toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const checkOutTime = item.checkOutAt
                    ? new Date(item.checkOutAt).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'
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
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none ${
                              isInside ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {initials}
                          </div>
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
      {drawerOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white h-full max-w-md w-full p-6 shadow-2xl overflow-y-auto space-y-6 text-right flex flex-col justify-between animate-in slide-in-from-left">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-950 text-white flex items-center justify-center font-bold text-base">
                    {(selectedRecord.member?.name || 'م').slice(0, 2)}
                  </div>
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
                      {new Date(selectedRecord.checkInAt).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">وقت تسجيل الخروج:</span>
                    <span className="font-bold text-zinc-900">
                      {selectedRecord.checkOutAt
                        ? new Date(selectedRecord.checkOutAt).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
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
                      className="flex items-center justify-center gap-2 p-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl font-bold transition"
                    >
                      <Phone className="w-4 h-4" />
                      <span>اتصال</span>
                    </a>
                    <a
                      href={`https://wa.me/2${selectedRecord.member.phone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition"
                    >
                      <MessageCircle className="w-4 h-4" />
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
        </div>
      )}

      {/* Quick Check-in Modal */}
      {checkInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 text-right animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950">تسجيل حضور فوري للمتدرب</h3>
                  <div className="text-xs text-zinc-500">ابحث باسم المتدرب أو الكود أو الهاتف</div>
                </div>
              </div>
              <button
                onClick={() => setCheckInModalOpen(false)}
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
                  value={memberSearchQuery}
                  onChange={(e) => {
                    setMemberSearchQuery(e.target.value)
                    if (selectedMember) setSelectedMember(null)
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
              {memberSearchResults.length > 0 && !selectedMember && (
                <div className="border border-zinc-200 rounded-xl bg-white shadow-lg overflow-hidden divide-y divide-zinc-100 max-h-48 overflow-y-auto">
                  {memberSearchResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMember(m)
                        setMemberSearchQuery(`${m.name} (${m.memberCode})`)
                        setMemberSearchResults([])
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

              {selectedMember && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>تم تحديد المتدرب: {selectedMember.name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCheckInModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!selectedMember || isSubmittingCheckIn}
                onClick={handleConfirmCheckIn}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#F5D86B] text-zinc-950 hover:bg-[#ECCB50] disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingCheckIn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>تأكيد تسجيل الحضور</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TraineeAttendancePage
