import { z } from 'zod'

const EGYPTIAN_PHONE_REGEX = /^(?:\+?20|0020)?0?1[0125][0-9]{8}$/

export const createTrainerSchema = z.object({
  name: z
    .string({ required_error: 'اسم المدرب مطلوب / Name is required' })
    .trim()
    .min(2, 'يجب أن يتكون الاسم من حرفين على الأقل / Name must be at least 2 characters')
    .max(100, 'الاسم طويل جداً (الحد الأقصى 100 حرف)'),
  email: z
    .string({ required_error: 'البريد الإلكتروني مطلوب / Email is required' })
    .trim()
    .email('صيغة البريد الإلكتروني غير صحيحة / Invalid email format')
    .toLowerCase(),
  password: z
    .string({ required_error: 'كلمة المرور مطلوبة / Password is required' })
    .min(8, 'كلمة المرور يجب أن لا تقل عن 8 أحرف / Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-zA-Z])(?=.*[0-9])/,
      'يجب أن تحتوي كلمة المرور على أحرف وأرقام معاً / Password must contain both letters and numbers'
    ),
  phone: z
    .string({ required_error: 'رقم الهاتف مطلوب / Phone is required' })
    .trim()
    .regex(
      EGYPTIAN_PHONE_REGEX,
      'يرجى إدخال رقم هاتف محمول مصري صحيح (مثال: 01012345678) / Invalid Egyptian phone number'
    ),
  specialization: z
    .string()
    .trim()
    .max(150, 'التخصص طويل جداً (الحد الأقصى 150 حرف)')
    .optional()
    .nullable()
    .or(z.literal('')),
  bio: z
    .string()
    .trim()
    .max(1000, 'النبذة التعريفية طويلة جداً (الحد الأقصى 1000 حرف)')
    .optional()
    .nullable()
    .or(z.literal('')),
})

export const updateTrainerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'يجب أن يتكون الاسم من حرفين على الأقل / Name must be at least 2 characters')
    .max(100, 'الاسم طويل جداً')
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(
      EGYPTIAN_PHONE_REGEX,
      'يرجى إدخال رقم هاتف محمول مصري صحيح (مثال: 01012345678) / Invalid Egyptian phone number'
    )
    .optional()
    .nullable()
    .or(z.literal('')),
  specialization: z
    .string()
    .trim()
    .max(150, 'التخصص طويل جداً')
    .optional()
    .nullable()
    .or(z.literal('')),
  bio: z
    .string()
    .trim()
    .max(1000, 'النبذة التعريفية طويلة جداً')
    .optional()
    .nullable()
    .or(z.literal('')),
})

export const updateTrainerStatusSchema = z.object({
  isActive: z.boolean({
    required_error: 'حالة المدرب مطلوبة / isActive boolean is required',
  }),
})

export const trainerQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const trainerIdParamSchema = z.object({
  id: z.string().min(1, 'معرّف المدرب مطلوب / Trainer ID is required'),
})

export type CreateTrainerInput = z.infer<typeof createTrainerSchema>
export type UpdateTrainerInput = z.infer<typeof updateTrainerSchema>
export type UpdateTrainerStatusInput = z.infer<typeof updateTrainerStatusSchema>
export type TrainerQueryParams = z.infer<typeof trainerQuerySchema>
