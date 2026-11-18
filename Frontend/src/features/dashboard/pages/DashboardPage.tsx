import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  Award,
  CalendarCheck,
  CreditCard,
  Clock,
  TrendingUp,
  UserCheck,
  ChevronLeft,
  AlertTriangle,
  RotateCcw,
  UserPlus,
  ShieldCheck,
  ArrowUpRight,
  Activity,
} from 'lucide-react'
import { dashboardApi } from '../services/dashboardApi'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useRealtimeSync } from '@/services/socket'
import { Avatar } from '@/components/ui/Avatar'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, gym } = useAuth()
  const [hoveredAttendanceIdx, setHoveredAttendanceIdx] = useState<number | null>(null)
  const [hoveredMonthlyIdx, setHoveredMonthlyIdx] = useState<number | null>(null)

  React.useEffect(() => {
    if (user?.role === 'TRAINER') {
      navigate('/app/trainer/dashboard', { replace: true })
    }
  }, [user, navigate])

  const {
    data: overview,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: dashboardApi.getOverview,
    refetchInterval: 10000, // 10 seconds live auto-refresh
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  // Instant Real-Time Sync via WebSocket
  useRealtimeSync(['dashboard', 'overview'], () => {
    refetch()
  })

  const canViewFinancials = user?.role === 'OWNER' || user?.role === 'MANAGER'

  const formatCurrency = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return '0'
    const num = typeof val === 'string' ? parseFloat(val) : val
    if (isNaN(num)) return '0'
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  const formatRelativeArabicTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))
      const diffMin = Math.floor(diffSec / 60)
      const diffHour = Math.floor(diffMin / 60)
      const diffDay = Math.floor(diffHour / 24)

      if (diffSec < 60) return 'الآن'
      if (diffMin < 60) return `منذ ${diffMin} دقيقة`
      if (diffHour < 24) return `منذ ${diffHour} ساعة`
      if (diffDay === 1) return 'أمس'
      if (diffDay < 7) return `منذ ${diffDay} أيام`
      return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4 font-cairo">
        <div className="w-12 h-12 border-3 border-gym-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-zinc-600">جاري مزامنة مؤشرات لوحة التحكم المباشرة...</p>
      </div>
    )
  }

  if (isError || !overview) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto font-cairo">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-black text-zinc-900">تعذر تحميل بيانات لوحة التحكم</h3>
        <p className="text-xs text-zinc-500">
          حدث خطأ أثناء استرجاع المؤشرات التشغيلية من الخادم. يرجى إعادة المحاولة.
        </p>
        <button
          onClick={() => refetch()}
          className="px-5 py-2.5 bg-zinc-950 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-xs"
        >
          إعادة المحاولة
        </button>
      </div>
    )
  }

  const {
    members,
    subscriptions,
    attendance,
    payments,
    trainers,
    charts,
    recentActivity,
    upcomingExpirations,
  } = overview

  // Chart scaling
  const maxAttendance = Math.max(1, ...charts.dailyAttendance.map((d) => d.count))
  const maxNewMembers = Math.max(1, ...charts.monthlyNewMembers.map((m) => m.count))
  const maxPayments =
    payments && charts.monthlyPayments
      ? Math.max(1, ...charts.monthlyPayments.map((p) => p.amount))
      : 1

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-cairo">
      {/* 1. Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1 font-medium">
            <span>لوحة التحكم</span>
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-900 font-bold">{gym?.name || 'نظرة عامة على النادي'}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
              لوحة التحكم التشغيلية
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isFetching ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'
                }`}
              />
              <span>{isFetching ? 'جاري التحديث...' : 'بيانات حية'}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            متابعة دقيقة وفورية لحركة الأعضاء والاشتراكات والحضور والتحصيلات في{' '}
            <span className="text-zinc-800 font-bold">{gym?.name || 'النادي الرياضي'}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
            title="تحديث البيانات لحظياً"
          >
            <RotateCcw
              className={`w-4 h-4 text-zinc-600 ${isFetching ? 'animate-spin text-gym-gold' : ''}`}
            />
            <span className="hidden md:inline">تحديث فوري</span>
          </button>

          <button
            onClick={() => navigate('/app/members/new')}
            className="px-4 py-2.5 bg-gym-gold hover:bg-[#E5C158] text-amber-950 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>تسجيل مشترك</span>
          </button>

          <button
            onClick={() => navigate('/app/attendance')}
            className="px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shadow-xs"
          >
            <CalendarCheck className="w-4 h-4 text-gym-gold" />
            <span>تسجيل حضور</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Members */}
        <div
          onClick={() => navigate('/app/members')}
          className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-500">إجمالي المشتركين</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-zinc-950 font-mono">
              {members.total}
            </span>
            <span className="text-xs text-zinc-400 font-bold">عضو مسجل</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 font-medium">
            <span className="text-emerald-700 font-bold">نشط: {members.active}</span>
            <span className="text-zinc-500 font-medium">جديد هذا الشهر: +{members.newThisMonth}</span>
          </div>
        </div>

        {/* Card 2: Subscriptions */}
        <div
          onClick={() => navigate('/app/subscriptions')}
          className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-500">الاشتراكات السارية</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-zinc-950 font-mono">
              {subscriptions.active}
            </span>
            <span className="text-xs text-zinc-400 font-bold">اشتراك نشط</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 font-medium">
            <span className="text-amber-700 font-bold">قريب الانتهاء: {subscriptions.expiringSoon}</span>
            <span className="text-blue-600 font-bold">مجمد: {subscriptions.frozen}</span>
          </div>
        </div>

        {/* Card 3: Attendance Today */}
        <div
          onClick={() => navigate('/app/attendance')}
          className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-500">الحضور اليوم</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-zinc-950 font-mono">
              {attendance.presentToday}
            </span>
            <span className="text-xs text-zinc-400 font-bold">متواجد بالصالة الآن</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 font-medium">
            <span className="text-zinc-700 font-bold">دخول اليوم: {attendance.checkInsToday}</span>
            <span className="text-zinc-500">متوسط أسبوعي: {attendance.averageDailyAttendance}/يوم</span>
          </div>
        </div>

        {/* Card 4: Payments (Financial) or Trainers */}
        {canViewFinancials && payments ? (
          <div
            onClick={() => navigate('/app/payments')}
            className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-500">تحصيلات الشهر</span>
              <div className="w-10 h-10 rounded-xl bg-[#FFF8E7] text-gym-gold flex items-center justify-center border border-amber-200 group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
                {formatCurrency(payments.collectedThisMonth)}
              </span>
              <span className="text-xs text-zinc-500 font-bold">ج.م</span>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 font-medium">
              <span>اليوم: {formatCurrency(payments.collectedToday)} ج.م</span>
              <span className="text-rose-600 font-bold">متبقي: {formatCurrency(payments.outstandingAmount)} ج.م</span>
            </div>
          </div>
        ) : (
          <div
            onClick={() => navigate('/app/trainers')}
            className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-500">المدربين</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-zinc-950 font-mono">
                {trainers.total}
              </span>
              <span className="text-xs text-zinc-400 font-bold">كابتن معتمد</span>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 font-medium">
              <span className="text-amber-700 font-bold">نشط بالخدمة: {trainers.active}</span>
              <span>طاقم التدريب</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Operational Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Daily Attendance (Last 7 Days) */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-zinc-950">حضور الأعضاء (آخر 7 أيام)</h3>
              <p className="text-xs text-zinc-400 mt-0.5">عدد المشتركين الفعليين يومياً بالصالة</p>
            </div>
            <div className="p-2 rounded-xl bg-zinc-50 text-zinc-500 border border-zinc-200/80">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="pt-4 h-52 flex items-end justify-between gap-2 border-b border-zinc-100 pb-2">
            {charts.dailyAttendance.map((item, idx) => {
              const heightPercent = Math.max(10, Math.round((item.count / maxAttendance) * 100))
              const isToday = idx === charts.dailyAttendance.length - 1
              const isHovered = hoveredAttendanceIdx === idx

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredAttendanceIdx(idx)}
                  onMouseLeave={() => setHoveredAttendanceIdx(null)}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative cursor-pointer"
                >
                  {/* Floating Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-10 z-20 px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-[11px] font-bold shadow-lg pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                      <span>{item.dayLabel} ({item.date}): {item.count} حضور</span>
                    </div>
                  )}

                  <div
                    className={`text-[10px] font-mono font-bold transition-colors ${
                      isToday ? 'text-amber-800' : 'text-zinc-500 group-hover:text-zinc-900'
                    }`}
                  >
                    {item.count}
                  </div>

                  <div
                    className={`w-full max-w-[36px] rounded-t-lg transition-all relative overflow-hidden ${
                      isToday
                        ? 'bg-gym-gold shadow-xs'
                        : 'bg-zinc-100 group-hover:bg-amber-200'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div
                      className={`w-full h-full transition-colors ${
                        isToday
                          ? 'bg-gradient-to-t from-amber-500/40 to-amber-300/20'
                          : 'bg-amber-400/20 group-hover:bg-amber-500/30'
                      }`}
                    />
                  </div>

                  <div className="flex flex-col items-center">
                    <span
                      className={`text-[11px] font-bold transition-colors ${
                        isToday ? 'text-amber-950 font-black' : 'text-zinc-600 group-hover:text-zinc-900'
                      }`}
                    >
                      {item.dayLabel}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 px-1 rounded mt-0.5">
                        اليوم
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Chart B: Monthly Payments (If authorized) OR New Members */}
        {canViewFinancials && charts.monthlyPayments ? (
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-zinc-950">التحصيلات الشهرية (آخر 6 أشهر)</h3>
                <p className="text-xs text-zinc-400 mt-0.5">إجمالي الإيرادات المحصلة بالجنيه</p>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>

            <div className="pt-4 h-52 flex items-end justify-between gap-2 border-b border-zinc-100 pb-2">
              {charts.monthlyPayments.map((item, idx) => {
                const heightPercent = Math.max(10, Math.round((item.amount / maxPayments) * 100))
                const isCurrentMonth = idx === (charts.monthlyPayments?.length ?? 0) - 1
                const isHovered = hoveredMonthlyIdx === idx
                const monthName = item.monthLabel.split(' ')[0]

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredMonthlyIdx(idx)}
                    onMouseLeave={() => setHoveredMonthlyIdx(null)}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative cursor-pointer"
                  >
                    {/* Floating Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-10 z-20 px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-[11px] font-bold shadow-lg pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                        <span>{item.monthLabel}: {formatCurrency(item.amount)} ج.م</span>
                      </div>
                    )}

                    <div
                      className={`text-[10px] font-mono font-bold transition-colors ${
                        isCurrentMonth ? 'text-emerald-800' : 'text-emerald-700 group-hover:text-emerald-900'
                      }`}
                    >
                      {item.amount >= 1000
                        ? `${(item.amount / 1000).toFixed(1)}k`
                        : item.amount > 0
                        ? item.amount
                        : '0'}
                    </div>

                    <div
                      className={`w-full max-w-[36px] rounded-t-lg transition-all ${
                        isCurrentMonth
                          ? 'bg-emerald-500 shadow-xs'
                          : 'bg-emerald-100 group-hover:bg-emerald-300'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />

                    <div className="flex flex-col items-center">
                      <span
                        className={`text-[11px] font-bold transition-colors ${
                          isCurrentMonth
                            ? 'text-emerald-950 font-black'
                            : 'text-zinc-600 group-hover:text-zinc-900'
                        }`}
                      >
                        {monthName}
                      </span>
                      {isCurrentMonth && (
                        <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1 rounded mt-0.5">
                          الحالي
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-zinc-950">الأعضاء الجدد (آخر 6 أشهر)</h3>
                <p className="text-xs text-zinc-400 mt-0.5">معدل انضمام المشتركين شهرياً</p>
              </div>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div className="pt-4 h-52 flex items-end justify-between gap-2 border-b border-zinc-100 pb-2">
              {charts.monthlyNewMembers.map((item, idx) => {
                const heightPercent = Math.max(10, Math.round((item.count / maxNewMembers) * 100))
                const isCurrentMonth = idx === charts.monthlyNewMembers.length - 1
                const monthName = item.monthLabel.split(' ')[0]

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
                  >
                    <div className="text-[10px] font-mono font-bold text-blue-700 group-hover:text-blue-900 transition-colors">
                      {item.count}
                    </div>
                    <div
                      className={`w-full max-w-[36px] rounded-t-lg transition-all ${
                        isCurrentMonth ? 'bg-blue-600' : 'bg-blue-100 group-hover:bg-blue-300'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-bold text-zinc-600 group-hover:text-zinc-900 transition-colors">
                        {monthName}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Grid: Upcoming Expirations & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Right (2 Cols): Upcoming Expirations */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-black text-zinc-950">
                اشتراكات على وشك الانتهاء (خلال 7 أيام)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                تواصل مع الأعضاء للتجديد الاستباقي وتفادي انقطاع الخدمة
              </p>
            </div>
            <button
              onClick={() => navigate('/app/subscriptions')}
              className="text-xs font-bold text-zinc-600 hover:text-zinc-950 flex items-center gap-1 transition-colors"
            >
              <span>عرض كافة الاشتراكات</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingExpirations.length === 0 ? (
            <div className="p-8 text-center bg-zinc-50/80 rounded-2xl border border-zinc-100 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-black text-zinc-800">لا توجد اشتراكات قريبة من الانتهاء</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                جميع اشتراكات الأعضاء النشطين سارية لفترة كافية ومستقرة، ولا تتطلب أي إجراء تجديد حالياً.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {upcomingExpirations.map((item) => (
                <div
                  key={item.subscriptionId}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50/80 transition-colors rounded-xl px-2.5"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={item.memberAvatarUrl || undefined}
                      name={item.memberName}
                      size="sm"
                      className="border border-zinc-200 shrink-0"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          onClick={() => navigate(`/app/members/${item.memberId}`)}
                          className="text-xs font-black text-zinc-950 hover:text-blue-600 cursor-pointer transition-colors"
                        >
                          {item.memberName}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-100 text-zinc-600">
                          {item.memberCode}
                        </span>
                        {item.memberPhone && (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {item.memberPhone}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                        <span className="font-medium">{item.planName}</span>
                        <span>تاريخ الانتهاء: {item.endDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        item.daysRemaining <= 1
                          ? 'bg-rose-100 text-rose-700 font-bold'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.daysRemaining === 0
                        ? 'ينتهي اليوم'
                        : item.daysRemaining === 1
                        ? 'غداً'
                        : `باقي ${item.daysRemaining} أيام`}
                    </span>
                    <button
                      onClick={() => navigate(`/app/subscriptions/${item.subscriptionId}/renew`)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <RotateCcw className="w-3 h-3 text-gym-gold" />
                      <span>تجديد فوري</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Left (1 Col): Recent Activity */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-black text-zinc-950 flex items-center gap-2">
                <span>أحدث الأنشطة</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">سجل العمليات التشغيلية الحية</p>
            </div>
            <Activity className="w-4 h-4 text-zinc-400" />
          </div>

          {recentActivity.length === 0 ? (
            <div className="p-8 text-center bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
              <Clock className="w-6 h-6 text-zinc-400 mx-auto" />
              <p className="text-xs text-zinc-500">لا توجد أنشطة مسجلة مؤخراً</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
              {recentActivity.map((act) => {
                const relativeTime = formatRelativeArabicTime(act.timestamp)

                const handleActivityClick = () => {
                  if (act.type === 'MEMBER' && act.entityId) {
                    navigate(`/app/members/${act.entityId}`)
                  } else if (act.type === 'SUBSCRIPTION' && act.entityId) {
                    navigate(`/app/subscriptions/${act.entityId}`)
                  } else if (act.type === 'PAYMENT') {
                    navigate('/app/payments')
                  } else if (act.type === 'ATTENDANCE') {
                    navigate('/app/attendance')
                  }
                }

                return (
                  <div
                    key={act.id}
                    onClick={handleActivityClick}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all cursor-pointer group"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        act.type === 'MEMBER'
                          ? 'bg-blue-50 text-blue-600'
                          : act.type === 'SUBSCRIPTION'
                          ? 'bg-amber-50 text-amber-600'
                          : act.type === 'PAYMENT'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {act.type === 'MEMBER' && <Users className="w-4 h-4" />}
                      {act.type === 'SUBSCRIPTION' && <Award className="w-4 h-4" />}
                      {act.type === 'PAYMENT' && <CreditCard className="w-4 h-4" />}
                      {act.type === 'ATTENDANCE' && <CalendarCheck className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-zinc-900 truncate group-hover:text-amber-950 transition-colors">
                          {act.title}
                        </p>
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {relativeTime}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate">{act.description}</p>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-700 transition-colors shrink-0 self-center" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
