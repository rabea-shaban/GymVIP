import React from 'react'
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
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import { dashboardApi } from '../services/dashboardApi'
import { useAuth } from '@/features/auth/context/AuthContext'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

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
  } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: dashboardApi.getOverview,
    refetchInterval: 60000,
  })

  const canViewFinancials = user?.role === 'OWNER' || user?.role === 'MANAGER'

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4 font-cairo">
        <div className="w-10 h-10 border-3 border-gym-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-zinc-600">جاري تحميل لوحة التحكم...</p>
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

  const { members, subscriptions, attendance, payments, trainers, charts, recentActivity, upcomingExpirations } =
    overview

  // Find maximum values for chart scales
  const maxAttendance = Math.max(1, ...charts.dailyAttendance.map((d) => d.count))
  const maxNewMembers = Math.max(1, ...charts.monthlyNewMembers.map((m) => m.count))
  const maxPayments = payments && charts.monthlyPayments
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
            <span className="text-zinc-900 font-bold">نظرة عامة على النادي</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
              لوحة التحكم التشغيلية
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>بيانات حية</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            متابعة دقيقة وفورية لحركة الأعضاء والاشتراكات والحضور والتحصيلات المالية
          </p>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            onClick={() => navigate('/app/members/new')}
            className="px-4 py-2.5 bg-gym-gold hover:bg-[#E5C158] text-amber-950 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
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
          className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer group"
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
            <span className="text-zinc-400">جديد هذا الشهر: +{members.newThisMonth}</span>
          </div>
        </div>

        {/* Card 2: Subscriptions */}
        <div
          onClick={() => navigate('/app/subscriptions')}
          className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer group"
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
          className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer group"
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
            <span>دخول اليوم: {attendance.checkInsToday}</span>
            <span>متوسط أسبوعي: {attendance.averageDailyAttendance}/يوم</span>
          </div>
        </div>

        {/* Card 4: Payments (Financial) */}
        {canViewFinancials && payments ? (
          <div
            onClick={() => navigate('/app/payments')}
            className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-500">تحصيلات الشهر</span>
              <div className="w-10 h-10 rounded-xl bg-[#FFF8E7] text-gym-gold flex items-center justify-center border border-amber-200 group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
                {payments.collectedThisMonth}
              </span>
              <span className="text-xs text-zinc-500 font-bold">ج.م</span>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 font-medium">
              <span>اليوم: {payments.collectedToday} ج.م</span>
              <span className="text-rose-600 font-bold">متبقي: {payments.outstandingAmount} ج.م</span>
            </div>
          </div>
        ) : (
          <div
            onClick={() => navigate('/app/trainers')}
            className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-500">المدربين</span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform">
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
              <span className="text-purple-700 font-bold">نشط بالخدمة: {trainers.active}</span>
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
              <p className="text-xs text-zinc-400 mt-0.5">عدد المشتركين الفعليين يومياً</p>
            </div>
            <div className="p-2 rounded-xl bg-zinc-50 text-zinc-500 border border-zinc-200/80">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          {/* SVG/Bar Chart */}
          <div className="pt-4 h-48 flex items-end justify-between gap-2 border-b border-zinc-100 pb-2">
            {charts.dailyAttendance.map((item, idx) => {
              const heightPercent = Math.max(8, Math.round((item.count / maxAttendance) * 100))
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] font-mono font-bold text-zinc-500 group-hover:text-zinc-900 transition-colors">
                    {item.count}
                  </div>
                  <div className="w-full max-w-[32px] bg-zinc-100 group-hover:bg-gym-gold rounded-t-lg transition-all relative overflow-hidden" style={{ height: `${heightPercent}%` }}>
                    <div className="w-full h-full bg-amber-400/30 group-hover:bg-amber-500/30 transition-colors" />
                  </div>
                  <span className="text-[11px] font-bold text-zinc-500 group-hover:text-zinc-900 transition-colors">
                    {item.dayLabel}
                  </span>
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

            <div className="pt-4 h-48 flex items-end justify-between gap-2 border-b border-zinc-100 pb-2">
              {charts.monthlyPayments.map((item, idx) => {
                const heightPercent = Math.max(8, Math.round((item.amount / maxPayments) * 100))
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] font-mono font-bold text-emerald-700 group-hover:text-emerald-900 transition-colors">
                      {item.amount >= 1000 ? `${(item.amount / 1000).toFixed(1)}k` : item.amount}
                    </div>
                    <div className="w-full max-w-[32px] bg-emerald-100 group-hover:bg-emerald-500 rounded-t-lg transition-all" style={{ height: `${heightPercent}%` }} />
                    <span className="text-[10px] font-bold text-zinc-500 group-hover:text-zinc-900 transition-colors text-center line-clamp-1">
                      {item.monthLabel.split(' ')[0]}
                    </span>
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

            <div className="pt-4 h-48 flex items-end justify-between gap-2 border-b border-zinc-100 pb-2">
              {charts.monthlyNewMembers.map((item, idx) => {
                const heightPercent = Math.max(8, Math.round((item.count / maxNewMembers) * 100))
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] font-mono font-bold text-blue-700 group-hover:text-blue-900 transition-colors">
                      {item.count}
                    </div>
                    <div className="w-full max-w-[32px] bg-blue-100 group-hover:bg-blue-500 rounded-t-lg transition-all" style={{ height: `${heightPercent}%` }} />
                    <span className="text-[10px] font-bold text-zinc-500 group-hover:text-zinc-900 transition-colors text-center line-clamp-1">
                      {item.monthLabel.split(' ')[0]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Grid: Upcoming Expirations & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Upcoming Expirations */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
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
              className="text-xs font-bold text-zinc-600 hover:text-zinc-950 flex items-center gap-1"
            >
              <span>عرض الكل</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingExpirations.length === 0 ? (
            <div className="p-8 text-center bg-zinc-50 rounded-xl border border-zinc-100 space-y-1.5">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-zinc-800">لا توجد اشتراكات قريبة من الانتهاء</p>
              <p className="text-[11px] text-zinc-400">جميع اشتراكات الأعضاء النشطين سارية لفترة كافية</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {upcomingExpirations.map((item) => (
                <div
                  key={item.subscriptionId}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50/60 transition-colors rounded-xl px-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-zinc-950">{item.memberName}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-100 text-zinc-600">
                        {item.memberCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                      <span>{item.planName}</span>
                      <span>ينتهي: {item.endDate}</span>
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
                      <span>تجديد</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right (1 Col): Recent Activity */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-zinc-950">أحدث الأنشطة</h3>
              <p className="text-xs text-zinc-400 mt-0.5">سجل العمليات التشغيلية الحية</p>
            </div>
          </div>

          {recentActivity.length === 0 ? (
            <div className="p-8 text-center bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
              <Clock className="w-6 h-6 text-zinc-400 mx-auto" />
              <p className="text-xs text-zinc-500">لا توجد أنشطة مسجلة مؤخراً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((act) => {
                const timeStr = new Date(act.timestamp).toLocaleTimeString('ar-EG', {
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <div key={act.id} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-50 transition-colors">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        act.type === 'MEMBER'
                          ? 'bg-blue-50 text-blue-600'
                          : act.type === 'SUBSCRIPTION'
                          ? 'bg-amber-50 text-amber-600'
                          : act.type === 'PAYMENT'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {act.type === 'MEMBER' && <Users className="w-3.5 h-3.5" />}
                      {act.type === 'SUBSCRIPTION' && <Award className="w-3.5 h-3.5" />}
                      {act.type === 'PAYMENT' && <CreditCard className="w-3.5 h-3.5" />}
                      {act.type === 'ATTENDANCE' && <CalendarCheck className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-zinc-900 truncate">{act.title}</p>
                        <span className="text-[10px] text-zinc-400 font-mono">{timeStr}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate">{act.description}</p>
                    </div>
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
