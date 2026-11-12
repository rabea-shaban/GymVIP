import { z } from 'zod'
import { Gender } from '@prisma/client'

const EGYPTIAN_PHONE_REGEX = /^(?:\+?20|0020)?0?1[0125][0-9]{8}$/

const dateOfBirthSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .or(z.literal(''))
  .refine(
    (val) => {
      if (!val) return true
      const parsed = new Date(val)
      if (isNaN(parsed.getTime())) return false
      // Must not be in the future
      return parsed <= new Date()
    },
    {
      message: 'تاريخ الميلاد غير صالح أو يقع في المستقبل / Date of birth must not be in the future',
    }
  )

export const createMemberSchema = z.object({
  name: z
    .string({ required_error: 'اسم العضو مطلوب / Member name is required' })
    .trim()
    .min(2, 'يجب أن يتكون اسم العضو من حرفين على الأقل / Name must be at least 2 characters')
    .max(100, 'اسم العضو طويل جداً (الحد الأقصى 100 حرف)'),
  phone: z
    .string({ required_error: 'رقم الهاتف مطلوب / Phone number is required' })
    .trim()
    .regex(
      EGYPTIAN_PHONE_REGEX,
      'يرجى إدخال رقم هاتف محمول مصري صحيح (مثال: 01012345678) / Invalid Egyptian phone number'
    ),
  email: z
    .string()
    .trim()
    .email('صيغة البريد الإلكتروني غير صحيحة / Invalid email format')
    .toLowerCase()
    .optional()
    .nullable()
    .or(z.literal('')),
  gender: z
    .nativeEnum(Gender, {
      errorMap: () => ({ message: 'النوع المحدد غير صالح (MALE أو FEMALE)' }),
    })
    .optional()
    .nullable(),
  dateOfBirth: dateOfBirthSchema,
  address: z
    .string()
    .trim()
    .max(255, 'العنوان طويل جداً (الحد الأقصى 255 حرف)')
    .optional()
    .nullable()
    .or(z.literal('')),
  emergencyContactName: z
    .string()
    .trim()
    .max(100, 'اسم شخص الطوارئ طويل جداً (الحد الأقصى 100 حرف)')
    .optional()
    .nullable()
    .or(z.literal('')),
  emergencyContactPhone: z
    .string()
    .trim()
    .regex(
      EGYPTIAN_PHONE_REGEX,
      'يرجى إدخال رقم هاتف طوارئ مصري صحيح (مثال: 01112345678) / Invalid Egyptian emergency phone'
    )
    .optional()
    .nullable()
    .or(z.literal('')),
  notes: z
    .string()
    .trim()
    .max(2000, 'الملاحظات طويلة جداً (الحد الأقصى 2000 حرف)')
    .optional()
    .nullable()
    .or(z.literal('')),
  avatarUrl: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('')),
})

export const updateMemberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'يجب أن يتكون اسم العضو من حرفين على الأقل / Name must be at least 2 characters')
    .max(100, 'اسم العضو طويل جداً')
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(
      EGYPTIAN_PHONE_REGEX,
      'يرجى إدخال رقم هاتف محمول مصري صحيح (مثال: 01012345678) / Invalid Egyptian phone number'
    )
    .optional(),
  email: z
    .string()
    .trim()
    .email('صيغة البريد الإلكتروني غير صحيحة / Invalid email format')
    .toLowerCase()
    .optional()
    .nullable()
    .or(z.literal('')),
  gender: z
    .nativeEnum(Gender, {
      errorMap: () => ({ message: 'النوع المحدد غير صالح (MALE أو FEMALE)' }),
    })
    .optional()
    .nullable(),
  dateOfBirth: dateOfBirthSchema,
  address: z
    .string()
    .trim()
    .max(255, 'العنوان طويل جداً')
    .optional()
    .nullable()
    .or(z.literal('')),
  emergencyContactName: z
    .string()
    .trim()
    .max(100, 'اسم شخص الطوارئ طويل جداً')
    .optional()
    .nullable()
    .or(z.literal('')),
  emergencyContactPhone: z
    .string()
    .trim()
    .regex(
      EGYPTIAN_PHONE_REGEX,
      'يرجى إدخال رقم هاتف طوارئ مصري صحيح (مثال: 01112345678) / Invalid Egyptian emergency phone'
    )
    .optional()
    .nullable()
    .or(z.literal('')),
  notes: z
    .string()
    .trim()
    .max(2000, 'الملاحظات طويلة جداً')
    .optional()
    .nullable()
    .or(z.literal('')),
  avatarUrl: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('')),
})

export const updateMemberStatusSchema = z.object({
  isActive: z.boolean({
    required_error: 'حالة العضو مطلوبة / isActive boolean is required',
  }),
})

export const memberQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
  gender: z.nativeEnum(Gender).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateMemberInput = z.infer<typeof createMemberSchema>
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>
export type UpdateMemberStatusInput = z.infer<typeof updateMemberStatusSchema>
export type MemberQueryParams = z.infer<typeof memberQuerySchema>
