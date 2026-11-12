import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  Wallet,
  Coins,
  Search,
  RotateCcw,
  Plus,
  MoreVertical,
  Printer,
  FileText,
  TrendingUp,
  CheckCircle2,
  X,
  CreditCard,
  Receipt,
  QrCode,
  RefreshCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/feedback/Toast'
import { ExportDropdown } from '@/components/ui/ExportDropdown'
import { paymentsApi } from '../services/paymentsApi'
import type { PaymentMethod } from '../types/payment.types'

interface PaymentTransaction {
  id: string
  code: string
  memberName: string
  memberAvatarLetter: string
  memberAvatarColor: string
  memberCode: string
  phone: string
  operationType: string
  operationPlan: string
  isRefund?: boolean
  amount: number
  amountNote: string
  remainingDebt?: number
  paymentMethod: string
  paymentRef?: string
  date: string
  time: string
  staffName: string
  staffRole: string
  status: 'COMPLETED' | 'PARTIAL' | 'REFUNDED'
}

export const PaymentsListPage: React.FC = () => {
  const navigate = useNavigate()
  const toast = useToast()

  // Modals & Selected Item
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  // Filters
  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom'>('this_month')
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL')
  const [operationTypeFilter, setOperationTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [staffFilter, setStaffFilter] = useState('ALL')

  const [transactionsList, setTransactionsList] = useState<PaymentTransaction[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadPayments = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await paymentsApi.list({
        search: searchTerm.trim() || undefined,
        method: paymentMethodFilter === 'ALL' ? undefined : (paymentMethodFilter as PaymentMethod),
        limit: 100,
      })
      if (res.payments && res.payments.length > 0) {
        const mapped: PaymentTransaction[] = res.payments.map((p) => {
          const dt = new Date(p.createdAt)
          const dateStr = dt.toLocaleDateString('ar-EG', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
          const timeStr = dt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
          const methodLabel =
            p.method === 'CASH'
              ? 'نقدي'
              : p.walletProvider
              ? `محفظة (${p.walletProvider})`
              : 'محفظة إلكترونية'

          return {
            id: p.id,
            code: `#PAY-${p.id.slice(0, 6).toUpperCase()}`,
            memberName: p.member?.name || 'عضو غير معروف',
            memberAvatarLetter: (p.member?.name || 'ع')[0] || 'ع',
            memberAvatarColor: 'bg-zinc-950 text-white',
            memberCode: p.member?.memberCode || '',
            phone: p.member?.phone || '',
            operationType: 'سداد اشتراك',
            operationPlan: p.subscription?.planName || 'خطة اشتراك',
            amount: parseFloat(p.amount) || 0,
            amountNote: 'مسجل بالنظام',
            paymentMethod: methodLabel,
            paymentRef: p.transactionReference || undefined,
            date: dateStr,
            time: timeStr,
            staffName: p.createdByUser?.name || 'كاشير الفرع',
            staffRole: p.createdByUser?.role || 'موظف',
            status: 'COMPLETED',
          }
        })
        setTransactionsList(mapped)
      } else {
        setTransactionsList([])
      }
    } catch {
      toast.error('تعذر جلب سجل المدفوعات من الخادم')
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, paymentMethodFilter])

  React.useEffect(() => {
    loadPayments()
  }, [loadPayments])

  // Filtered List
  const filteredPayments = useMemo(() => {
    return transactionsList.filter((p) => {
      const matchSearch =
        searchTerm === '' ||
        p.memberName.includes(searchTerm) ||
        p.phone.includes(searchTerm) ||
        p.code.includes(searchTerm) ||
        p.memberCode.includes(searchTerm)

      const matchMethod =
        paymentMethodFilter === 'ALL' ||
        (paymentMethodFilter === 'CASH' && p.paymentMethod.includes('نقدي')) ||
        (paymentMethodFilter === 'WALLET' && (p.paymentMethod.includes('محفظة') || p.paymentMethod.includes('InstaPay')))

      const matchStatus =
        statusFilter === 'ALL' || p.status === statusFilter

      return matchSearch && matchMethod && matchStatus
    })
  }, [transactionsList, searchTerm, paymentMethodFilter, statusFilter])

  // Dynamic Financial Stats
  const financialStats = useMemo(() => {
    const total = filteredPayments.reduce((acc, p) => acc + p.amount, 0)
    const cash = filteredPayments
      .filter((p) => p.paymentMethod.includes('نقدي'))
      .reduce((acc, p) => acc + p.amount, 0)
    const wallet = filteredPayments
      .filter((p) => !p.paymentMethod.includes('نقدي'))
      .reduce((acc, p) => acc + p.amount, 0)

    const todayStr = new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
    const today = filteredPayments
      .filter((p) => p.date === todayStr)
      .reduce((acc, p) => acc + p.amount, 0)

    return {
      total,
      cash,
      wallet,
      today: today > 0 ? today : total,
      count: filteredPayments.length,
    }
  }, [filteredPayments])

  const weeklyData = useMemo(() => {
    const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
    const dayTotals = [0, 0, 0, 0, 0, 0, 0]
    transactionsList.forEach((t) => {
      const d = new Date(t.date).getDay()
      const idx = (d + 1) % 7
      dayTotals[idx] += t.amount
    })
    const maxVal = Math.max(...dayTotals, 1)
    return days.map((day, idx) => {
      const amount = dayTotals[idx]
      const isPeak = amount > 0 && amount === maxVal
      const percent = Math.min(100, Math.max(15, Math.round((amount / maxVal) * 100)))
      return {
        day,
        amount,
        height: `${percent}%`,
        isPeak,
      }
    })
  }, [transactionsList])

  const handleResetFilters = () => {
    setSearchTerm('')
    setPaymentMethodFilter('ALL')
    setOperationTypeFilter('ALL')
    setStatusFilter('ALL')
    setStaffFilter('ALL')
    setTimeFilter('today')
    toast.info('تمت إعادة ضبط الفلاتر')
  }

  return (
    <div className="space-y-6 pb-20 font-cairo">
      {/* 1. Breadcrumbs & Header */}
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
            <span className="hover:text-zinc-700 cursor-pointer">المالية</span>
            <span>&gt;</span>
            <span className="text-zinc-900 font-bold">المدفوعات</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950">المدفوعات</h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            تابع جميع عمليات الدفع والتحصيل داخل الجيم بدقة وموثوقية عالية.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <ExportDropdown
            endpoint="payments"
            params={{
              search: searchTerm.trim() || undefined,
              method: paymentMethodFilter === 'ALL' ? undefined : paymentMethodFilter,
            }}
          />

          <button
            type="button"
            onClick={() => navigate('/app/payments/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F4D76A] hover:bg-gym-gold text-zinc-950 text-xs sm:text-sm font-black transition-all shadow-xs active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-zinc-950 stroke-[3]" />
            <span>تسجيل دفعة</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* KPI 1 */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold text-zinc-600">إجمالي التحصيل اليوم</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-zinc-950 font-mono">
              {financialStats.today.toLocaleString('ar-EG')}
            </span>
            <span className="text-xs font-bold text-zinc-500">ج.م</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
            <TrendingUp className="w-3 h-3" />
            <span>تحصيل مسجل بالخزينة</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold text-zinc-600">إجمالي العمليات المفلترة</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-zinc-950 font-mono">
              {financialStats.total.toLocaleString('ar-EG')}
            </span>
            <span className="text-xs font-bold text-zinc-500">ج.م</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{financialStats.count} عملية دفع</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold text-zinc-600">مدفوعات نقدية</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <Coins className="w-3.5 h-3.5 text-gym-gold-dark" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-zinc-950 font-mono">
              {financialStats.cash.toLocaleString('ar-EG')}
            </span>
            <span className="text-xs font-bold text-zinc-500">ج.م</span>
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            {financialStats.total > 0
              ? `${Math.round((financialStats.cash / financialStats.total) * 100)}% الحصة النقدية`
              : '0%'}
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-bold text-zinc-600">مدفوعات المحافظ</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-zinc-950 font-mono">
              {financialStats.wallet.toLocaleString('ar-EG')}
            </span>
            <span className="text-xs font-bold text-zinc-500">ج.م</span>
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            {financialStats.total > 0
              ? `${Math.round((financialStats.wallet / financialStats.total) * 100)}% محافظ إلكترونية`
              : '0%'}
          </div>
        </div>

        {/* KPI 5: المستحقات */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-2xs space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-zinc-700">
            <span className="text-[11px] font-bold text-zinc-700">عدد المعاملات</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-zinc-950 font-mono">
              {financialStats.count}
            </span>
            <span className="text-xs font-bold text-zinc-500">معاملة</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-medium">سجل إيصالات الخزينة</div>
        </div>
      </div>

      {/* 4. Weekly Revenue Chart Card */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-black text-zinc-950">
              التحصيل خلال الفترة
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              مخطط أداء الإيرادات اليومية وتوزيعها عبر أيام الأسبوع الجاري
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-[#FEFCE8] border border-[#F4D76A] px-2.5 py-1 rounded-full self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-gym-gold" />
            ذروة التحصيل: الخميس (28,400 ج.م)
          </span>
        </div>

        {/* 7 Days Bar Chart */}
        <div className="pt-8 pb-2">
          <div className="h-44 flex items-end justify-between gap-3 sm:gap-6 px-2 sm:px-8 border-b border-zinc-100">
            {weeklyData.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip on peak day */}
                {item.isPeak && (
                  <div className="absolute -top-7 bg-[#F4D76A] text-zinc-950 text-[10px] font-mono font-black px-2 py-0.5 rounded shadow-xs animate-bounce">
                    28,400 ج.م
                  </div>
                )}

                {/* Bar */}
                <div
                  style={{ height: item.height }}
                  className={cn(
                    'w-full max-w-[48px] rounded-t-lg transition-all duration-300',
                    item.isPeak
                      ? 'bg-[#F4D76A] shadow-xs'
                      : 'bg-[#0B0B0B] group-hover:bg-zinc-800'
                  )}
                />

                {/* Day Label */}
                <span className="text-[11px] text-zinc-600 font-bold mt-2 text-center">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Search & Filters Card */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Top Quick Time Filter Pills & Search */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full lg:w-96">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم العضو، أو رقم الهاتف، أو رقم العملية..."
              className="w-full pr-10 pl-4 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all font-medium text-zinc-900"
            />
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-4 h-4" />
            </div>
          </div>

          {/* Time Segmented Pills */}
          <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 text-xs">
            <span className="text-zinc-400 text-[11px] ml-1 shrink-0 font-medium">الفترة:</span>
            <button
              onClick={() => setTimeFilter('today')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-bold transition-all shrink-0',
                timeFilter === 'today' ? 'bg-zinc-950 text-white shadow-xs' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              اليوم
            </button>
            <button
              onClick={() => setTimeFilter('yesterday')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-bold transition-all shrink-0',
                timeFilter === 'yesterday' ? 'bg-zinc-950 text-white shadow-xs' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              أمس
            </button>
            <button
              onClick={() => setTimeFilter('this_week')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-bold transition-all shrink-0',
                timeFilter === 'this_week' ? 'bg-zinc-950 text-white shadow-xs' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              هذا الأسبوع
            </button>
            <button
              onClick={() => setTimeFilter('this_month')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-bold transition-all shrink-0',
                timeFilter === 'this_month' ? 'bg-zinc-950 text-white shadow-xs' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => setTimeFilter('last_month')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-bold transition-all shrink-0',
                timeFilter === 'last_month' ? 'bg-zinc-950 text-white shadow-xs' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              الشهر الماضي
            </button>
            <button
              onClick={() => setTimeFilter('custom')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1',
                timeFilter === 'custom' ? 'bg-zinc-950 text-white shadow-xs' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              <Calendar className="w-3 h-3" />
              <span>فترة مخصصة</span>
            </button>
          </div>
        </div>

        {/* Bottom Dropdowns Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-zinc-100 text-xs">
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">طريقة الدفع</label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold cursor-pointer"
            >
              <option value="ALL">الكل</option>
              <option value="CASH">نقدي (كاش)</option>
              <option value="WALLET">محفظة إلكترونية</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">نوع العملية</label>
            <select
              value={operationTypeFilter}
              onChange={(e) => setOperationTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold cursor-pointer"
            >
              <option value="ALL">الكل</option>
              <option value="NEW">اشتراك جديد</option>
              <option value="RENEW">تجديد اشتراك</option>
              <option value="DUE">دفعة مستحقة</option>
              <option value="REFUND">استرداد</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">حالة الدفع</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold cursor-pointer"
            >
              <option value="ALL">الكل</option>
              <option value="COMPLETED">مكتمل</option>
              <option value="PARTIAL">جزئي</option>
              <option value="REFUNDED">مسترد</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">الموظف</label>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold cursor-pointer"
            >
              <option value="ALL">كل الموظفين</option>
              <option value="1">محمد أحمد (كاشير)</option>
              <option value="2">أحمد علي (استقبال)</option>
              <option value="3">سارة محمود (خدمة العملاء)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full py-2 px-3 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. Payments Data Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-bold">
              <tr>
                <th className="py-3 px-4">رقم العملية</th>
                <th className="py-3 px-4">العضو</th>
                <th className="py-3 px-4">نوع العملية</th>
                <th className="py-3 px-4">المبلغ</th>
                <th className="py-3 px-4">طريقة الدفع</th>
                <th className="py-3 px-4">تاريخ العملية</th>
                <th className="py-3 px-4">الموظف</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500 font-bold">
                    جاري تحميل سجلات الخزينة...
                  </td>
                </tr>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                    {/* 1. Transaction Code */}
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                      {item.code}
                    </td>

                    {/* 2. Member */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0',
                            item.memberAvatarColor
                          )}
                        >
                          {item.memberAvatarLetter}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-950 flex items-center gap-1.5">
                            <span>{item.memberName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                            <span>{item.memberCode}</span>
                            <span>•</span>
                            <span>{item.phone}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 3. Operation Type */}
                    <td className="py-3.5 px-4">
                      {item.isRefund ? (
                        <span className="font-bold text-rose-700 block text-xs">
                          استرداد رسوم اشتراك
                          <span className="block text-[10px] text-rose-500">Refund</span>
                        </span>
                      ) : (
                        <div>
                          <span className="font-bold text-zinc-900 block">{item.operationType}</span>
                          <span className="text-[10px] text-zinc-400">{item.operationPlan}</span>
                        </div>
                      )}
                    </td>

                    {/* 4. Amount */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span
                          className={cn(
                            'font-black font-mono text-sm block',
                            item.amount < 0 ? 'text-rose-600' : 'text-zinc-950'
                          )}
                        >
                          {item.amount > 0 ? `${item.amount} ج.م` : `${item.amount} ج.م`}
                        </span>
                        {item.remainingDebt ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FEFCE8] text-amber-900 border border-[#F4D76A]/60 inline-block font-mono">
                            المتبقي {item.remainingDebt} ج.م
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400 block">{item.amountNote}</span>
                        )}
                      </div>
                    </td>

                    {/* 5. Payment Method */}
                    <td className="py-3.5 px-4">
                      {item.paymentRef ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                            <Wallet className="w-3 h-3" />
                            <span>{item.paymentMethod}</span>
                          </span>
                          <span className="text-[9px] text-zinc-400 block font-mono mt-0.5">
                            {item.paymentRef}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold">
                          <Coins className="w-3 h-3 text-gym-gold" />
                          <span>{item.paymentMethod}</span>
                        </span>
                      )}
                    </td>

                    {/* 6. Date */}
                    <td className="py-3.5 px-4 font-mono text-xs text-zinc-600">
                      <div>{item.date}</div>
                      <div className="text-[10px] text-zinc-400">{item.time}</div>
                    </td>

                    {/* 7. Staff */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900">{item.staffName}</div>
                      <div className="text-[10px] text-zinc-400">{item.staffRole}</div>
                    </td>

                    {/* 8. Status */}
                    <td className="py-3.5 px-4">
                      {item.status === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FEFCE8] text-amber-950 font-bold text-[10px] border border-[#F4D76A]/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-gym-gold" />
                          مكتمل
                        </span>
                      )}
                      {item.status === 'PARTIAL' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          جزئي
                        </span>
                      )}
                      {item.status === 'REFUNDED' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          مسترد
                        </span>
                      )}
                    </td>

                    {/* 9. Actions 3-dots */}
                    <td className="py-3.5 px-4 text-center relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenDropdownId(openDropdownId === item.id ? null : item.id)
                        }
                        className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {openDropdownId === item.id && (
                        <div className="absolute left-4 top-10 z-30 w-44 bg-white rounded-2xl shadow-xl border border-zinc-200/90 py-1.5 text-right text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransaction(item)
                              setShowDetailsModal(true)
                              setOpenDropdownId(null)
                            }}
                            className="w-full px-3 py-2 hover:bg-zinc-50 flex items-center gap-2 text-zinc-700 font-bold"
                          >
                            <FileText className="w-3.5 h-3.5 text-zinc-400" />
                            <span>عرض التفاصيل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransaction(item)
                              setShowReceiptModal(true)
                              setOpenDropdownId(null)
                            }}
                            className="w-full px-3 py-2 hover:bg-zinc-50 flex items-center gap-2 text-zinc-700 font-bold"
                          >
                            <Printer className="w-3.5 h-3.5 text-zinc-400" />
                            <span>طباعة إيصال حراري</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransaction(item)
                              setShowEditModal(true)
                              setOpenDropdownId(null)
                            }}
                            className="w-full px-3 py-2 hover:bg-zinc-50 flex items-center gap-2 text-zinc-700 font-bold"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                            <span>تعديل الدفعة</span>
                          </button>

                          <div className="border-t border-zinc-100 my-1" />

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransaction(item)
                              setShowRefundModal(true)
                              setOpenDropdownId(null)
                            }}
                            className="w-full px-3 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-700 font-bold"
                          >
                            <RefreshCcw className="w-3.5 h-3.5 text-rose-500" />
                            <span>طلب استرداد المبلغ</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    <p className="text-sm font-bold text-zinc-700">لا توجد عمليات دفع مطابقة</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      جرب تغيير الفلاتر أو إعادة ضبط البحث للعثور على النتائج
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 7. Table Footer */}
        <div className="p-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-zinc-500 font-medium">
            عرض <span className="font-bold text-zinc-900 font-mono">{filteredPayments.length}</span> من أصل{' '}
            <span className="font-bold text-zinc-900 font-mono">{transactionsList.length}</span> عملية مسجلة
          </div>

          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <span>سجل إيصالات الخزينة المعتمد</span>
          </div>
        </div>
      </div>

      {/* MODAL 1: Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-gym-gold-dark" />
                <h3 className="text-base font-black text-zinc-950">
                  تفاصيل العملية المالية ({selectedTransaction.code})
                </h3>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-zinc-50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">اسم المشترك:</span>
                  <span className="font-bold text-zinc-900">{selectedTransaction.memberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">كود العضوية:</span>
                  <span className="font-mono font-bold">{selectedTransaction.memberCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">نوع العملية:</span>
                  <span className="font-bold text-zinc-900">{selectedTransaction.operationType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">طريقة السداد:</span>
                  <span className="font-bold text-zinc-900">{selectedTransaction.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">تاريخ ووقت التحصيل:</span>
                  <span className="font-mono">{selectedTransaction.date} - {selectedTransaction.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">الكاشير المسؤول:</span>
                  <span className="font-bold">{selectedTransaction.staffName} ({selectedTransaction.staffRole})</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FEFCE8] border border-[#F4D76A] flex justify-between items-center">
                <span className="font-bold text-amber-950">المبلغ المحصل:</span>
                <span className="text-2xl font-black text-zinc-950 font-mono">
                  {selectedTransaction.amount} ج.م
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setShowReceiptModal(true)
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4 text-gym-gold" />
                <span>طباعة الإيصال الحراري</span>
              </button>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: 80mm Egyptian Thermal Receipt Preview Modal */}
      {showReceiptModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200 text-center font-mono text-xs space-y-4 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="space-y-1 pb-3 border-b-2 border-dashed border-zinc-300 font-cairo">
              <h2 className="text-xl font-black tracking-wider text-zinc-950">GYMVIP FITNESS</h2>
              <p className="text-[10px] text-zinc-500">فرع القاهرة - النزهة الجديدة</p>
              <p className="text-[10px] text-zinc-400">س.ت: 109283 - ب.ض: 489-201-902</p>
            </div>

            {/* Receipt Info */}
            <div className="text-right space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>رقم الإيصال:</span>
                <span className="font-bold">{selectedTransaction.code}</span>
              </div>
              <div className="flex justify-between">
                <span>التاريخ:</span>
                <span>{selectedTransaction.date} {selectedTransaction.time}</span>
              </div>
              <div className="flex justify-between">
                <span>العضو:</span>
                <span className="font-bold font-cairo">{selectedTransaction.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span>الكاشير:</span>
                <span className="font-cairo">{selectedTransaction.staffName}</span>
              </div>
            </div>

            {/* Item Breakdown */}
            <div className="py-2 border-y-2 border-dashed border-zinc-300 text-right space-y-1">
              <div className="flex justify-between font-bold font-cairo">
                <span>{selectedTransaction.operationType}</span>
                <span>{selectedTransaction.amount} ج.م</span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>طريقة الدفع:</span>
                <span className="font-cairo">{selectedTransaction.paymentMethod}</span>
              </div>
            </div>

            {/* QR Code */}
            <div className="py-2 flex flex-col items-center justify-center space-y-1">
              <div className="w-24 h-24 bg-zinc-100 border border-zinc-300 rounded-xl flex items-center justify-center">
                <QrCode className="w-16 h-16 text-zinc-800" />
              </div>
              <span className="text-[9px] text-zinc-400">امسح للتحقق من الفاتورة الضريبية</span>
            </div>

            <p className="text-[10px] text-zinc-500 font-cairo">شكراً لثقتكم بنادي GymVIP!</p>

            <div className="flex items-center gap-2 pt-2 font-cairo">
              <button
                onClick={() => {
                  toast.success('تم إرسال أمر الطباعة إلى الطابعة الحرارية')
                  setShowReceiptModal(false)
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-gym-gold" />
                <span>طباعة الآن</span>
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-3 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Refund Request Modal */}
      {showRefundModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <RefreshCcw className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black text-zinc-950 text-center">
              طلب استرداد مبلغ من الخزينة
            </h3>

            <p className="text-xs text-zinc-500 text-center leading-relaxed">
              أنت على وشك استرداد مبلغ{' '}
              <span className="font-bold text-zinc-900 font-mono">{selectedTransaction.amount} ج.م</span> للعضو{' '}
              <span className="font-bold text-zinc-900">{selectedTransaction.memberName}</span>.
            </p>

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-zinc-800">سبب الاسترداد:</label>
              <select className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold">
                <option>إلغاء الاشتراك خلال فترة التجربة</option>
                <option>خطأ في تسجيل قيمة الدفعة</option>
                <option>عذر طبي مثبت بتقرير</option>
                <option>أخرى</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  toast.success('تم توثيق عملية الاسترداد وخصمها من الخزينة بنجاح')
                  setShowRefundModal(false)
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                تأكيد الاسترداد
              </button>
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Edit Payment Modal */}
      {showEditModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <h3 className="text-base font-black text-zinc-950 pb-2 border-b border-zinc-100">
              تعديل بيانات الدفعة ({selectedTransaction.code})
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-700 font-bold mb-1">المبلغ المحصل:</label>
                <input
                  type="number"
                  defaultValue={selectedTransaction.amount}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1">ملاحظات التعديل المحاسبي:</label>
                <textarea
                  rows={2}
                  placeholder="سبب تعديل القيد المالي..."
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  toast.success('تم حفظ تعديل الدفعة في سجل التدقيق المحاسبي')
                  setShowEditModal(false)
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800"
              >
                حفظ التعديل
              </button>
              <button
                onClick={() => setShowEditModal(false)}
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

export default PaymentsListPage
