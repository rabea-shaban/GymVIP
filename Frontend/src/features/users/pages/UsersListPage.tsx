import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  RotateCcw,
  ChevronLeft,
  Shield,
  Trash2,
  PauseCircle,
  PlayCircle,
  KeyRound,
  CheckCircle2,
  Crown,
  Dumbbell,
  Receipt,
  X,
  Edit3,
  Check,
  ShieldCheck,
} from 'lucide-react'
import { usersApi } from '@/features/users/services/usersApi'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useToast } from '@/components/feedback/Toast'

export type SystemUserRole = 'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'TRAINER'

export interface SystemUser {
  id: string
  code: string
  name: string
  initials: string
  avatarBg: string
  avatarText: string
  email: string
  phone?: string | null
  isVerified?: boolean
  role: SystemUserRole
  roleLabel: string
  lastLogin: string
  createdAt: string
  status: 'active' | 'inactive'
}

export const UsersListPage: React.FC = () => {
  const { user: currentUser } = useAuth()
  const toast = useToast()

  // Users Data State
  const [users, setUsers] = useState<SystemUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Selected User for Modals & Drawer
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [toggleModalOpen, setToggleModalOpen] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add Form State
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addRole, setAddRole] = useState<SystemUserRole>('RECEPTIONIST')
  const [addPassword, setAddPassword] = useState('GymVIP@2026')

  // Edit Form State
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState<SystemUserRole>('RECEPTIONIST')

  // Role Form State
  const [roleChoice, setRoleChoice] = useState<SystemUserRole>('RECEPTIONIST')

  // Password Reset State
  const [newPassword, setNewPassword] = useState('')

  // Fetch real users from API
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await usersApi.list({
        search: searchQuery || undefined,
        role: roleFilter !== 'all' ? (roleFilter as SystemUserRole) : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      })
      if (res.users) {
        const mapped: SystemUser[] = res.users.map((u, idx) => ({
          id: u.id,
          code: `VIP-USR-${String(idx + 1).padStart(3, '0')}`,
          name: u.name,
          initials: u.name.slice(0, 2),
          avatarBg: u.role === 'OWNER' || u.role === 'MANAGER' ? 'bg-zinc-950' : 'bg-cyan-100',
          avatarText: u.role === 'OWNER' || u.role === 'MANAGER' ? 'text-white' : 'text-cyan-800',
          email: u.email,
          phone: u.phone,
          role: u.role,
          roleLabel:
            u.role === 'OWNER'
              ? 'صاحب الجيم'
              : u.role === 'MANAGER'
              ? 'مدير'
              : u.role === 'RECEPTIONIST'
              ? 'موظف استقبال'
              : 'مدرب',
          lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('ar-EG') : 'لم يسجل دخول',
          createdAt: new Date(u.createdAt).toLocaleDateString('ar-EG'),
          status: u.isActive ? 'active' : 'inactive',
        }))
        setUsers(mapped)
      }
    } catch {
      toast.error('تعذر جلب قائمة المستخدمين من الخادم')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, roleFilter, statusFilter, toast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Open Edit Modal with prepopulated values
  const handleOpenEdit = (user: SystemUser) => {
    setSelectedUser(user)
    setEditName(user.name)
    setEditPhone(user.phone || '')
    setEditRole(user.role)
    setEditModalOpen(true)
    setActiveMenuId(null)
  }

  // Open Role Modal with prepopulated values
  const handleOpenRole = (user: SystemUser) => {
    setSelectedUser(user)
    setRoleChoice(user.role)
    setRoleModalOpen(true)
    setActiveMenuId(null)
  }

  // Open Reset Password Modal
  const handleOpenReset = (user: SystemUser) => {
    setSelectedUser(user)
    setNewPassword('GymVIP@2026')
    setResetModalOpen(true)
    setActiveMenuId(null)
  }

  // Submit Add User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addName.trim() || !addEmail.trim() || !addPassword.trim()) {
      toast.error('يرجى ملء جميع الحقول الإلزامية')
      return
    }

    try {
      setIsSubmitting(true)
      await usersApi.create({
        name: addName.trim(),
        email: addEmail.trim(),
        phone: addPhone.trim() || undefined,
        role: addRole,
        password: addPassword.trim(),
      })
      toast.success('تم إنشاء حساب المستخدم بنجاح')
      setAddModalOpen(false)
      setAddName('')
      setAddEmail('')
      setAddPhone('')
      setAddRole('RECEPTIONIST')
      setAddPassword('GymVIP@2026')
      fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'فشل إنشاء المستخدم')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Edit User
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    if (!editName.trim()) {
      toast.error('الاسم مطلوب')
      return
    }

    try {
      setIsSubmitting(true)
      await usersApi.update(selectedUser.id, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        role: editRole,
      })
      toast.success('تم تحديث بيانات المستخدم بنجاح')
      setEditModalOpen(false)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'فشل تحديث بيانات المستخدم')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Role Change
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    try {
      setIsSubmitting(true)
      await usersApi.update(selectedUser.id, {
        role: roleChoice,
      })
      toast.success('تم تحديث دور وصلاحيات المستخدم بنجاح')
      setRoleModalOpen(false)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'فشل تغيير الصلاحيات')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Password Reset
  const handleSavePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    if (!newPassword.trim()) {
      toast.error('يرجى إدخال كلمة المرور الجديدة')
      return
    }

    try {
      setIsSubmitting(true)
      await usersApi.resetPassword(selectedUser.id, newPassword.trim())
      toast.success('تم إعادة تعيين كلمة المرور بنجاح')
      setResetModalOpen(false)
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'فشل إعادة تعيين كلمة المرور')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle user active status
  const handleToggleUserStatus = async (targetUser: SystemUser) => {
    const nextStatus = targetUser.status !== 'active'
    try {
      setIsSubmitting(true)
      await usersApi.updateStatus(targetUser.id, nextStatus)
      toast.success(nextStatus ? 'تم تفعيل حساب المستخدم بنجاح' : 'تم تعطيل حساب المستخدم بنجاح')
      setToggleModalOpen(false)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'فشل تحديث حالة الحساب')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete user
  const handleDeleteUser = async (targetUser: SystemUser) => {
    if (targetUser.role === 'OWNER') {
      toast.error('لا يمكن حذف حساب صاحب الجيم والمالك الرئيسي.')
      return
    }
    try {
      setIsSubmitting(true)
      await usersApi.delete(targetUser.id)
      toast.success(`تم حذف المستخدم ${targetUser.name} بنجاح من النظام.`)
      setDeleteModalOpen(false)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'فشل حذف المستخدم')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = u.name.toLowerCase().includes(q)
        const matchEmail = u.email.toLowerCase().includes(q)
        const matchCode = u.code.toLowerCase().includes(q)
        if (!matchName && !matchEmail && !matchCode) return false
      }
      if (statusFilter !== 'all' && u.status !== statusFilter) return false
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      return true
    })
  }, [users, searchQuery, statusFilter, roleFilter])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-cairo" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1 font-medium">
            <span>لوحة التحكم</span>
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-900 font-bold">إدارة فريق العمل والمستخدمين</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
            فريق العمل والمستخدمين
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            إدارة حسابات الموظفين والمدربين، وتعيين الصلاحيات، وضبط كلمات المرور وحالات التفعيل.
          </p>
        </div>

        {(currentUser?.role === 'OWNER' || currentUser?.role === 'MANAGER') && (
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gym-gold hover:bg-gym-gold-light text-zinc-950 text-xs sm:text-sm font-black transition-all shadow-2xs active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4 stroke-[3]" />
            <span>+ إضافة مستخدم جديد</span>
          </button>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs">
          <p className="text-xs font-bold text-zinc-500">إجمالي الموظفين</p>
          <h3 className="text-2xl font-black text-zinc-950 mt-1">{users.length}</h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">في جميع الأدوار</p>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs">
          <p className="text-xs font-bold text-zinc-500">الحسابات المفعلة</p>
          <h3 className="text-2xl font-black text-emerald-700 mt-1">
            {users.filter((u) => u.status === 'active').length}
          </h3>
          <p className="text-[11px] text-emerald-600 font-bold mt-0.5">جاهزون للعمل</p>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs">
          <p className="text-xs font-bold text-zinc-500">موظفو الاستقبال</p>
          <h3 className="text-2xl font-black text-zinc-950 mt-1">
            {users.filter((u) => u.role === 'RECEPTIONIST').length}
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">مكتب الاستقبال</p>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs">
          <p className="text-xs font-bold text-zinc-500">المدربون</p>
          <h3 className="text-2xl font-black text-zinc-950 mt-1">
            {users.filter((u) => u.role === 'TRAINER').length}
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">صالات التدريب</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-3.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، البريد الإلكتروني، أو الكود..."
                className="w-full pr-10 pl-4 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-zinc-900 focus:outline-none transition-all placeholder:text-zinc-400"
              />
            </div>

            <div className="w-full sm:w-44">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:bg-white focus:border-zinc-900 focus:outline-none transition-all cursor-pointer font-bold"
              >
                <option value="all">جميع الأدوار</option>
                <option value="OWNER">صاحب الجيم</option>
                <option value="MANAGER">مدير</option>
                <option value="RECEPTIONIST">موظف استقبال</option>
                <option value="TRAINER">مدرب</option>
              </select>
            </div>

            <div className="w-full sm:w-36">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:bg-white focus:border-zinc-900 focus:outline-none transition-all cursor-pointer font-bold"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">معطل</option>
              </select>
            </div>

            <button
              onClick={() => {
                setSearchQuery('')
                setRoleFilter('all')
                setStatusFilter('all')
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-xs sm:text-sm font-bold hover:bg-zinc-50 transition-colors shrink-0"
              title="إعادة ضبط الفلاتر"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
              <span>إعادة ضبط</span>
            </button>
          </div>

          <div className="text-xs font-bold text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-xl self-end sm:self-center">
            إجمالي {filteredUsers.length} مستخدم
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-3 animate-pulse">
            <div className="w-8 h-8 border-3 border-gym-gold border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-zinc-500">جاري تحميل قائمة المستخدمين...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1">
              {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد مستخدمون مسجلون'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mb-6">
              {searchQuery
                ? `لم يتم العثور على أي مستخدم يطابق "${searchQuery}".`
                : 'أضف أول موظف استقبال أو مدرب لفريق عمل الجيم.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-zinc-50/90 border-b border-zinc-200/80 text-zinc-500 font-bold">
                <tr>
                  <th className="py-3.5 px-4">المستخدم</th>
                  <th className="py-3.5 px-4">الدور الوظيفي</th>
                  <th className="py-3.5 px-4">رقم الهاتف</th>
                  <th className="py-3.5 px-4">آخر دخول</th>
                  <th className="py-3.5 px-4">تاريخ الإنشاء</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${u.avatarBg} ${u.avatarText}`}
                        >
                          {u.initials}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-950 text-xs sm:text-sm">{u.name}</div>
                          <div className="text-[11px] text-zinc-400 font-mono" dir="ltr">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                          u.role === 'OWNER'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                            : u.role === 'MANAGER'
                            ? 'bg-purple-50 text-purple-900 border border-purple-200'
                            : u.role === 'RECEPTIONIST'
                            ? 'bg-blue-50 text-blue-900 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        }`}
                      >
                        {u.role === 'OWNER' && <Crown className="w-3.5 h-3.5 text-amber-600" />}
                        {u.role === 'MANAGER' && <Shield className="w-3.5 h-3.5 text-purple-600" />}
                        {u.role === 'RECEPTIONIST' && <Receipt className="w-3.5 h-3.5 text-blue-600" />}
                        {u.role === 'TRAINER' && <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />}
                        <span>{u.roleLabel}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-zinc-600" dir="ltr">
                      {u.phone || '—'}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-zinc-500 text-[11px]">
                      {u.lastLogin}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-zinc-500 text-[11px]">
                      {u.createdAt}
                    </td>

                    <td className="py-3.5 px-4">
                      {u.status === 'active' ? (
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

                    <td className="py-3.5 px-4 text-center">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === u.id ? null : u.id)}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === u.id && (
                          <div className="absolute left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-zinc-100 py-1.5 z-30 text-right text-xs font-bold animate-in fade-in zoom-in-95">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(u)
                                setDrawerOpen(true)
                                setActiveMenuId(null)
                              }}
                              className="w-full px-3 py-2 hover:bg-zinc-50 flex items-center gap-2 text-zinc-700"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                              <span>عرض الصلاحيات</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(u)}
                              className="w-full px-3 py-2 hover:bg-zinc-50 flex items-center gap-2 text-zinc-700"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                              <span>تعديل البيانات</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenRole(u)}
                              className="w-full px-3 py-2 hover:bg-zinc-50 flex items-center gap-2 text-zinc-700"
                            >
                              <Shield className="w-3.5 h-3.5 text-zinc-400" />
                              <span>تغيير الدور الوظيفي</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenReset(u)}
                              className="w-full px-3 py-2 hover:bg-zinc-50 flex items-center gap-2 text-zinc-700"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                              <span>إعادة تعيين كلمة المرور</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(u)
                                setToggleModalOpen(true)
                                setActiveMenuId(null)
                              }}
                              className="w-full px-3 py-2 hover:bg-zinc-50 flex items-center gap-2 text-zinc-700"
                            >
                              {u.status === 'active' ? (
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

                            {u.role !== 'OWNER' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUser(u)
                                  setDeleteModalOpen(true)
                                  setActiveMenuId(null)
                                }}
                                className="w-full px-3 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600 border-t border-zinc-100"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>حذف الحساب</span>
                              </button>
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

      {/* DRAWER: User Details & Permissions */}
      {drawerOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-start bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto space-y-6 text-right animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-gym-gold-dark" />
                <h3 className="text-base font-extrabold text-zinc-900">بيانات وصلاحيات المستخدم</h3>
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
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg ${selectedUser.avatarBg} ${selectedUser.avatarText}`}
              >
                {selectedUser.initials}
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-zinc-900">{selectedUser.name}</h4>
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                  <span>{selectedUser.code}</span>
                  <span>•</span>
                  <span>{selectedUser.roleLabel}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80">
                <span className="text-zinc-400">آخر تسجيل دخول:</span>
                <p className="text-xs font-bold text-zinc-900 mt-1">{selectedUser.lastLogin}</p>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80">
                <span className="text-zinc-400">حالة الحساب:</span>
                <p
                  className={`text-xs font-bold mt-1 ${
                    selectedUser.status === 'active' ? 'text-emerald-700' : 'text-zinc-500'
                  }`}
                >
                  {selectedUser.status === 'active' ? 'نشط ومفعل' : 'معطل مؤقتاً'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-bold text-zinc-800">مصفوفة الصلاحيات الممنوحة:</h5>
              <div className="space-y-2 text-xs">
                {[
                  { section: 'إدارة الأعضاء والاشتراكات', granted: true },
                  {
                    section: 'العمليات المالية والدفعات',
                    granted: selectedUser.role === 'OWNER' || selectedUser.role === 'MANAGER',
                  },
                  { section: 'تسجيل الحضور والبوابات', granted: true },
                  {
                    section: 'التقارير والإحصائيات الإدارية',
                    granted: selectedUser.role === 'OWNER' || selectedUser.role === 'MANAGER',
                  },
                  {
                    section: 'إعدادات النظام والمستخدمين',
                    granted: selectedUser.role === 'OWNER',
                  },
                ].map((perm, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 flex items-center justify-between"
                  >
                    <span className="text-zinc-700 font-medium">{perm.section}</span>
                    {perm.granted ? (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                        مفعلة
                      </span>
                    ) : (
                      <span className="bg-zinc-100 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded">
                        غير مصرح
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false)
                  handleOpenRole(selectedUser)
                }}
                className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4 text-gym-gold" />
                <span>تعديل الصلاحيات والدور</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Add New User Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-gym-gold-dark" />
                <h3 className="text-base font-bold text-zinc-900">إضافة مستخدم جديد للنظام</h3>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-800">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="مثال: حسام علي"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-bold focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-800">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="name@gymvip.com"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-left font-mono focus:bg-white focus:outline-none focus:border-zinc-900"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-800">رقم الهاتف</label>
                  <input
                    type="text"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-left font-mono focus:bg-white focus:outline-none focus:border-zinc-900"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-800">الدور الوظيفي *</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as SystemUserRole)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-bold focus:bg-white focus:outline-none focus:border-zinc-900"
                  >
                    <option value="RECEPTIONIST">موظف استقبال</option>
                    <option value="TRAINER">مدرب</option>
                    <option value="MANAGER">مدير فرع</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-zinc-800">كلمة المرور المؤقتة *</label>
                  <input
                    type="text"
                    required
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-left font-mono font-bold focus:bg-white focus:outline-none focus:border-zinc-900"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gym-gold hover:bg-gym-gold-light text-zinc-950 text-xs font-black flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ وإنشاء الحساب'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Reset Password Modal */}
      {resetModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-zinc-900">
                إعادة تعيين كلمة المرور ({selectedUser.name})
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                أدخل كلمة المرور الجديدة لحساب ({selectedUser.email}).
              </p>
            </div>

            <form onSubmit={handleSavePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">كلمة المرور الجديدة</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-left font-mono font-bold"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري التعيين...' : 'تأكيد التعيين'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Toggle Status Modal */}
      {toggleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <PauseCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-zinc-900">
                {selectedUser.status === 'active'
                  ? `هل تريد تعطيل حساب المستخدم ${selectedUser.name}؟`
                  : `هل تريد تفعيل حساب المستخدم ${selectedUser.name}؟`}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {selectedUser.status === 'active'
                  ? 'سيتم حظر تسجيل الدخول مؤقتاً لهذا المستخدم وتعليق كافة صلاحياته.'
                  : 'سيتم إعادة تفعيل الحساب وإتاحة الوصول للنظام مجدداً.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setToggleModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleToggleUserStatus(selectedUser)}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {isSubmitting
                  ? 'جاري التنفيذ...'
                  : selectedUser.status === 'active'
                  ? 'تأكيد التعطيل'
                  : 'تأكيد التفعيل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete User Modal */}
      {deleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-zinc-900">
                تأكيد حذف حساب ({selectedUser.name})؟
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                سيتم حذف حساب المستخدم نهائياً من سجل الصلاحيات. في حال وجود سجلات مالية مسجلة باسمه، يرجى تعطيل الحساب بدلاً من الحذف.
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
                onClick={() => handleDeleteUser(selectedUser)}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Edit User Modal */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-gym-gold-dark" />
                <h3 className="text-base font-bold text-zinc-900">تعديل بيانات المستخدم ({selectedUser.name})</h3>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-zinc-800 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-bold focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-800 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-left font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-800 mb-1">الدور الوظيفي</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as SystemUserRole)}
                  disabled={selectedUser.role === 'OWNER'}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-bold disabled:opacity-50"
                >
                  {selectedUser.role === 'OWNER' && <option value="OWNER">صاحب الجيم</option>}
                  <option value="RECEPTIONIST">موظف استقبال</option>
                  <option value="TRAINER">مدرب</option>
                  <option value="MANAGER">مدير فرع</option>
                </select>
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
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Change Role Modal */}
      {roleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 text-right space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-gym-gold-dark" />
                <h3 className="text-base font-bold text-zinc-900">تغيير الدور والصلاحيات</h3>
              </div>
              <button onClick={() => setRoleModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
              <p className="text-zinc-600">
                تحديد مستوى الصلاحيات الجديد لحساب <span className="font-bold text-zinc-900">{selectedUser.name}</span>:
              </p>
              <div className="space-y-2">
                <label className="font-bold text-zinc-800">الدور الجديد:</label>
                <select
                  value={roleChoice}
                  onChange={(e) => setRoleChoice(e.target.value as SystemUserRole)}
                  disabled={selectedUser.role === 'OWNER'}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-bold disabled:opacity-50"
                >
                  {selectedUser.role === 'OWNER' && <option value="OWNER">صاحب الجيم</option>}
                  <option value="MANAGER">مدير فرع</option>
                  <option value="RECEPTIONIST">موظف استقبال</option>
                  <option value="TRAINER">مدرب</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedUser.role === 'OWNER'}
                  className="px-5 py-2 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'تأكيد التغيير'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersListPage
