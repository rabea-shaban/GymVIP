import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  ChevronLeft,
  ShieldCheck,
  Activity,
  X,
  Phone,
  MessageCircle,
  Maximize2,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/features/auth/context/AuthContext'
import { dashboardApi } from '@/features/dashboard/services/dashboardApi'
import { attendanceApi } from '@/features/attendance/services/attendanceApi'
import { membersApi } from '@/features/members/services/membersApi'
import type { DashboardOverviewData } from '@/features/dashboard/types/dashboard.types'
import type { AttendanceItem } from '@/features/attendance/types/attendance.types'
import type { MemberItem } from '@/features/members/types/member.types'
import { useRealtimeSync } from '@/services/socket'

export const TrainerDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Real Data States
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null)
  const [liveAttendees, setLiveAttendees] = useState<AttendanceItem[]>([])
  const [attendanceList, setAttendanceList] = useState<AttendanceItem[]>([])
  const [members, setMembers] = useState<MemberItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')

  // Quick View Drawer / Modal for Trainee
  const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null)

  // Load All Data
  const loadData = async () => {
    try {
      setErrorMessage(null)
      const [ovData, insideData, attData, memData] = await Promise.all([
        dashboardApi.getOverview().catch(() => null),
        attendanceApi.getCurrentlyInside().catch(() => []),
        attendanceApi.list({ limit: 10 }).catch(() => ({ attendance: [] })),
        membersApi.list({ limit: 50 }).catch(() => ({ members: [] })),
      ])

      if (ovData) setOverview(ovData)
      setLiveAttendees(insideData)
      setAttendanceList(attData.attendance || [])
      setMembers(memData.members || [])
    } catch (err: any) {
      setErrorMessage(err?.message || 'تعذر تحميل بيانات لوحة تحكم المدرب')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [])

  // Instant Real-Time WebSocket sync for Trainer Dashboard
  useRealtimeSync(undefined, () => {
    loadData()
  })

  // Filtered trainees for the bottom table
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members
    const q = searchQuery.toLowerCase()
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.memberCode.toLowerCase().includes(q) ||
        m.phone.includes(q)
    )
  }, [members, searchQuery])

  const currentDateFormatted = new Date().toLocaleDateString('ar-EG-u-nu-latn', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-cairo" dir="rtl">

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold">تعذر تحميل بيانات المتدربين</div>
              <div className="text-xs text-rose-700 mt-0.5">{errorMessage}</div>
            </div>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight flex items-center gap-2">
              <span>أهلاً بك، كابتن {user?.name || 'المدرب'}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#FAF0D3] text-[#7E6517] border border-[#ECD9A2]">
              مدرب معتمد
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium">
            متابعة حضور المتدربين والالتزام الميداني وتطور الحصص التدريبية
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold border border-zinc-200/80 shadow-sm">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <span>{currentDateFormatted}</span>
          </div>

          <button
            onClick={() => navigate('/app/members')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-[#F5D86B] hover:bg-[#ECCB50] text-zinc-950 shadow-sm transition active:scale-95"
          >
            <Users className="w-4 h-4 text-zinc-950" />
            <span>قائمة المتدربين</span>
          </button>
        </div>
      </div>

      {/* 4 Stat KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-zinc-200/70 rounded-2xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: My Trainees */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
                <Maximize2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-600">إجمالي المتدربين</span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-black text-zinc-950">
                {overview?.members?.total ?? members.length}
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                متدرب مسجل بالنادي
              </span>
            </div>
          </div>

          {/* Card 2: Today's Attendance */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-600">الحضور اليوم</span>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <span className="text-3xl font-black text-zinc-950">
                  {overview?.attendance?.checkInsToday ?? 0}
                </span>
                <span className="text-xs text-zinc-400 font-medium mr-1.5">تسجيل دخول</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                {liveAttendees.length} بالصالة الآن
              </span>
            </div>
          </div>

          {/* Card 3: Active Subscriptions */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-600">اشتراكات نشطة</span>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-3xl font-black text-zinc-950">
                {overview?.subscriptions?.active ?? 0}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>ساري حالياً</span>
              </span>
            </div>
          </div>

          {/* Card 4: Expiring Soon */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-600">تنتهي قريباً</span>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-3xl font-black text-zinc-950">
                {overview?.subscriptions?.expiringSoon ?? overview?.upcomingExpirations?.length ?? 0}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#FAF0D3] text-[#7E6517] border border-[#ECD9A2]">
                متابعة مطلوبة
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Middle Section: Today's Attendance Table (8 Cols) & Follow-up/Activity (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column in RTL (65% width): Today's Attendance Table */}
        <div className="lg:col-span-8 bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-gym-gold rounded-full"></div>
              <h2 className="text-base sm:text-lg font-black text-zinc-950">حضور الصالة اليوم</h2>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="flex items-center gap-1.5 text-zinc-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>بالصالة الآن: {liveAttendees.length}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
                <span>إجمالي الدخول: {overview?.attendance?.checkInsToday ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Today's Attendance Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-zinc-50/80 text-zinc-500 font-bold border-y border-zinc-100">
                  <th className="py-3 px-4">المتدرب</th>
                  <th className="py-3 px-3 text-center">وقت الحضور</th>
                  <th className="py-3 px-3 text-center">وقت الخروج</th>
                  <th className="py-3 px-3 text-center">الحالة</th>
                  <th className="py-3 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {attendanceList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-400 font-medium">
                      لا يوجد حضور مسجل اليوم حتى الآن
                    </td>
                  </tr>
                ) : (
                  attendanceList.map((att) => {
                    const initials = (att.member?.name || 'م').slice(0, 2)
                    const checkInTime = new Date(att.checkInAt).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    const checkOutTime = att.checkOutAt
                      ? new Date(att.checkOutAt).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'متواجد بالصالة'

                    const isInside = !att.checkOutAt

                    return (
                      <tr key={att.id} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-950 text-white flex items-center justify-center font-bold text-xs">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-900">
                                {att.member?.name || 'عضو'}
                              </div>
                              <div className="text-[11px] text-zinc-400 font-mono">
                                {att.member?.memberCode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center font-semibold text-zinc-700">
                          {checkInTime}
                        </td>
                        <td className="py-3.5 px-3 text-center font-semibold text-zinc-700">
                          {checkOutTime}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {isInside ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>حاضر الآن</span>
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                              غادر
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-left">
                          <button
                            onClick={() => {
                              if (att.member) {
                                navigate(`/app/members/${att.member.id}`)
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition"
                          >
                            عرض الملف
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
            <button
              onClick={() => navigate('/app/attendance')}
              className="font-bold text-zinc-900 hover:text-gym-gold transition flex items-center gap-1"
            >
              <span>عرض سجل الحضور الكامل</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>مزامنة مباشرة مع بوابة ونقاط تسجيل الحضور.</span>
            </div>
          </div>
        </div>

        {/* Right Column in RTL (35% width): Follow-up Box + Activity Feed */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: Trainees Needing Follow-up */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-zinc-950">اشتراكات بحاجة لمتابعة</h3>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-[#FAF0D3] text-[#7E6517]">
                {overview?.upcomingExpirations?.length ?? 0} متدرب
              </span>
            </div>

            {!overview?.upcomingExpirations || overview.upcomingExpirations.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-400">
                لا توجد تنبيهات متابعة لاشتراكات المتدربين حالياً
              </div>
            ) : (
              <div className="space-y-3">
                {overview.upcomingExpirations.slice(0, 4).map((item) => (
                  <div
                    key={item.subscriptionId}
                    className="p-3 bg-zinc-50 hover:bg-zinc-100/80 rounded-xl border border-zinc-200/70 transition flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-900">{item.memberName}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              item.daysRemaining <= 0
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.daysRemaining <= 0 ? 'منتهي' : `خلال ${item.daysRemaining} يوم`}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {item.planName} • {item.memberPhone}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/app/members/${item.memberId}`)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 shrink-0"
                    >
                      عرض الملف
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Live Activity Feed */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-zinc-700" />
                <h3 className="text-sm font-bold text-zinc-950">نشاط النادي اليوم</h3>
              </div>
              <span className="text-[11px] font-bold text-zinc-400">محدث لحظياً</span>
            </div>

            {!overview?.recentActivity || overview.recentActivity.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-400">
                لا توجد أنشطة مسجلة اليوم
              </div>
            ) : (
              <div className="space-y-3.5 text-xs relative pr-3 before:absolute before:right-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
                {overview.recentActivity.slice(0, 5).map((act) => {
                  const timeFormatted = new Date(act.timestamp).toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  return (
                    <div key={act.id} className="relative pr-3">
                      <span className="w-2 h-2 rounded-full bg-zinc-900 absolute -right-[3px] top-1.5"></span>
                      <div className="font-bold text-zinc-900">{act.title}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {timeFormatted} • {act.description}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: My Trainees Master Table */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        {/* Table Header with Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-zinc-950 rounded-full"></div>
              <h2 className="text-base sm:text-lg font-black text-zinc-950">دليل المتدربين</h2>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-700">
                {members.length} متدرب مسجل
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              استعراض وتتبع التطور الرياضي لمتدربي النادي
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-gym-gold/20 focus:border-gym-gold transition"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                <th className="py-3 px-3 text-center">الحالة</th>
                <th className="py-3 px-4 text-left">الإجراءات المتاحة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    لا يوجد متدربون يطابقون خيارات البحث
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const initials = m.name.slice(0, 2)
                  const subPlanName = m.currentSubscription?.planName || 'بدون اشتراك نشط'
                  return (
                    <tr key={m.id} className="hover:bg-zinc-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-950 text-white flex items-center justify-center font-bold text-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900">{m.name}</div>
                            <div className="text-[11px] text-zinc-400 font-mono">كود: {m.memberCode}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-zinc-600" dir="ltr">
                        {m.phone}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-zinc-800 bg-zinc-100 px-2.5 py-1 rounded-lg text-xs">
                          {subPlanName}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {m.isActive ? (
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
                            onClick={() => setSelectedMember(m)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition"
                          >
                            عرض سريع
                          </button>
                          <button
                            onClick={() => navigate(`/app/members/${m.id}`)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-900 hover:bg-black text-white transition"
                          >
                            الملف الكامل
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

        {/* Master Table Footer */}
        <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-400 font-medium">
            يتم استعراض {filteredMembers.length} من إجمالي {members.length} متدرباً
          </div>

          <button
            onClick={() => navigate('/app/members')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-zinc-950 text-white hover:bg-zinc-800 transition shadow-sm"
          >
            <span>عرض كل المتدربين ({members.length})</span>
            <ChevronLeft className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Trainee Quick Profile Modal */}
      {selectedMember && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 text-right animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-3">
                <Avatar
                  src={selectedMember.avatarUrl || undefined}
                  name={selectedMember.name}
                  size="md"
                  className="w-12 h-12 ring-2 ring-gym-gold/40 border border-zinc-200 shrink-0"
                />
                <div>
                  <h3 className="text-base font-bold text-zinc-950">{selectedMember.name}</h3>
                  <div className="text-xs text-zinc-400 font-mono">كود: {selectedMember.memberCode}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between p-2.5 bg-zinc-50 rounded-xl">
                <span className="text-zinc-500">نوع الباقة:</span>
                <span className="font-bold text-zinc-900">
                  {selectedMember.currentSubscription?.planName || 'لا يوجد اشتراك نشط'}
                </span>
              </div>
              <div className="flex justify-between p-2.5 bg-zinc-50 rounded-xl">
                <span className="text-zinc-500">تاريخ انتهاء الاشتراك:</span>
                <span className="font-bold text-zinc-900">
                  {selectedMember.currentSubscription?.endDate
                    ? new Date(selectedMember.currentSubscription.endDate).toLocaleDateString('ar-EG-u-nu-latn', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between p-2.5 bg-zinc-50 rounded-xl">
                <span className="text-zinc-500">رقم الهاتف:</span>
                <span className="font-bold text-zinc-900 font-mono" dir="ltr">
                  {selectedMember.phone}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <a
                href={`tel:${selectedMember.phone}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>اتصال</span>
              </a>
              <a
                href={`https://wa.me/2${selectedMember.phone}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>واتساب</span>
              </a>
              <button
                onClick={() => {
                  const id = selectedMember.id
                  setSelectedMember(null)
                  navigate(`/app/members/${id}`)
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-950 text-white hover:bg-zinc-800"
              >
                فتح الملف الشامل
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default TrainerDashboardPage
