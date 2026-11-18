import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  ChevronLeft,
  ArrowRightLeft,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Home,
  Camera,
  Edit3,
  Phone,
  Mail,
  Calendar,
  Clock,
  Shield,
  Zap,
  Copy,
  UserCheck,
  Dumbbell,
  Check,
  X,
  History,
  UserPlus,
} from 'lucide-react'
import { useParams } from 'react-router-dom'
import { trainersApi } from '../services/trainersApi'
import type { TrainerItem } from '../types/trainer.types'
import { useAuth } from '@/features/auth/context/AuthContext'
import { membersApi } from '@/features/members/services/membersApi'
import { attendanceApi } from '@/features/attendance/services/attendanceApi'
import { Avatar } from '@/components/ui/Avatar'
import { useRealtimeSync } from '@/services/socket'

export interface Trainee {
  id: string
  name: string
  code: string
  phone: string
  plan: string
  attendanceCount: number
  joinDate: string
  status: 'active' | 'expiring'
  avatarUrl?: string | null
}

// Real SVG Icons
const WhatsAppSvg: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

const PhoneCallSvg: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
)

const formatWhatsAppUrl = (phone: string) => {
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '2' + cleaned
  } else if (!cleaned.startsWith('20') && cleaned.length === 10) {
    cleaned = '20' + cleaned
  }
  return `https://wa.me/${cleaned}`
}

const formatDateClean = (dateStr?: string | Date | null) => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
  } catch {
    return String(dateStr).slice(0, 10)
  }
}

export const TrainerDetailPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const isManagerOrOwner = user?.role === 'OWNER' || user?.role === 'MANAGER'

  // Real Trainer Data State
  const [trainerData, setTrainerData] = useState<TrainerItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editSpecialization, setEditSpecialization] = useState('')
  const [editBio, setEditBio] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Main Active Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'trainees' | 'history'>('overview')

  // Trainer Profile State
  const [trainerStatus, setTrainerStatus] = useState<'active' | 'suspended'>('active')
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [traineeSearch, setTraineeSearch] = useState('')

  // Modals State
  const [suspendModalOpen, setSuspendModalOpen] = useState(false)
  const [activateModalOpen, setActivateModalOpen] = useState(false)
  const [reassignModalOpen, setReassignModalOpen] = useState(false)
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadTrainer = React.useCallback(async () => {
    if (!id) return
    try {
      const [data, membersRes, attendanceRes] = await Promise.all([
        trainersApi.getById(id),
        membersApi.list({ limit: 100 }).catch(() => ({ members: [] })),
        attendanceApi.list({ limit: 200 }).catch(() => ({ attendance: [] })),
      ])
      setTrainerData(data)
      setEditName(data.user.name)
      setEditPhone(data.user.phone || '')
      setEditSpecialization(data.specialization || '')
      setEditBio(data.bio || '')
      setTrainerStatus(data.user.isActive ? 'active' : 'suspended')

      const attendanceCounts: Record<string, number> = {}
      if (attendanceRes?.attendance) {
        attendanceRes.attendance.forEach((att) => {
          if (att.memberId) {
            attendanceCounts[att.memberId] = (attendanceCounts[att.memberId] || 0) + 1
          }
        })
      }

      if (membersRes.members && membersRes.members.length > 0) {
        const mapped: Trainee[] = membersRes.members.map((m) => {
          const sub = m.currentSubscription
          return {
            id: m.id,
            name: m.name,
            code: m.memberCode,
            phone: m.phone,
            plan: sub?.planName || 'بدون اشتراك نشط',
            attendanceCount: attendanceCounts[m.id] || 0,
            joinDate: formatDateClean(m.createdAt),
            status: m.isActive ? 'active' : 'expiring',
            avatarUrl: m.avatarUrl,
          }
        })
        setTrainees(mapped)
      }
    } catch {
      // Fallback for mock IDs
    }
  }, [id])

  React.useEffect(() => {
    loadTrainer()
  }, [loadTrainer])

  // Instant Real-Time WebSocket updates for Trainer Profile
  useRealtimeSync(undefined, () => {
    loadTrainer()
  })

  // Copy phone handler
  const handleCopyPhone = () => {
    const p = trainerData?.user.phone || ''
    if (p) {
      navigator.clipboard?.writeText(p)
      triggerToast('تم نسخ رقم الهاتف بنجاح.')
    }
  }

  // Filtered trainees
  const filteredTrainees = trainees.filter((t) => {
    if (!traineeSearch.trim()) return true
    const q = traineeSearch.toLowerCase()
    return t.name.toLowerCase().includes(q) || t.phone.includes(q) || t.code.toLowerCase().includes(q)
  })

  const trainerName = trainerData?.user.name || 'مدرب'
  const trainerCode = trainerData ? `TR-${trainerData.id.slice(0, 6)}` : ''
  const activeTraineesCount = trainees.filter((t) => t.status === 'active').length
  const activePercentage = trainees.length > 0 ? Math.round((activeTraineesCount / trainees.length) * 100) : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-cairo" dir="rtl">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-zinc-900 text-white shadow-2xl border border-gym-gold/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-gym-gold shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-zinc-400 hover:text-white mr-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
        <span
          onClick={() => navigate('/app/dashboard')}
          className="hover:text-zinc-800 cursor-pointer flex items-center gap-1"
        >
          <Home className="w-3.5 h-3.5" />
          لوحة التحكم
        </span>
        <ChevronLeft className="w-3 h-3 text-zinc-400" />
        <span
          onClick={() => navigate('/app/trainers')}
          className="hover:text-zinc-800 cursor-pointer"
        >
          المدربين
        </span>
        <ChevronLeft className="w-3 h-3 text-zinc-400" />
        <span className="text-zinc-900 font-bold">
          ملف المدرب: {trainerName} {trainerCode ? `(${trainerCode})` : ''}
        </span>
      </div>

      {/* Hero Profile Header Card with Golden Accent Top Line */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm overflow-hidden relative">
        <div className="h-1.5 w-full bg-[#8A6D1C]"></div>

        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            {/* Avatar with Camera Button */}
            <div className="relative shrink-0">
              <Avatar
                src={trainerData?.user.avatarUrl || undefined}
                name={trainerName}
                size="xl"
                className="w-20 h-20 text-2xl ring-2 ring-gym-gold/40 shadow-md shrink-0 border border-zinc-800"
              />
              <button
                type="button"
                onClick={() => triggerToast('فتح نافذة تغيير صورة المدرب...')}
                className="absolute -bottom-1 -left-1 w-7 h-7 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-full flex items-center justify-center hover:text-white shadow-sm"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
                  {trainerData?.user.name || 'مدرب'}
                </h1>
                <span className="bg-zinc-100 text-zinc-600 font-mono text-xs px-2.5 py-0.5 rounded-md border border-zinc-200/60">
                  {trainerCode || 'TR-0000'}
                </span>
                <span className="bg-[#FAF0D3] text-[#7E6517] text-xs font-bold px-3 py-0.5 rounded-full border border-[#ECD9A2]">
                  {trainerData?.specialization || 'تدريب عام'}
                </span>
                {(trainerData ? trainerData.user.isActive : trainerStatus === 'active') ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>نشط</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-xs font-semibold border border-zinc-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                    <span>معطل مؤقتاً</span>
                  </span>
                )}
              </div>

              {/* Contact meta row */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-600 mt-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-50 border border-zinc-200/80 font-mono shadow-2xs">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span dir="ltr">{trainerData?.user.phone || '—'}</span>
                  <span className="text-[10px] bg-zinc-200/80 px-1 py-0.2 rounded font-sans text-zinc-600">
                    مصر
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-50 border border-zinc-200/80 font-mono shadow-2xs" dir="ltr">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{trainerData?.user.email || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-50 border border-zinc-200/80 text-zinc-600 font-medium shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    انضم في: {formatDateClean(trainerData?.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isManagerOrOwner && (
            <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="px-5 py-2.5 bg-[#60490E] hover:bg-[#523e0c] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Edit3 className="w-4 h-4 text-[#F3D372]" />
                <span>تعديل البيانات</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  (trainerData ? trainerData.user.isActive : trainerStatus === 'active')
                    ? setSuspendModalOpen(true)
                    : setActivateModalOpen(true)
                }
                className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs sm:text-sm font-bold border border-zinc-200/80 flex items-center gap-2 transition-all shadow-2xs"
              >
                {(trainerData ? trainerData.user.isActive : trainerStatus === 'active') ? (
                  <>
                    <PauseCircle className="w-4 h-4 text-rose-600" />
                    <span>تعطيل المدرب</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4 text-emerald-600" />
                    <span>تفعيل المدرب</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: المتدربون الحاليون */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">المتدربون الحاليون</span>
            <div className="w-10 h-10 rounded-xl bg-[#FAF0D3] text-[#7E6517] flex items-center justify-center border border-[#ECD9A2]">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">{activeTraineesCount}</span>
            <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded border border-emerald-200">
              نشط الآن
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            {trainees.length > 0 ? `${activePercentage}% من إجمالي المتدربين المسندين` : 'لا يوجد متدربون مسجلون'}
          </p>
        </div>

        {/* Card 2: إجمالي المتدربين */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">إجمالي المتدربين</span>
            <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center border border-zinc-200/60">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-900 tracking-tight">{trainees.length}</span>
            <span className="text-[11px] text-zinc-400 font-semibold">مسجل</span>
          </div>
          <p className="text-[11px] text-zinc-400">إجمالي المتدربين المرتبطين بالنظام</p>
        </div>

        {/* Card 3: مدة العمل */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">تاريخ الالتحاق</span>
            <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center border border-zinc-200/60">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              {formatDateClean(trainerData?.createdAt)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            تاريخ اعتماد وتفعيل الحساب
          </p>
        </div>

        {/* Card 4: الحالة الإدارية */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">الحالة الإدارية</span>
            <div className="w-10 h-10 rounded-xl bg-[#FAF0D3] text-[#7E6517] flex items-center justify-center border border-[#ECD9A2]">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-2xl font-black tracking-tight ${
                (trainerData ? trainerData.user.isActive : trainerStatus === 'active')
                  ? 'text-emerald-600'
                  : 'text-zinc-500'
              }`}
            >
              {(trainerData ? trainerData.user.isActive : trainerStatus === 'active') ? 'نشط' : 'معطل'}
            </span>
            <span className="text-[11px] text-zinc-500 font-semibold">على رأس العمل</span>
          </div>
          <p className="text-[11px] text-zinc-400">صلاحية النظام سارية ومسجلة</p>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="bg-zinc-100 p-1.5 rounded-2xl flex items-center gap-2 max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'overview'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>نظرة عامة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trainees')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'trainees'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المتدربون</span>
          <span className="bg-[#FAF0D3] text-[#7E6517] text-[10px] font-black px-1.5 py-0.2 rounded-full border border-[#ECD9A2]">
            {trainees.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'history'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
          }`}
        >
          <History className="w-4 h-4" />
          <span>السجل والتحديثات</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW CONTENT (نظرة عامة) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Right Column (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: البيانات الشخصية */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-700" />
                  <h3 className="text-base font-extrabold text-zinc-900">البيانات الشخصية</h3>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  <span>نسخ الهاتف</span>
                </button>
              </div>

              {/* Data Blocks Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Full Name */}
                <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-3.5 space-y-1">
                  <span className="text-zinc-400 font-medium">الاسم الكامل</span>
                  <p className="text-sm font-bold text-zinc-900">{trainerData?.user.name || editName}</p>
                </div>

                {/* Main Phone */}
                <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-medium">رقم الهاتف الأساسي</span>
                    {trainerData?.user.phone && (
                      <a
                        href={`tel:${trainerData.user.phone}`}
                        className="text-amber-700 hover:underline font-bold text-[11px]"
                      >
                        اتصال مباشر
                      </a>
                    )}
                  </div>
                  <p className="text-sm font-mono font-bold text-zinc-900 text-left" dir="ltr">
                    {trainerData?.user.phone || editPhone || 'غير مسجل'}
                  </p>
                </div>

                {/* Status */}
                <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-3.5 space-y-1">
                  <span className="text-zinc-400 font-medium">حالة الحساب</span>
                  <p className="text-sm font-bold text-zinc-900">
                    {trainerData?.user.isActive ? 'نشط ومعتمد' : 'معطل مؤقتاً'}
                  </p>
                </div>

                {/* Email */}
                <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-3.5 space-y-1">
                  <span className="text-zinc-400 font-medium">البريد الإلكتروني المعتمد</span>
                  <p className="text-sm font-mono font-bold text-zinc-900">
                    {trainerData?.user.email || 'غير مسجل'}
                  </p>
                </div>

                {/* Join Date */}
                <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-3.5 space-y-1 sm:col-span-2">
                  <span className="text-zinc-400 font-medium">تاريخ الانضمام للنادي</span>
                  <p className="text-sm font-bold text-zinc-900">
                    {formatDateClean(trainerData?.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: البيانات المهنية والتخصص */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                <Dumbbell className="w-5 h-5 text-amber-700" />
                <h3 className="text-base font-extrabold text-zinc-900">
                  البيانات المهنية والتخصص
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Specialty */}
                <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-3.5 space-y-1">
                  <span className="text-zinc-400 font-medium">التخصص الرياضي</span>
                  <p className="text-sm font-bold text-zinc-900">
                    {trainerData?.specialization || editSpecialization || 'لياقة عامة وبناء أجسام'}
                  </p>
                </div>

                {/* Role status */}
                <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-3.5 space-y-1">
                  <span className="text-zinc-400 font-medium">حالة الاعتماد في النادي</span>
                  <p className="text-sm font-bold text-zinc-900">
                    {trainerData?.user.isActive ? 'مدرب معتمد (نشط)' : 'موقوف عن التدريب'}
                  </p>
                </div>
              </div>

              {/* Bio block */}
              <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-4 space-y-1.5 text-xs">
                <span className="text-zinc-400 font-bold block">نبذة وسيرة مهنية موجزة</span>
                <p className="text-zinc-700 leading-relaxed font-normal">
                  {trainerData?.bio || editBio || 'لا توجد نبذة مسجلة للمدرب حالياً.'}
                </p>
              </div>
            </div>
          </div>

          {/* Left Column (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card 1: إجراءات سريعة */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-extrabold text-zinc-900">إجراءات سريعة</h3>
              </div>

              <div className="space-y-2 pt-1">
                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => setEditModalOpen(true)}
                  className="w-full py-2.5 px-4 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[#F3D372]" />
                    <span>تعديل البيانات الأساسية</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-zinc-400" />
                </button>

                {/* Trainees Button */}
                <button
                  type="button"
                  onClick={() => setActiveTab('trainees')}
                  className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold flex items-center justify-between border border-zinc-200/80 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-zinc-600" />
                    <span>عرض المتدربين المسندين</span>
                  </div>
                  <span className="bg-[#FAF0D3] text-[#7E6517] text-[11px] font-bold px-2 py-0.5 rounded border border-[#ECD9A2]">
                    {trainees.length}
                  </span>
                </button>

                {/* Suspend Button */}
                <button
                  type="button"
                  onClick={() =>
                    trainerStatus === 'active'
                      ? setSuspendModalOpen(true)
                      : setActivateModalOpen(true)
                  }
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <PauseCircle className="w-4 h-4 text-rose-600" />
                  <span>
                    {trainerStatus === 'active' ? 'إيقاف المدرب مؤقتاً' : 'إعادة تفعيل المدرب'}
                  </span>
                </button>
              </div>
            </div>

            {/* Card 2: معلومات النظام والاعتماد */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-zinc-700" />
                <h3 className="text-sm font-extrabold text-zinc-900">معلومات النظام والاعتماد</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <span className="text-zinc-500">كود النظام المرجعي</span>
                  <span className="bg-zinc-100 text-zinc-800 font-mono font-bold px-2.5 py-0.5 rounded border border-zinc-200/60">
                    {trainerCode || 'TR-0001'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <span className="text-zinc-500">المنسق الإداري</span>
                  <span className="font-bold text-zinc-900">{user?.name || 'إدارة الصالة'}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <span className="text-zinc-500">تاريخ آخر تحديث</span>
                  <span className="font-bold text-zinc-800">
                    {trainerData?.updatedAt ? formatDateClean(trainerData.updatedAt) : 'حديثاً'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">حالة المتدربين</span>
                  <div className="flex items-center gap-1 font-bold text-emerald-600">
                    <span>{activeTraineesCount} نشط</span>
                    <span className="text-zinc-400 font-normal text-[11px]">(من إجمالي {trainees.length})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRAINEES CONTENT (المتدربون) */}
      {/* ========================================================================= */}
      {activeTab === 'trainees' && (
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm p-6 space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-zinc-900">
                المتدربون المسندون للكابتن {trainerName} ({filteredTrainees.length} متدرب)
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                متابعة الحضور، الاشتراكات الفعالة، وإمكانية إعادة التعيين لمدرب آخر.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={traineeSearch}
                  onChange={(e) => setTraineeSearch(e.target.value)}
                  placeholder="بحث في المتدربين..."
                  className="pl-4 pr-9 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                />
                <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                type="button"
                onClick={() => navigate('/app/members')}
                className="px-3.5 py-1.5 bg-[#F6D870] text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>إسناد متدرب</span>
              </button>
            </div>
          </div>

          {filteredTrainees.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-zinc-800">لا يوجد متدربين حالياً</h4>
              <p className="text-xs text-zinc-400 mt-1">
                يمكنك إسناد متدربين جدد لهذا المدرب من شاشة إدارة الأعضاء.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50/70 border-b border-zinc-200/80 text-zinc-500 font-bold">
                    <th className="py-3 px-4">المتدرب</th>
                    <th className="py-3 px-4">الهاتف</th>
                    <th className="py-3 px-4">الباقة التدريبية</th>
                    <th className="py-3 px-4 text-center">جلسات الحضور</th>
                    <th className="py-3 px-4">تاريخ الانضمام</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60">
                  {filteredTrainees.map((trainee) => (
                    <tr key={trainee.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-zinc-900">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={trainee.avatarUrl || undefined}
                            name={trainee.name}
                            size="sm"
                            className="border border-zinc-200 shadow-2xs shrink-0 ring-1 ring-zinc-100"
                          />
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-zinc-900">{trainee.name}</span>
                            <span className="font-mono text-[11px] font-bold bg-[#FAF0D3] text-[#7E6517] border border-[#ECD9A2] px-2 py-0.5 rounded-md shadow-2xs">
                              {trainee.code}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2" dir="ltr">
                          <span className="font-mono font-bold text-xs text-zinc-700">{trainee.phone}</span>
                          {trainee.phone && (
                            <div className="flex items-center gap-1">
                              <a
                                href={formatWhatsAppUrl(trainee.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition"
                                title="مراسلة عبر واتساب"
                              >
                                <WhatsAppSvg className="w-4 h-4 fill-emerald-600" />
                              </a>
                              <a
                                href={`tel:${trainee.phone}`}
                                className="p-1 rounded-md text-zinc-700 hover:bg-zinc-100 transition"
                                title="اتصال هاتفي"
                              >
                                <PhoneCallSvg className="w-4 h-4 text-zinc-700" />
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-zinc-800 bg-zinc-100 px-2.5 py-1 rounded-lg text-xs">
                          {trainee.plan}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-zinc-900 bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-md border border-amber-200 text-xs">
                          <span className="font-mono">{trainee.attendanceCount}</span> جلسة
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-700 font-semibold">{trainee.joinDate}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/app/members/${trainee.id}`)}
                            className="px-3 py-1 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-bold transition shadow-2xs"
                          >
                            الملف
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTrainee(trainee)
                              setReassignModalOpen(true)
                            }}
                            className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-bold transition border border-zinc-200"
                          >
                            نقل
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HISTORY & UPDATES (السجل والتحديثات) */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm p-6 space-y-5 animate-in fade-in">
          <div>
            <h3 className="text-base font-extrabold text-zinc-900">سجل النشاط والتحديثات</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              كافة التعديلات الإدارية وتغييرات الحالة والارتباطات الخاصة بالمدرب.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-zinc-900">اعتماد حساب المدرب ({trainerName}) بالنادي</p>
                <p className="text-zinc-500">تم تسجيل وتفعيل صلاحيات المدرب بنجاح تحت تخصص {trainerData?.specialization || 'تدريب عام'}.</p>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {formatDateClean(trainerData?.createdAt)}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-4 h-4 text-amber-700" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-zinc-900">إسناد قائمة المتدربين ({trainees.length} متدرب)</p>
                <p className="text-zinc-500">
                  {trainees.length > 0
                    ? `متاح للمدرب متابعة المتدربين: ${trainees.map((t) => t.name).slice(0, 3).join('، ')}${trainees.length > 3 ? ' وغيرهم' : ''}.`
                    : 'لم يتم إسناد متدربين للمدرب حتى الآن.'}
                </p>
                <span className="text-[11px] text-zinc-400 font-mono">سجل حي ومحدث</span>
              </div>
            </div>

            {trainerData?.updatedAt && trainerData.updatedAt !== trainerData.createdAt && (
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-zinc-900">تحديث الملف والبيانات الإدارية</p>
                  <p className="text-zinc-500">تم تعديل وتحديث بيانات المدرب بالصالة.</p>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {formatDateClean(trainerData.updatedAt)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Suspend Trainer Modal */}
      {/* ========================================================================= */}
      {suspendModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <PauseCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-zinc-900">
                تأكيد إيقاف حساب المدرب ({trainerName})
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                سيؤدي الإيقاف إلى منع تسجيل دخول المدرب وتعليق استقبال أي متدربين جدد.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-zinc-800">سبب الإيقاف المؤقت:</label>
              <select className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white">
                <option>إجازة سنوية / راحة</option>
                <option>إجازة مرضية</option>
                <option>إجراء إداري مؤقت</option>
              </select>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSuspendModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  try {
                    setIsSaving(true)
                    if (id) {
                      await trainersApi.updateStatus(id, false)
                    }
                    setTrainerStatus('suspended')
                    setSuspendModalOpen(false)
                    triggerToast('تم إيقاف حساب المدرب بنجاح.')
                    await loadTrainer()
                  } catch {
                    triggerToast('حدث خطأ أثناء إيقاف المدرب')
                  } finally {
                    setIsSaving(false)
                  }
                }}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'جاري التنفيذ...' : 'تأكيد الإيقاف'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Activate Trainer Modal */}
      {/* ========================================================================= */}
      {activateModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <PlayCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-zinc-900">
                إعادة تفعيل حساب المدرب ({trainerData?.user.name || 'المدرب'})
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                سيتم إعادة تنشيط الصلاحيات وإتاحة المدرب لإسناد متدربين جدد.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActivateModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  try {
                    setIsSaving(true)
                    if (id) {
                      await trainersApi.updateStatus(id, true)
                    }
                    setTrainerStatus('active')
                    setActivateModalOpen(false)
                    triggerToast('تم تفعيل حساب المدرب بنجاح.')
                    await loadTrainer()
                  } catch {
                    triggerToast('حدث خطأ أثناء تفعيل المدرب')
                  } finally {
                    setIsSaving(false)
                  }
                }}
                className="px-6 py-2.5 rounded-xl bg-[#60490E] hover:bg-[#523e0c] text-white text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'جاري التفعيل...' : 'تأكيد التفعيل'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Reassign Trainee Modal */}
      {/* ========================================================================= */}
      {reassignModalOpen && selectedTrainee && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#8C6D1F]" />
                <h3 className="text-base font-bold text-zinc-900">إعادة تعيين المتدرب</h3>
              </div>
              <button
                onClick={() => setReassignModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-600">
              نقل المتدرب <span className="font-bold text-zinc-900">{selectedTrainee.name}</span> إلى
              مدرب آخر:
            </p>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-zinc-800">اختر المدرب البديل:</label>
              <select className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white">
                <option>كريم عبد العزيز (كمال أجسام)</option>
                <option>خالد حسن المنشاوي (كارديو)</option>
                <option>عمرو خالد الشريف (تدريب شخصي PT)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setReassignModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setTrainees((prev) => prev.filter((t) => t.id !== selectedTrainee.id))
                  setReassignModalOpen(false)
                  triggerToast(`تم نقل المتدرب ${selectedTrainee.name} بنجاح.`)
                }}
                className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold"
              >
                تأكيد النقل
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Edit Trainer Modal */}
      {/* ========================================================================= */}
      {editModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#8C6D1F]" />
                <h3 className="text-base font-bold text-zinc-900">تعديل بيانات المدرب</h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-800">الاسم الكامل</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-800">رقم الهاتف</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-left font-mono"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-zinc-800">التخصص</label>
                <input
                  type="text"
                  value={editSpecialization}
                  onChange={(e) => setEditSpecialization(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-zinc-800">نبذة تعريفية (Bio)</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-zinc-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  try {
                    setIsSaving(true)
                    if (id) {
                      await trainersApi.update(id, {
                        name: editName,
                        phone: editPhone || undefined,
                        specialization: editSpecialization || undefined,
                        bio: editBio || undefined,
                      })
                    }
                    setEditModalOpen(false)
                    triggerToast('تم حفظ التعديلات بنجاح!')
                    await loadTrainer()
                  } catch {
                    triggerToast('حدث خطأ أثناء حفظ التعديلات')
                  } finally {
                    setIsSaving(false)
                  }
                }}
                className="px-5 py-2 rounded-xl bg-[#60490E] hover:bg-[#523e0c] text-white text-xs font-bold disabled:opacity-50"
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default TrainerDetailPage
