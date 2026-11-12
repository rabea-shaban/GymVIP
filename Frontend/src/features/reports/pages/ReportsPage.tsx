import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Users,
  Award,
  CalendarCheck,
  CreditCard,
  ChevronLeft,
} from 'lucide-react'
import { reportsApi } from '../services/reportsApi'
import { useAuth } from '@/features/auth/context/AuthContext'

export type ReportTab = 'summary' | 'members' | 'subscriptions' | 'attendance' | 'payments'
export type PresetRange = 'today' | '7days' | 'this_month' | 'last_month' | 'custom'

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canViewFinancials = user?.role === 'OWNER' || user?.role === 'MANAGER'

  const [activeTab, setActiveTab] = useState<ReportTab>('summary')
  const [preset, setPreset] = useState<PresetRange>('this_month')

  // Date calculation helper
  const getPresetDates = (range: PresetRange): { from: string; to: string } => {
    const today = new Date()
    const toStr = today.toISOString().split('T')[0]

    if (range === 'today') {
      return { from: toStr, to: toStr }
    }
    if (range === '7days') {
      const d = new Date(today)
      d.setDate(d.getDate() - 6)
      return { from: d.toISOString().split('T')[0], to: toStr }
    }
    if (range === 'last_month') {
      const startOfLast = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const endOfLast = new Date(today.getFullYear(), today.getMonth(), 0)
      return {
        from: startOfLast.toISOString().split('T')[0],
        to: endOfLast.toISOString().split('T')[0],
      }
    }
    // this_month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: startOfMonth.toISOString().split('T')[0], to: toStr }
  }

  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(getPresetDates('this_month'))

  const handlePresetChange = (newPreset: PresetRange) => {
    setPreset(newPreset)
    if (newPreset !== 'custom') {
      setDateRange(getPresetDates(newPreset))
    }
  }

  // 1. Reports Summary Query
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['reports', 'summary', dateRange],
    queryFn: () => reportsApi.getSummary(dateRange),
    enabled: activeTab === 'summary',
  })

  // 2. Members Report Query
  const { data: membersData, isLoading: isMembersLoading } = useQuery({
    queryKey: ['reports', 'members', dateRange],
    queryFn: () => reportsApi.getMembers(dateRange),
    enabled: activeTab === 'members',
  })

  // 3. Subscriptions Report Query
  const { data: subscriptionsData, isLoading: isSubsLoading } = useQuery({
    queryKey: ['reports', 'subscriptions', dateRange],
    queryFn: () => reportsApi.getSubscriptions(dateRange),
    enabled: activeTab === 'subscriptions',
  })

  // 4. Attendance Report Query
  const { data: attendanceData, isLoading: isAttLoading } = useQuery({
    queryKey: ['reports', 'attendance', dateRange],
    queryFn: () => reportsApi.getAttendance(dateRange),
    enabled: activeTab === 'attendance',
  })

  // 5. Payments Report Query
  const { data: paymentsData, isLoading: isPaymentsLoading } = useQuery({
    queryKey: ['reports', 'payments', dateRange],
    queryFn: () => reportsApi.getPayments(dateRange),
    enabled: activeTab === 'payments' && canViewFinancials,
  })

  const isLoading =
    (activeTab === 'summary' && isSummaryLoading) ||
    (activeTab === 'members' && isMembersLoading) ||
    (activeTab === 'subscriptions' && isSubsLoading) ||
    (activeTab === 'attendance' && isAttLoading) ||
    (activeTab === 'payments' && isPaymentsLoading)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-cairo">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1 font-medium">
            <span
              onClick={() => navigate('/app/dashboard')}
              className="hover:text-zinc-800 cursor-pointer"
            >
              لوحة التحكم
            </span>
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-900 font-bold">التقارير والإحصائيات</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
              التقارير التشغيلية والمالية
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            إحصائيات مفصلة ورسوم بيانية حول المشتركين والاشتراكات والحضور والتحصيلات
          </p>
        </div>
      </div>

      {/* 2. Filters & Date Range Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap bg-zinc-100 p-1.5 rounded-xl self-start">
            <button
              onClick={() => handlePresetChange('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                preset === 'today'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => handlePresetChange('7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                preset === '7days'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              onClick={() => handlePresetChange('this_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                preset === 'this_month'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => handlePresetChange('last_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                preset === 'last_month'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              الشهر الماضي
            </button>
            <button
              onClick={() => setPreset('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                preset === 'custom'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              مخصص
            </button>
          </div>

          {/* Date Picker Inputs */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-500">من:</span>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => {
                  setPreset('custom')
                  setDateRange((prev) => ({ ...prev, from: e.target.value }))
                }}
                className="text-xs font-bold font-mono px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gym-gold/40"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-500">إلى:</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => {
                  setPreset('custom')
                  setDateRange((prev) => ({ ...prev, to: e.target.value }))
                }}
                className="text-xs font-bold font-mono px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gym-gold/40"
              />
            </div>
          </div>
        </div>

        {/* Category Navigation Tabs */}
        <div className="flex items-center gap-2 border-t border-zinc-100 pt-3 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'summary'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-gym-gold" />
            <span>الملخص الشامل</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'members'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Users className="w-4 h-4 text-blue-500" />
            <span>تقرير المشتركين</span>
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'subscriptions'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>تقرير الاشتراكات</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'attendance'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-emerald-500" />
            <span>تقرير الحضور</span>
          </button>

          {canViewFinancials && (
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'payments'
                  ? 'bg-zinc-950 text-white shadow-2xs'
                  : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <CreditCard className="w-4 h-4 text-gym-gold" />
              <span>تقرير التحصيلات المالية</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Report Content Section */}
      {isLoading ? (
        <div className="p-16 text-center space-y-3 bg-white rounded-2xl border border-zinc-200">
          <div className="w-8 h-8 border-3 border-gym-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 font-bold">جاري تجميع بيانات التقرير...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: SUMMARY */}
          {activeTab === 'summary' && summaryData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs">
                  <span className="text-xs font-bold text-zinc-500">مشتركين جدد بالفترة</span>
                  <div className="text-2xl sm:text-3xl font-black text-zinc-950 font-mono mt-1">
                    {summaryData.members.totalCreated}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-2">
                    إجمالي المشتركين النشطين: {summaryData.members.active}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs">
                  <span className="text-xs font-bold text-zinc-500">اشتراكات مفعلة بالفترة</span>
                  <div className="text-2xl sm:text-3xl font-black text-zinc-950 font-mono mt-1">
                    {summaryData.subscriptions.totalCreated}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-2">
                    اشتراكات سارية الآن: {summaryData.subscriptions.active}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs">
                  <span className="text-xs font-bold text-zinc-500">حركات الحضور بالفترة</span>
                  <div className="text-2xl sm:text-3xl font-black text-zinc-950 font-mono mt-1">
                    {summaryData.attendance.totalCheckIns}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-2">
                    أعضاء مميزين حاضرين: {summaryData.attendance.distinctMembers}
                  </div>
                </div>

                {canViewFinancials && summaryData.payments && (
                  <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs">
                    <span className="text-xs font-bold text-zinc-500">التحصيلات بالفترة</span>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono mt-1">
                      {summaryData.payments.totalCollected} <span className="text-xs">ج.م</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-2">
                      متبقي مستحق: {summaryData.payments.outstandingAmount} ج.م
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MEMBERS */}
          {activeTab === 'members' && membersData && (
            <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-zinc-950">تفاصيل تسجيل المشتركين</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    إجمالي المشتركين الجدد خلال الفترة: {membersData.totalCreated}
                  </p>
                </div>
              </div>

              {membersData.breakdown.length === 0 ? (
                <div className="p-8 text-center bg-zinc-50 rounded-xl text-xs text-zinc-500 font-medium">
                  لا توجد تسجيلات أعضاء جديدة في الفترة المحددة
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-zinc-50 text-zinc-600 font-bold border-b border-zinc-200">
                      <tr>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">عدد المشتركين الجدد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {membersData.breakdown.map((row) => (
                        <tr key={row.date} className="hover:bg-zinc-50/70">
                          <td className="p-3 font-mono font-bold text-zinc-900">{row.date}</td>
                          <td className="p-3 font-mono font-bold text-blue-700">+{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUBSCRIPTIONS */}
          {activeTab === 'subscriptions' && subscriptionsData && (
            <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-zinc-950">تفاصيل الاشتراكات والتجديدات</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    الجديدة: {subscriptionsData.totalCreated} | التجديدات: {subscriptionsData.renewalsCount}
                  </p>
                </div>
              </div>

              {subscriptionsData.breakdown.length === 0 ? (
                <div className="p-8 text-center bg-zinc-50 rounded-xl text-xs text-zinc-500 font-medium">
                  لا توجد اشتراكات تم إنشاؤها خلال الفترة المحددة
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-zinc-50 text-zinc-600 font-bold border-b border-zinc-200">
                      <tr>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">عدد الاشتراكات المنشأة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {subscriptionsData.breakdown.map((row) => (
                        <tr key={row.date} className="hover:bg-zinc-50/70">
                          <td className="p-3 font-mono font-bold text-zinc-900">{row.date}</td>
                          <td className="p-3 font-mono font-bold text-amber-700">+{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ATTENDANCE */}
          {activeTab === 'attendance' && attendanceData && (
            <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-zinc-950">تفاصيل الحضور اليومي</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    إجمالي الدخول: {attendanceData.totalCheckIns} | متوسط يومي: {attendanceData.averageDaily}/يوم
                  </p>
                </div>
              </div>

              {attendanceData.dailyBreakdown.length === 0 ? (
                <div className="p-8 text-center bg-zinc-50 rounded-xl text-xs text-zinc-500 font-medium">
                  لا توجد حركات حضور مسجلة خلال الفترة المحددة
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-zinc-50 text-zinc-600 font-bold border-b border-zinc-200">
                      <tr>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">إجمالي حركات الدخول</th>
                        <th className="p-3">عدد الأعضاء المميزين</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {attendanceData.dailyBreakdown.map((row) => (
                        <tr key={row.date} className="hover:bg-zinc-50/70">
                          <td className="p-3 font-mono font-bold text-zinc-900">{row.date}</td>
                          <td className="p-3 font-mono font-bold text-zinc-950">{row.checkIns}</td>
                          <td className="p-3 font-mono font-bold text-emerald-700">{row.distinctMembers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PAYMENTS (Financial) */}
          {activeTab === 'payments' && canViewFinancials && paymentsData && (
            <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-zinc-100">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-800">إجمالي المحصل</span>
                  <div className="text-2xl font-black text-emerald-950 font-mono mt-1">
                    {paymentsData.totalCollected} ج.م
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    عدد الحركات: {paymentsData.transactionCount}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80">
                  <span className="text-xs font-bold text-zinc-600">نقدي (كاش)</span>
                  <div className="text-2xl font-black text-zinc-950 font-mono mt-1">
                    {paymentsData.byMethod.cash} ج.م
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80">
                  <span className="text-xs font-bold text-amber-800">محفظة إلكترونية</span>
                  <div className="text-2xl font-black text-amber-950 font-mono mt-1">
                    {paymentsData.byMethod.wallet} ج.م
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-black text-zinc-900 mb-3">حركات التحصيل اليومية</h4>
                {paymentsData.dailyBreakdown.length === 0 ? (
                  <div className="p-8 text-center bg-zinc-50 rounded-xl text-xs text-zinc-500 font-medium">
                    لا توجد متحصلات مالية مسجلة خلال الفترة المحددة
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-zinc-50 text-zinc-600 font-bold border-b border-zinc-200">
                        <tr>
                          <th className="p-3">التاريخ</th>
                          <th className="p-3">المبلغ المحصل</th>
                          <th className="p-3">عدد الإيصالات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {paymentsData.dailyBreakdown.map((row) => (
                          <tr key={row.date} className="hover:bg-zinc-50/70">
                            <td className="p-3 font-mono font-bold text-zinc-900">{row.date}</td>
                            <td className="p-3 font-mono font-bold text-emerald-700">
                              {row.amount} ج.م
                            </td>
                            <td className="p-3 font-mono font-bold text-zinc-600">{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ReportsPage
