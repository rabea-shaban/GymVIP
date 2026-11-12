import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  UserPlus,
  QrCode,
  ChevronLeft,
  X,
  Copy,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Users,
} from 'lucide-react'
import { membersApi } from '../services/membersApi'
import { attendanceApi } from '@/features/attendance/services/attendanceApi'
import type { MemberItem } from '../types/member.types'

export const MemberSearchPage: React.FC = () => {
  const navigate = useNavigate()

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [genderFilter, setGenderFilter] = useState<'all' | 'MALE' | 'FEMALE'>('all')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  // Real Data State
  const [members, setMembers] = useState<MemberItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Drawer & Action states
  const [drawerMember, setDrawerMember] = useState<MemberItem | null>(null)
  const [isCheckingIn, setIsCheckingIn] = useState<string | null>(null)

  // Toast
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3500)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text)
    triggerToast(`تم نسخ: ${text}`)
  }

  // Load Members
  const loadMembers = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await membersApi.list({
        search: searchQuery.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        gender: genderFilter === 'all' ? undefined : (genderFilter as any),
        limit: 24,
      })

      setMembers(res.members)
      setTotalCount(res.pagination.total)
    } catch {
      triggerToast('تعذر جلب نتائج البحث', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, statusFilter, genderFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMembers()
    }, 250)
    return () => clearTimeout(timer)
  }, [loadMembers])

  // Handle Quick Check-in
  const handleCheckInMember = async (member: MemberItem) => {
    try {
      setIsCheckingIn(member.id)
      await attendanceApi.checkIn(member.id)
      triggerToast(`تم تسجيل حضور ${member.name} بنجاح!`)
      await loadMembers()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'فشل تسجيل الحضور'
      triggerToast(msg, 'error')
    } finally {
      setIsCheckingIn(null)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-cairo" dir="rtl">
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

      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 mb-1.5">
            <span
              onClick={() => navigate('/app/dashboard')}
              className="hover:text-zinc-700 cursor-pointer"
            >
              لوحة التحكم
            </span>
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span
              onClick={() => navigate('/app/members')}
              className="hover:text-zinc-700 cursor-pointer"
            >
              الأعضاء
            </span>
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-700">البحث السريع</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tight">البحث عن عضو</h1>
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#FAF0D3] text-[#7E6517] border border-[#ECD9A2]">
              {totalCount} عضو مسجل
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1 font-medium">
            ابحث بسرعة عن أي عضو للوصول إلى بياناته واشتراكه وتسجيل حضوره فوراً.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => navigate('/app/members/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-zinc-950 text-white hover:bg-zinc-800 shadow-sm transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ إضافة عضو جديد</span>
          </button>
        </div>
      </div>

      {/* Main Big Search Box & Filters */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        {/* Search Input Bar */}
        <div className="relative flex items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم العضو، رقم الهاتف، أو كود العضوية..."
              className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-gym-gold/20 focus:border-gym-gold transition"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>

          <button
            onClick={() => loadMembers()}
            className="mr-3 inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black bg-zinc-950 text-white hover:bg-zinc-800 shadow-sm transition active:scale-95 shrink-0"
          >
            <Search className="w-4 h-4 text-[#F5D86B]" />
            <span>بحث</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-zinc-500">حالة العضو:</span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'active', label: 'النشطين' },
              { id: 'inactive', label: 'غير النشطين' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  statusFilter === f.id
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                {f.label}
              </button>
            ))}

            <span className="font-bold text-zinc-500 mr-2">الجنس:</span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'MALE', label: 'رجال' },
              { id: 'FEMALE', label: 'سيدات' },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => setGenderFilter(g.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  genderFilter === g.id
                    ? 'bg-zinc-950 text-white shadow-2xs'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                viewMode === 'cards' ? 'bg-white shadow-2xs text-zinc-900' : 'text-zinc-500'
              }`}
            >
              بطاقات
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                viewMode === 'table' ? 'bg-white shadow-2xs text-zinc-900' : 'text-zinc-500'
              }`}
            >
              جدول
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-500 font-bold">
          تم العثور على {members.length} عضو مطبق عليهم البحث
        </div>
      </div>

      {/* Loading & Empty States */}
      {isLoading ? (
        <div className="p-16 text-center text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gym-gold mb-3" />
          <span className="text-sm font-bold">جاري البحث في قاعدة بيانات الأعضاء...</span>
        </div>
      ) : members.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-zinc-200">
          <Users className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-900 mb-1">لا توجد نتائج بحث مطابقة</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4">
            تحقق من صحة الاسم أو الكود أو رقم الهاتف، أو قم بإلغاء الفلاتر المحددة.
          </p>
          <button
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('all')
              setGenderFilter('all')
            }}
            className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold"
          >
            إلغاء الفلاتر والبحث
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const initials = member.name.slice(0, 2)
            const planName = member.currentSubscription?.planName || 'بدون اشتراك نشط'
            const endDate = member.currentSubscription?.endDate
              ? new Date(member.currentSubscription.endDate).toLocaleDateString('ar-EG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'

            return (
              <div
                key={member.id}
                className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-zinc-950 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {initials}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-zinc-950 text-sm">{member.name}</h4>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          كود: {member.memberCode}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        member.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                      }`}
                    >
                      {member.isActive ? 'نشط' : 'معطل'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                      <span className="text-zinc-500">رقم الهاتف:</span>
                      <span className="font-bold text-zinc-900 font-mono" dir="ltr">
                        {member.phone}
                      </span>
                    </div>

                    <div className="flex justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                      <span className="text-zinc-500">الاشتراك:</span>
                      <span className="font-bold text-zinc-900">{planName}</span>
                    </div>

                    <div className="flex justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                      <span className="text-zinc-500">تاريخ الانتهاء:</span>
                      <span className="font-bold text-amber-600">{endDate}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setDrawerMember(member)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition"
                  >
                    تفاصيل سريعة
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isCheckingIn === member.id}
                      onClick={() => handleCheckInMember(member)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F5D86B] hover:bg-[#ECCB50] text-zinc-950 transition flex items-center gap-1 disabled:opacity-50"
                    >
                      {isCheckingIn === member.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <QrCode className="w-3.5 h-3.5" />
                      )}
                      <span>حضور</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/app/members/${member.id}`)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-950 hover:bg-zinc-800 text-white transition"
                    >
                      الملف
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 font-bold">
                  <th className="py-3.5 px-4">العضو</th>
                  <th className="py-3.5 px-4">رقم الهاتف</th>
                  <th className="py-3.5 px-4">نوع الاشتراك</th>
                  <th className="py-3.5 px-4 text-center">الانتهاء</th>
                  <th className="py-3.5 px-4 text-center">الحالة</th>
                  <th className="py-3.5 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60">
                {members.map((member) => {
                  const initials = member.name.slice(0, 2)
                  const planName = member.currentSubscription?.planName || 'بدون اشتراك نشط'
                  const endDate = member.currentSubscription?.endDate
                    ? new Date(member.currentSubscription.endDate).toLocaleDateString('ar-EG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'

                  return (
                    <tr key={member.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-950 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="font-extrabold text-zinc-900 block">{member.name}</span>
                            <span className="text-[11px] text-zinc-400 font-mono">
                              {member.memberCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-zinc-700" dir="ltr">
                        {member.phone}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-zinc-800 bg-zinc-100 px-2.5 py-1 rounded-lg text-xs">
                          {planName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-semibold text-zinc-700">
                        {endDate}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            member.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                          }`}
                        >
                          {member.isActive ? 'نشط' : 'معطل'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isCheckingIn === member.id}
                            onClick={() => handleCheckInMember(member)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F5D86B] hover:bg-[#ECCB50] text-zinc-950 transition flex items-center gap-1 disabled:opacity-50"
                          >
                            {isCheckingIn === member.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <QrCode className="w-3.5 h-3.5" />
                            )}
                            <span>حضور</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/app/members/${member.id}`)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-900 hover:bg-black text-white transition"
                          >
                            الملف
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK MEMBER PROFILE DRAWER */}
      {drawerMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white h-full max-w-sm sm:max-w-md w-full p-6 shadow-2xl overflow-y-auto space-y-6 text-right flex flex-col justify-between border-r border-zinc-200 animate-in slide-in-from-left">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <button
                  onClick={() => setDrawerMember(null)}
                  className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(drawerMember.phone)}
                    className="p-2 rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition"
                    title="نسخ الهاتف"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={`tel:${drawerMember.phone}`}
                    className="p-2 rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition"
                    title="اتصال"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-zinc-950">{drawerMember.name}</h3>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      drawerMember.isActive ? 'bg-emerald-500' : 'bg-zinc-400'
                    }`}
                  ></span>
                </div>
                <div className="text-xs text-zinc-400 font-mono">كود: {drawerMember.memberCode}</div>
              </div>

              {/* Subscription Status Details */}
              <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900">
                    {drawerMember.currentSubscription?.planName || 'بدون اشتراك نشط'}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                      drawerMember.currentSubscription?.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    {drawerMember.currentSubscription?.status || 'لا يوجد'}
                  </span>
                </div>

                <div className="space-y-1 text-zinc-600">
                  <div className="flex justify-between">
                    <span>تاريخ البداية:</span>
                    <span className="font-bold text-zinc-900">
                      {drawerMember.currentSubscription?.startDate
                        ? new Date(drawerMember.currentSubscription.startDate).toLocaleDateString(
                            'ar-EG',
                            { day: 'numeric', month: 'short', year: 'numeric' }
                          )
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>تاريخ الانتهاء:</span>
                    <span className="font-bold text-amber-600">
                      {drawerMember.currentSubscription?.endDate
                        ? new Date(drawerMember.currentSubscription.endDate).toLocaleDateString(
                            'ar-EG',
                            { day: 'numeric', month: 'short', year: 'numeric' }
                          )
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">رقم الهاتف:</span>
                  <span className="font-bold text-zinc-900 font-mono" dir="ltr">
                    {drawerMember.phone}
                  </span>
                </div>
                {drawerMember.email && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">البريد الإلكتروني:</span>
                    <span className="font-bold text-zinc-900 font-mono">
                      {drawerMember.email}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500">تاريخ التسجيل:</span>
                  <span className="font-bold text-zinc-700">
                    {new Date(drawerMember.createdAt).toLocaleDateString('ar-EG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => {
                  const id = drawerMember.id
                  setDrawerMember(null)
                  navigate(`/app/members/${id}`)
                }}
                className="w-full py-3 rounded-xl text-xs font-black bg-zinc-950 text-white hover:bg-zinc-800 transition"
              >
                الملف الكامل للعضو
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MemberSearchPage
