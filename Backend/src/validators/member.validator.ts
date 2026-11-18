import { z } from 'zod'
import { Gender } from '@prisma/client'

/**
 * Normalizes Egyptian phone numbers:
 * - Converts Arabic-Indic numerals (٠-٩) to English (0-9)
 * - Removes spaces, dashes, dots, brackets
 * - Strips country code prefixes (+20, 0020, 20)
 * - Adds leading 0 if missing (10 digits starting with 1 -> 01...)
 */
export const normalizeEgyptianPhone = (val: unknown): string => {
  if (!val) return ''
  let s = String(val)
    .trim()
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\s\-\(\)\.]/g, '')
  if (s.startsWith('0020')) s = s.slice(4)
  else if (s.startsWith('+20')) s = s.slice(3)
  else if (s.startsWith('20') && s.length === 12) s = s.slice(2)
  if (!s.startsWith('0') && s.length === 10) s = '0' + s
  return s
}

/**
 * Parses flexible dates:
 * - Arabic-Indic numerals (٠-٩)
 * - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
 * - YYYY-MM-DD, ISO string
 */
export const parseDateFlexible = (val: unknown): string | null => {
  if (!val) return null
  let s = String(val).trim()
  if (!s) return null
  s = s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (dmy && dmy[1] && dmy[2] && dmy[3]) {
    s = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  }
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return s
}

const dateOfBirthSchema = z
  .any()
  .optional()
  .nullable()
  .superRefine((val, ctx) => {
    if (!val || String(val).trim() === '') return
    const parsed = parseDateFlexible(val)
    if (!parsed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'صيغة تاريخ الميلاد غير صحيحة / Invalid date of birth format',
      })
      return
    }
    const d = new Date(parsed)
    if (isNaN(d.getTime()) || d > new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'تاريخ الميلاد غير صالح أو يقع في المستقبل / Date of birth must not be in the future',
      })
    }
  })
  .transform((val) => {
    if (!val || String(val).trim() === '') return null
    return parseDateFlexible(val)
  })

const phoneSchema = z
  .any()
  .refine((val) => val !== undefined && val !== null && String(val).trim() !== '', {
    message: 'رقم الهاتف مطلوب / Phone number is required',
  })
  .transform(normalizeEgyptianPhone)
  .pipe(
    z
      .string()
      .regex(
        /^01[0125][0-9]{8}$/,
        'يرجى إدخال رقم هاتف محمول مصري صحيح مكون من 11 رقماً (مثال: 01012345678) / Invalid Egyptian phone number'
      )
  )

const updatePhoneSchema = z
  .any()
  .optional()
  .transform((val) => {
    if (val === undefined || val === null || String(val).trim() === '') return undefined
    return normalizeEgyptianPhone(val)
  })
  .pipe(
    z
      .string()
      .regex(
        /^01[0125][0-9]{8}$/,
        'يرجى إدخال رقم هاتف محمول مصري صحيح مكون من 11 رقماً (مثال: 01012345678) / Invalid Egyptian phone number'
      )
      .optional()
  )

const optionalPhoneSchema = z
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
        /^01[0125][0-9]{8}$/,
        'يرجى إدخال رقم هاتف طوارئ مصري صحيح مكون من 11 رقماً (مثال: 01112345678) / Invalid Egyptian emergency phone'
      )
      .nullable()
      .optional()
  )

const genderSchema = z
  .any()
  .optional()
  .nullable()
  .transform((val) => {
    if (!val || val === '') return null
    if (val === 'MALE' || val === 'FEMALE') return val as Gender
    return null
  })

const optionalEmailSchema = z
  .any()
  .optional()
  .nullable()
  .transform((val) => {
    if (!val) return null
    const s = String(val).trim().toLowerCase()
    return s.length > 0 ? s : null
  })
  .pipe(
    z
      .string()
      .email('صيغة البريد الإلكتروني غير صحيحة / Invalid email format')
      .nullable()
      .optional()
  )

const optionalText = (maxLen: number, errorMsg: string) =>
  z
    .any()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null
      const s = String(val).trim()
      return s.length > 0 ? s : null
    })
    .pipe(z.string().max(maxLen, errorMsg).nullable().optional())

const avatarUrlSchema = z
  .any()
  .optional()
  .nullable()
  .transform((val) => {
    if (!val) return null
    const s = String(val).trim()
    return s.length > 0 ? s : null
  })

export const createMemberSchema = z.object({
  name: z
    .string({ required_error: 'اسم العضو مطلوب / Member name is required' })
    .trim()
    .min(2, 'يجب أن يتكون اسم العضو من حرفين على الأقل / Name must be at least 2 characters')
    .max(100, 'اسم العضو طويل جداً (الحد الأقصى 100 حرف)'),
  phone: phoneSchema,
  email: optionalEmailSchema,
  gender: genderSchema,
  dateOfBirth: dateOfBirthSchema,
  address: optionalText(255, 'العنوان طويل جداً (الحد الأقصى 255 حرف)'),
  emergencyContactName: optionalText(100, 'اسم شخص الطوارئ طويل جداً (الحد الأقصى 100 حرف)'),
  emergencyContactPhone: optionalPhoneSchema,
  notes: optionalText(2000, 'الملاحظات طويلة جداً (الحد الأقصى 2000 حرف)'),
  avatarUrl: avatarUrlSchema,
})

export const updateMemberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'يجب أن يتكون اسم العضو من حرفين على الأقل / Name must be at least 2 characters')
    .max(100, 'اسم العضو طويل جداً')
    .optional(),
  phone: updatePhoneSchema,
  email: optionalEmailSchema,
  gender: genderSchema,
  dateOfBirth: dateOfBirthSchema,
  address: optionalText(255, 'العنوان طويل جداً'),
  emergencyContactName: optionalText(100, 'اسم شخص الطوارئ طويل جداً'),
  emergencyContactPhone: optionalPhoneSchema,
  notes: optionalText(2000, 'الملاحظات طويلة جداً'),
  avatarUrl: avatarUrlSchema,
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
