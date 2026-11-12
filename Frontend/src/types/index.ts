/**
 * User roles in GymVIP
 */
export type UserRole = 'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'TRAINER'

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'مالك الصالة',
  MANAGER: 'مدير',
  RECEPTIONIST: 'موظف استقبال',
  TRAINER: 'مدرب',
}

/**
 * Egyptian Market Payment Methods (V1 Scope)
 */
export type PaymentMethod = 'CASH' | 'E_WALLET'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'نقدي (كاش)',
  E_WALLET: 'محفظة إلكترونية (فودافون كاش / إنستاباي / أخرى)',
}

/**
 * Basic User Profile
 */
export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  avatarUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Auth Context State
 */
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

/**
 * Common Member Status
 */
export type MemberStatus = 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'INACTIVE'

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIVE: 'نشط',
  EXPIRED: 'منتهي',
  FROZEN: 'مجمد',
  INACTIVE: 'غير نشط',
}

/**
 * Common Subscription Status
 */
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED' | 'PENDING'

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'ساري',
  EXPIRED: 'منتهي',
  FROZEN: 'مجمد',
  CANCELLED: 'ملغي',
  PENDING: 'قيد الانتظار',
}

/**
 * Payment Status
 */
export type PaymentStatus = 'COMPLETED' | 'PARTIAL' | 'REFUNDED' | 'PENDING'

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  COMPLETED: 'مكتمل',
  PARTIAL: 'مدفوع جزئياً',
  REFUNDED: 'مسترد',
  PENDING: 'معلق',
}

/**
 * Attendance Status
 */
export type AttendanceStatus = 'PRESENT' | 'CHECKED_OUT' | 'ABSENT'

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'حاضر',
  CHECKED_OUT: 'تم الخروج',
  ABSENT: 'غائب',
}

/**
 * Pagination Meta
 */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/**
 * Standard API Response envelope
 */
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  meta?: PaginationMeta
  errors?: Record<string, string[]>
}
