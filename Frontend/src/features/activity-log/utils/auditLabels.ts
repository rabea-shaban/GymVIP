import type { UserRole } from '../types'
import type { BadgeVariant } from '@/components/ui/Badge'

export const AUDIT_ACTION_MAP: Record<
  string,
  { label: string; variant: BadgeVariant }
> = {
  // Auth
  LOGIN_SUCCESS: { label: 'تسجيل دخول ناجح', variant: 'success' },
  LOGIN_FAILED: { label: 'محاولة دخول فاشلة', variant: 'error' },
  LOGOUT: { label: 'تسجيل خروج', variant: 'neutral' },

  // User
  USER_CREATED: { label: 'إنشاء مستخدم', variant: 'success' },
  USER_UPDATED: { label: 'تعديل مستخدم', variant: 'info' },
  USER_ACTIVATED: { label: 'تفعيل مستخدم', variant: 'success' },
  USER_DEACTIVATED: { label: 'تعطيل مستخدم', variant: 'warning' },
  USER_PASSWORD_RESET: { label: 'إعادة تعيين كلمة المرور', variant: 'warning' },

  // Member
  MEMBER_CREATED: { label: 'تسجيل عضو جديد', variant: 'success' },
  MEMBER_UPDATED: { label: 'تعديل بيانات عضو', variant: 'info' },
  MEMBER_ACTIVATED: { label: 'تفعيل عضو', variant: 'success' },
  MEMBER_DEACTIVATED: { label: 'تعطيل عضو', variant: 'warning' },

  // Plan
  PLAN_CREATED: { label: 'إنشاء باقة', variant: 'success' },
  PLAN_UPDATED: { label: 'تعديل باقة', variant: 'info' },
  PLAN_ACTIVATED: { label: 'تفعيل باقة', variant: 'success' },
  PLAN_DEACTIVATED: { label: 'تعطيل باقة', variant: 'warning' },

  // Subscription
  SUBSCRIPTION_CREATED: { label: 'اشتراك جديد', variant: 'success' },
  SUBSCRIPTION_FROZEN: { label: 'تجميد اشتراك', variant: 'warning' },
  SUBSCRIPTION_RENEWED: { label: 'تجديد اشتراك', variant: 'success' },

  // Payment
  PAYMENT_RECEIVED: { label: 'تحصيل دفعة مالية', variant: 'success' },

  // Attendance
  ATTENDANCE_CHECK_IN: { label: 'تسجيل حضور', variant: 'info' },
  ATTENDANCE_CHECK_OUT: { label: 'تسجيل انصراف', variant: 'neutral' },

  // Trainer
  TRAINER_CREATED: { label: 'إضافة مدرب', variant: 'success' },
  TRAINER_UPDATED: { label: 'تعديل بيانات مدرب', variant: 'info' },
  TRAINER_ACTIVATED: { label: 'تفعيل مدرب', variant: 'success' },
  TRAINER_DEACTIVATED: { label: 'تعطيل مدرب', variant: 'warning' },

  // Gym
  GYM_SETTINGS_UPDATED: { label: 'تحديث إعدادات النادي', variant: 'info' },
}

export const AUDIT_ENTITY_MAP: Record<string, string> = {
  USER: 'مستخدم / موظف',
  MEMBER: 'عضو',
  PLAN: 'باقة اشتراك',
  SUBSCRIPTION: 'اشتراك',
  PAYMENT: 'دفعة مالية',
  ATTENDANCE: 'حضور وانصراف',
  TRAINER: 'مدرب',
  GYM: 'إعدادات النادي',
  AUTH: 'أمان وتسجيل دخول',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'مالك النادي',
  MANAGER: 'مدير',
  RECEPTIONIST: 'موظف استقبال',
  TRAINER: 'مدرب',
}

export const ROLE_BADGE_VARIANTS: Record<UserRole, BadgeVariant> = {
  OWNER: 'gold',
  MANAGER: 'neutral',
  RECEPTIONIST: 'neutral',
  TRAINER: 'outline',
}

/**
 * Formats a Date/timestamp into Egyptian Arabic format with Cairo timezone
 */
export function formatCairoDateTime(dateStr: string | Date): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return String(dateStr)

    return new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  } catch {
    return String(dateStr)
  }
}
