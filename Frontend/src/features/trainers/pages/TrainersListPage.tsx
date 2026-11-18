import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  RotateCcw,
  ChevronLeft,
  Award,
  ArrowRightLeft,
  Eye,
  Trash2,
  PauseCircle,
  PlayCircle,
  UserX,
  CheckCircle2,
  X,
} from 'lucide-react'
import { trainersApi } from '../services/trainersApi'
import type { TrainerItem } from '../types/trainer.types'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useRealtimeSync } from '@/services/socket'

export interface Trainer {
  id: string
  code: string
  name: string
  initials: string
  avatarBg: string
  avatarText: string
  phone: string
  specialty: string
  traineesCount: number
  joinDate: string
  status: 'active' | 'inactive'
}

export const TrainersListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isManagerOrOwner = user?.role === 'OWNER' || user?.role === 'MANAGER'

  // Data State
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all')

  // Selected Trainer for Modals / Drawer
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [disableModalOpen, setDisableModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const mapTrainerItem = (t: TrainerItem): Trainer => {
    const names = (t.user.name || '').split(' ')
    const initials =
      names.length >= 2 ? `${names[0][0]}.${names[1][0]}` : names[0]?.slice(0, 2) || 'م'

    return {
      id: t.id,
      code: `TR-${t.id.slice(0, 6)}`,
      name: t.user.name,
      initials,
      avatarBg: 'bg-zinc-950',
      avatarText: 'text-white',
      phone: t.user.phone || 'غير مسجل',
      specialty: t.specialization || 'لياقة عامة',
      traineesCount: 0,
      joinDate: new Date(t.createdAt).toLocaleDateString('ar-EG', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      status: t.user.isActive ? 'active' : 'inactive',
    }
  }

  const loadTrainers = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await trainersApi.list({ limit: 100 })
      if (res.trainers) {
        const mapped = res.trainers.map(mapTrainerItem)
        setTrainers(mapped)
      }
    } catch {
      triggerToast('تعذر جلب قائمة المدربين من الخادم')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadTrainers()
  }, [loadTrainers])

  // Instant Real-Time WebSocket updates for Trainers List
  useRealtimeSync(undefined, () => {
    loadTrainers()
  })

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setSpecialtyFilter('all')
  }

  // Filtered trainers list
  const filteredTrainers = useMemo(() => {
    return trainers.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = t.name.toLowerCase().includes(q)
        const matchPhone = t.phone.includes(q)
        const matchCode = t.code.toLowerCase().includes(q)
        const matchSpec = t.specialty.toLowerCase().includes(q)
        if (!matchName && !matchPhone && !matchCode && !matchSpec) return false
      }
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (specialtyFilter !== 'all' && !t.specialty.includes(specialtyFilter)) return false
      return true
    })
  }, [trainers, searchQuery, statusFilter, specialtyFilter])

  // Unique specialties
  const specialtiesList = useMemo(() => {
    const set = new Set<string>()
    trainers.forEach((t) => {
      if (t.specialty) set.add(t.specialty)
    })
    return Array.from(set)
  }, [trainers])

  // Toggle Trainer Status
  const handleToggleStatus = async (trainer: Trainer) => {
    const nextStatus = trainer.status !== 'active'
    try {
      setIsSubmitting(true)
      await trainersApi.updateStatus(trainer.id, nextStatus)
      setDisableModalOpen(false)
      setActiveMenuId(null)
      triggerToast(
        !nextStatus
          ? `تم تعطيل حساب المدرب ${trainer.name} بنجاح.`
          : `تم تفعيل حساب المدرب ${trainer.name} بنجاح.`
      )
      loadTrainers()
    } catch (err: any) {
      triggerToast(err.response?.data?.message || err.message || 'فشل تحديث حالة المدرب')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete Trainer Handler
  const handleDeleteTrainer = async (trainer: Trainer) => {
    if (trainer.traineesCount > 0) {
      triggerToast('لا يمكن حذف المدرب لوجود متدربين مرتبطين به. قم بتعطيل حسابه أو نقل المتدربين أولاً.')
      setDeleteModalOpen(false)
      return
    }
    try {
      setIsSubmitting(true)
      await trainersApi.delete(trainer.id)
      setDeleteModalOpen(false)
      setActiveMenuId(null)
      triggerToast(`تم حذف المدرب ${trainer.name} بنجاح من النظام.`)
      loadTrainers()
    } catch (err: any) {
      triggerToast(err.response?.data?.message || err.message || 'فشل حذف المدرب')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-cairo" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-zinc-900 text-white shadow-2xl border border-gym-gold/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-gym-gold shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-zinc-400 hover:text-white mr-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1 font-medium">
            <span
              onClick={() => navigate('/app/dashboard')}
              className="hover:text-zinc-800 cursor-pointer"
            >
              لوحة التحكم
            </span>
            <ChevronLeft className="w-3 h-3 text-zinc-400" />
            <span className="text-zinc-900 font-bold">المدربين</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              المدربين
            </h1>
            <span className="inline-flex items-center px-3 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-bold">
              {trainers.length} مدرب مسجل
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            إدارة فريق المدربين ومتابعة بياناتهم وسجلات التكليف وحالتهم التدريبية.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          {isManagerOrOwner && (
            <button
              type="button"
              onClick={() => navigate('/app/trainers/new')}
              className="px-5 py-2.5 bg-gym-gold hover:bg-gym-gold-light text-zinc-950 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-zinc-950" />
              <span>+ إضافة مدرب</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">إجمالي المدربين</span>
            <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center border border-zinc-200/60">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">{trainers.length}</span>
            <span className="bg-zinc-100 text-zinc-600 text-[11px] font-bold px-2 py-0.5 rounded border border-zinc-200/60">
              كافة التخصصات
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">المدربين النشطين</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-700 tracking-tight">
              {trainers.filter((t) => t.status === 'active').length}
            </span>
            <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded border border-emerald-200">
              جاهزون للتدريب
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">المدربين غير النشطين</span>
            <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-500 flex items-center justify-center border border-zinc-200/60">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {trainers.filter((t) => t.status === 'inactive').length}
            </span>
            <span className="bg-zinc-100 text-zinc-500 text-[11px] font-bold px-2 py-0.5 rounded border border-zinc-200/60">
              معطل ومؤقت
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">التخصصات التدريبية</span>
            <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center border border-zinc-200/60">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">
              {specialtiesList.length || 1}
            </span>
            <span className="bg-amber-50 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded border border-amber-200">
              تخصصات مختلفة
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-3.5 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم المدرب أو رقم الهاتف أو التخصص..."
            className="w-full pl-4 pr-10 py-2 rounded-xl border border-zinc-200 bg-zinc-50/50 text-xs sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-gym-gold focus:bg-white transition-all placeholder:text-zinc-400"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>

        <div className="w-full md:w-44">
          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
          >
            <option value="all">جميع التخصصات</option>
            {specialtiesList.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-36">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">معطل</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleResetFilters}
          className="px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
          <span>إعادة ضبط</span>
        </button>
      </div>

      {/* Trainers Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-3 animate-pulse">
            <div className="w-8 h-8 border-3 border-gym-gold border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-zinc-500">جاري تحميل قائمة المدربين...</p>
          </div>
        ) : filteredTrainers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1">
              {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد مدربون مسجلون'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mb-6">
              {searchQuery
                ? `لم يتم العثور على أي مدرب يطابق "${searchQuery}".`
                : 'ابدأ بإضافة أول مدرب لصالات التدريب في الجيم.'}
            </p>
            {isManagerOrOwner && (
              <button
                type="button"
                onClick={() => navigate('/app/trainers/new')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gym-gold text-zinc-950 text-xs font-black hover:bg-gym-gold-light"
              >
                <UserPlus className="w-4 h-4" />
                + إضافة مدرب جديد
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-zinc-50/90 border-b border-zinc-200/80 text-zinc-500 font-bold">
                <tr>
                  <th className="py-3.5 px-4">المدرب</th>
                  <th className="py-3.5 px-4">رقم الهاتف</th>
                  <th className="py-3.5 px-4">التخصص</th>
                  <th className="py-3.5 px-4">تاريخ الانضمام</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {filteredTrainers.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/app/trainers/${t.id}`)}
                    className="hover:bg-zinc-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${t.avatarBg} ${t.avatarText}`}
                        >
                          {t.initials}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-950 text-xs sm:text-sm">{t.name}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">{t.code}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-zinc-600" dir="ltr">
                      {t.phone}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 font-bold text-[11px]">
                        {t.specialty}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-zinc-500 text-[11px]">
                      {t.joinDate}
                    </td>

                    <td className="py-3.5 px-4">
                      {t.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          نشط
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                          <PauseCircle className="w-3.5 h-3.5 text-zinc-500" />
                          معطل
                        </span>
                      )}
                    </td>

                    <td
                      className="py-3.5 px-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === t.id ? null : t.id)}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === t.id && (
                          <div className="absolute left-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-zinc-100 py-1.5 z-30 text-right text-xs font-bold animate-in fade-in zoom-in-95">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTrainer(t)
                                setDrawerOpen(true)
                                setActiveMenuId(null)
                              }}
                              className="w-full px-3 py-2 hover:bg-zinc-50 flex items-center gap-2 text-zinc-700"
                            >
                              <Eye className="w-3.5 h-3.5 text-zinc-400" />
                              <span>عرض السجل السريع</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate(`/app/trainers/${t.id}`)}
                              className="w-full px-3 py-2 hover:bg-zinc-50 flex items-center gap-2 text-zinc-700"
                            >
                              <Users className="w-3.5 h-3.5 text-zinc-400" />
                              <span>الملف الشخصي الكامل</span>
                            </button>

                            {isManagerOrOwner && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTrainer(t)
                                    setDisableModalOpen(true)
                                    setActiveMenuId(null)
                                  }}
                                  className="w-full px-3 py-2 hover:bg-zinc-50 flex items-center gap-2 text-zinc-700"
                                >
                                  {t.status === 'active' ? (
                                    <>
                                      <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                                      <span>تعطيل الحساب</span>
                                    </>
                                  ) : (
                                    <>
                                      <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>تفعيل الحساب</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTrainer(t)
                                    setDeleteModalOpen(true)
                                    setActiveMenuId(null)
                                  }}
                                  className="w-full px-3 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600 border-t border-zinc-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  <span>حذف المدرب</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DRAWER: Trainer Overview */}
      {drawerOpen && selectedTrainer && (
        <div className="fixed inset-0 z-50 flex justify-start bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto space-y-6 text-right animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gym-gold-dark" />
                <h3 className="text-base font-extrabold text-zinc-900">ملف المدرب السريع</h3>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-xl hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200 flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg ${selectedTrainer.avatarBg} ${selectedTrainer.avatarText}`}
              >
                {selectedTrainer.initials}
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-zinc-900">{selectedTrainer.name}</h4>
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                  <span>{selectedTrainer.code}</span>
                  <span>•</span>
                  <span>{selectedTrainer.specialty}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80">
                <span className="text-zinc-400">تاريخ الانضمام:</span>
                <p className="text-xs font-bold text-zinc-900 mt-1 font-mono">{selectedTrainer.joinDate}</p>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80">
                <span className="text-zinc-400">حالة الحساب:</span>
                <p
                  className={`text-xs font-bold mt-1 ${
                    selectedTrainer.status === 'active' ? 'text-emerald-700' : 'text-zinc-500'
                  }`}
                >
                  {selectedTrainer.status === 'active' ? 'نشط' : 'معطل'}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false)
                  navigate(`/app/trainers/${selectedTrainer.id}`)
                }}
                className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4 text-gym-gold" />
                <span>الانتقال للملف الكامل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Disable / Activate Modal */}
      {disableModalOpen && selectedTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <PauseCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-zinc-900">
                {selectedTrainer.status === 'active'
                  ? `هل تريد تعطيل حساب المدرب ${selectedTrainer.name}؟`
                  : `هل تريد تفعيل حساب المدرب ${selectedTrainer.name}؟`}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {selectedTrainer.status === 'active'
                  ? 'سيتم إيقاف صلاحيات دخول المدرب للنظام وتعليق نشاطه التدريبي مؤقتاً.'
                  : 'سيتم إعادة تفعيل الحساب وتمكين المدرب من إدارة متدربيه وجلساته التدريبية.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDisableModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleToggleStatus(selectedTrainer)}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {isSubmitting
                  ? 'جاري التنفيذ...'
                  : selectedTrainer.status === 'active'
                  ? 'تأكيد التعطيل'
                  : 'تأكيد التفعيل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Delete Modal */}
      {deleteModalOpen && selectedTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-zinc-900">
                تأكيد حذف المدرب ({selectedTrainer.name}) نهائياً؟
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                سيتم حذف ملف المدرب وسجله من قاعدة البيانات. في حال وجود عمليات مسجلة باسمه، يرجى تعطيل الحساب بدلاً من الحذف.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDeleteTrainer(selectedTrainer)}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isSubmitting ? 'جاري الحذف...' : 'تأكيد الحذف النهائي'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrainersListPage
