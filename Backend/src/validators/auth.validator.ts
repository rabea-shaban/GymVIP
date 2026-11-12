import { z } from 'zod'

// Egyptian Mobile Number Regex: 010, 011, 012, 015 followed by 8 digits (or optional +20 / 0020 prefix)
const EGYPTIAN_PHONE_REGEX = /^(?:\+?20|0020)?0?1[0125][0-9]{8}$/

export const registerSchema = z.object({
  gymName: z
    .string({ required_error: 'اسم النادي الرياضي مطلوب / Gym name is required' })
    .trim()
    .min(2, 'يجب أن يتكون اسم النادي من حرفين على الأقل / Gym name must be at least 2 characters')
    .max(100, 'اسم النادي طويل جداً (الحد الأقصى 100 حرف) / Gym name is too long'),
  ownerName: z
    .string({ required_error: 'اسم مالك النادي مطلوب / Owner name is required' })
    .trim()
    .min(2, 'يجب أن يتكون اسم المالك من حرفين على الأقل / Owner name must be at least 2 characters')
    .max(100, 'اسم المالك طويل جداً / Owner name is too long'),
  email: z
    .string({ required_error: 'البريد الإلكتروني مطلوب / Email is required' })
    .trim()
    .email('صيغة البريد الإلكتروني غير صحيحة / Invalid email format')
    .toLowerCase(),
  phone: z
    .string({ required_error: 'رقم الهاتف مطلوب / Phone number is required' })
    .trim()
    .regex(
      EGYPTIAN_PHONE_REGEX,
      'يرجى إدخال رقم هاتف محمول مصري صحيح (مثال: 01012345678) / Invalid Egyptian phone number'
    ),
  password: z
    .string({ required_error: 'كلمة المرور مطلوبة / Password is required' })
    .min(8, 'كلمة المرور يجب أن لا تقل عن 8 أحرف / Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-zA-Z])(?=.*[0-9])/,
      'يجب أن تحتوي كلمة المرور على أحرف وأرقام معاً / Password must contain both letters and numbers'
    ),
  city: z
    .string()
    .trim()
    .max(50, 'اسم المدينة طويل جداً')
    .optional(),
})

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'البريد الإلكتروني مطلوب / Email is required' })
    .trim()
    .email('صيغة البريد الإلكتروني غير صحيحة / Invalid email format')
    .toLowerCase(),
  password: z
    .string({ required_error: 'كلمة المرور مطلوبة / Password is required' })
    .min(1, 'كلمة المرور مطلوبة / Password is required'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
