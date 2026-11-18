import { z } from 'zod'
import { Role } from '@prisma/client'
import { normalizeEgyptianPhone } from './member.validator.js'

const EGYPTIAN_PHONE_REGEX = /^01[0125][0-9]{8}$/

export const createUserSchema = z.object({
  name: z
    .string({ required_error: 'اسم المستخدم مطلوب / Name is required' })
    .trim()
    .min(2, 'يجب أن يتكون الاسم من حرفين على الأقل / Name must be at least 2 characters')
    .max(100, 'الاسم طويل جداً (الحد الأقصى 100 حرف)'),
  email: z
    .string({ required_error: 'البريد الإلكتروني مطلوب / Email is required' })
    .trim()
    .email('صيغة البريد الإلكتروني غير صحيحة / Invalid email format')
    .toLowerCase(),
  phone: z
    .any()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || String(val).trim() === '') return null
      return normalizeEgyptianPhone(val)
    })
    .pipe(
      z
        .string()
        .regex(
          EGYPTIAN_PHONE_REGEX,
          'يرجى إدخال رقم هاتف محمول مصري صحيح (مثال: 01012345678) / Invalid Egyptian phone number'
        )
        .nullable()
        .optional()
    ),
  role: z.nativeEnum(Role, {
    errorMap: (issue) => {
      if (issue.code === 'invalid_type') {
        return { message: 'الدور الوظيفي مطلوب / Role is required' }
      }
      return { message: 'الدور الوظيفي المحدد غير صالح' }
    },
  }),
  password: z
    .string({ required_error: 'كلمة المرور مطلوبة / Password is required' })
    .min(8, 'كلمة المرور يجب أن لا تقل عن 8 أحرف / Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-zA-Z])(?=.*[0-9])/,
      'يجب أن تحتوي كلمة المرور على أحرف وأرقام معاً / Password must contain both letters and numbers'
    ),
  avatarUrl: z.string().optional().nullable().or(z.literal('')),
})

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'يجب أن يتكون الاسم من حرفين على الأقل / Name must be at least 2 characters')
    .max(100, 'الاسم طويل جداً')
    .optional(),
  phone: z
    .any()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || String(val).trim() === '') return null
      return normalizeEgyptianPhone(val)
    })
    .pipe(
      z
        .string()
        .regex(
          EGYPTIAN_PHONE_REGEX,
          'يرجى إدخال رقم هاتف محمول مصري صحيح (مثال: 01012345678) / Invalid Egyptian phone number'
        )
        .nullable()
        .optional()
    ),
  avatarUrl: z.string().optional().nullable().or(z.literal('')),
  role: z.nativeEnum(Role).optional(),
})

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({
    required_error: 'حالة الحساب مطلوبة / isActive boolean is required',
  }),
})

export const resetUserPasswordSchema = z.object({
  newPassword: z
    .string({ required_error: 'كلمة المرور الجديدة مطلوبة / New password is required' })
    .min(8, 'كلمة المرور يجب أن لا تقل عن 8 أحرف / Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-zA-Z])(?=.*[0-9])/,
      'يجب أن تحتوي كلمة المرور على أحرف وأرقام معاً / Password must contain both letters and numbers'
    ),
})

export const userQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateUserInput = z.output<typeof createUserSchema>
export type UpdateUserInput = z.output<typeof updateUserSchema>
export type UpdateUserStatusInput = z.output<typeof updateUserStatusSchema>
export type ResetUserPasswordInput = z.output<typeof resetUserPasswordSchema>
export type UserQueryParams = z.output<typeof userQuerySchema>
