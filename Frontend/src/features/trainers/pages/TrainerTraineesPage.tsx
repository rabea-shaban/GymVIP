import React, { useState, useEffect, useCallback } from 'react'
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
  Phone,
  MessageCircle,
  QrCode,
  ArrowUpRight,
  Sparkles,
  Loader2,
  UserCheck
} from 'lucide-react'
import { membersApi } from '@/features/members/services/membersApi'
import { attendanceApi } from '@/features/attendance/services/attendanceApi'
import type { MemberItem } from '@/features/members/types/member.types'

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
          <Sparkles className="w-4 h-4 text-[#F5D86B]" />
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
                  const initials = trainee.name.slice(0, 2)
                  const subPlanName = trainee.currentSubscription?.planName || 'بدون اشتراك'
                  const endDate = trainee.currentSubscription?.endDate
                    ? new Date(trainee.currentSubscription.endDate).toLocaleDateString('ar-EG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'

                  return (
                    <tr key={trainee.id} className="hover:bg-zinc-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-950 text-white flex items-center justify-center font-bold text-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900">{trainee.name}</div>
                            <div className="text-[11px] text-zinc-400 font-mono">
                              كود: {trainee.memberCode}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-zinc-600" dir="ltr">
                        {trainee.phone}
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
      {selectedTrainee && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white h-full max-w-md w-full p-6 shadow-2xl overflow-y-auto space-y-6 text-right flex flex-col justify-between animate-in slide-in-from-left">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-950 text-white flex items-center justify-center font-bold text-base">
                    {selectedTrainee.name.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-950">{selectedTrainee.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-400 font-mono">
                        كود: {selectedTrainee.memberCode}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          selectedTrainee.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                        }`}
                      >
                        {selectedTrainee.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTrainee(null)}
                  className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-xl border border-zinc-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Trainee Info */}
              <div className="space-y-3 text-xs">
                <h4 className="font-bold text-zinc-900 text-sm">بيانات الاشتراك الحالي</h4>
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">نوع الباقة:</span>
                    <span className="font-bold text-zinc-900">
                      {selectedTrainee.currentSubscription?.planName || 'بدون اشتراك نشط'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">تاريخ البداية:</span>
                    <span className="font-bold text-zinc-900">
                      {selectedTrainee.currentSubscription?.startDate
                        ? new Date(selectedTrainee.currentSubscription.startDate).toLocaleDateString('ar-EG', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">تاريخ الانتهاء:</span>
                    <span className="font-bold text-amber-600">
                      {selectedTrainee.currentSubscription?.endDate
                        ? new Date(selectedTrainee.currentSubscription.endDate).toLocaleDateString('ar-EG', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">تاريخ التسجيل:</span>
                    <span className="font-bold text-zinc-700">
                      {new Date(selectedTrainee.createdAt).toLocaleDateString('ar-EG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Communication Bar */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-zinc-900 text-sm">التواصل المباشر مع المتدرب</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={`tel:${selectedTrainee.phone}`}
                    className="flex items-center justify-center gap-2 p-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl font-bold transition"
                  >
                    <Phone className="w-4 h-4" />
                    <span>اتصال هاتفي</span>
                  </a>
                  <a
                    href={`https://wa.me/2${selectedTrainee.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>واتساب</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Full Profile Link */}
            <div className="pt-4 border-t border-zinc-100">
              <button
                onClick={() => {
                  const id = selectedTrainee.id
                  setSelectedTrainee(null)
                  navigate(`/app/members/${id}`)
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black bg-zinc-950 text-white hover:bg-zinc-800 transition"
              >
                <span>فتح ملف العضو الشامل</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
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
        </div>
      )}
    </div>
  )
}

export default TrainerTraineesPage
