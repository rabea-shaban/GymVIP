import { z } from 'zod'

const EGYPTIAN_PHONE_REGEX = /^(?:\+?20|0020)?0?1[0125][0-9]{8}$/

export const gymSetupSchema = z.object({
  name: z
    .string({ required_error: 'اسم النادي الرياضي مطلوب / Gym name is required' })
    .trim()
    .min(2, 'يجب أن يتكون اسم النادي من حرفين على الأقل / Gym name must be at least 2 characters')
    .max(100, 'اسم النادي طويل جداً (الحد الأقصى 100 حرف) / Gym name is too long'),
  phone: z
    .string()
    .trim()
    .regex(
      EGYPTIAN_PHONE_REGEX,
      'يرجى إدخال رقم هاتف محمول مصري صحيح (مثال: 01012345678) / Invalid Egyptian phone number'
    )
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .trim()
    .email('صيغة البريد الإلكتروني غير صحيحة / Invalid email format')
    .toLowerCase()
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .trim()
    .max(200, 'العنوان طويل جداً (الحد الأقصى 200 حرف)')
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .trim()
    .max(100, 'اسم المدينة طويل جداً (الحد الأقصى 100 حرف)')
    .optional()
    .or(z.literal('')),
  logo: z
    .string()
    .trim()
    .url('صيغة رابط الشعار غير صحيحة / Invalid logo URL')
    .optional()
    .or(z.literal('')),
  currency: z
    .literal('EGP', {
      errorMap: () => ({ message: 'العملة المدعومة حالياً هي الجنيه المصري (EGP)' }),
    })
    .default('EGP'),
  timezone: z
    .literal('Africa/Cairo', {
      errorMap: () => ({ message: 'المنطقة الزمنية المعتمدة هي Africa/Cairo' }),
    })
    .default('Africa/Cairo'),
})

export const updateGymSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'يجب أن يتكون اسم النادي من حرفين على الأقل / Gym name must be at least 2 characters')
      .max(100, 'اسم النادي طويل جداً (الحد الأقصى 100 حرف) / Gym name is too long')
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
    email: z
      .string()
      .trim()
      .email('صيغة البريد الإلكتروني غير صحيحة / Invalid email format')
      .toLowerCase()
      .optional()
      .nullable()
      .or(z.literal('')),
    address: z
      .string()
      .trim()
      .max(200, 'العنوان طويل جداً')
      .optional()
      .nullable()
      .or(z.literal('')),
    city: z
      .string()
      .trim()
      .max(100, 'اسم المدينة طويل جداً')
      .optional()
      .nullable()
      .or(z.literal('')),
    logo: z
      .string()
      .trim()
      .url('صيغة رابط الشعار غير صحيحة / Invalid logo URL')
      .optional()
      .nullable()
      .or(z.literal('')),
    currency: z
      .literal('EGP', {
        errorMap: () => ({ message: 'العملة المدعومة حالياً هي الجنيه المصري (EGP) فقط / Currency must remain EGP' }),
      })
      .optional(),
    timezone: z
      .literal('Africa/Cairo', {
        errorMap: () => ({ message: 'المنطقة الزمنية المعتمدة هي Africa/Cairo فقط / Timezone must remain Africa/Cairo' }),
      })
      .optional(),
    subscriptionReminderEnabled: z.boolean().optional(),
    subscriptionReminderDays: z
      .array(
        z.number().int('يجب أن تكون أيام التذكير أرقاماً صحيحة').refine((val) => [1, 3, 7].includes(val), {
          message: 'قيم التذكير المسموح بها هي 1 أو 3 أو 7 فقط / Allowed reminder days are 1, 3, or 7',
        })
      )
      .optional(),
    subscriptionFreezeEnabled: z.boolean().optional(),
    allowedFreezeDurations: z
      .array(
        z.number().int('مدة التجميد يجب أن تكون عدداً صحيحاً').positive('مدة التجميد يجب أن تكون أكبر من صفر')
      )
      .optional(),
    maxFreezeDays: z
      .number()
      .int('الحد الأقصى لأيام التجميد يجب أن يكون عدداً صحيحاً')
      .min(1, 'الحد الأقصى لأيام التجميد يجب أن يكون يوماً واحداً على الأقل')
      .max(90, 'الحد الأقصى لأيام التجميد لا يمكن أن يتجاوز 90 يوماً')
      .optional(),
    allowManualCheckout: z.boolean().optional(),
  })
  .strict({
    message: 'الحقول المرسلة غير صالحة أو غير مدعومة / Unknown or unsupported settings fields',
  })
  .superRefine((data, ctx) => {
    // 1. Reminder days validation
    if (data.subscriptionReminderDays !== undefined) {
      const uniqueDays = new Set(data.subscriptionReminderDays)
      if (uniqueDays.size !== data.subscriptionReminderDays.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'أيام التذكير يجب أن تكون فريدة وغير مكررة / Reminder offsets must be unique',
          path: ['subscriptionReminderDays'],
        })
      }
      if (data.subscriptionReminderEnabled !== false && data.subscriptionReminderDays.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'أيام التذكير لا يمكن أن تكون فارغة عند تفعيل التنبيهات / Reminder offsets must be non-empty when reminders are enabled',
          path: ['subscriptionReminderDays'],
        })
      }
    }

    // 2. Freeze durations validation
    const maxDays = data.maxFreezeDays ?? 90
    if (data.allowedFreezeDurations !== undefined) {
      const uniqueDurations = new Set(data.allowedFreezeDurations)
      if (uniqueDurations.size !== data.allowedFreezeDurations.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'مدد التجميد يجب أن تكون فريدة وغير مكررة / Freeze durations must be unique',
          path: ['allowedFreezeDurations'],
        })
      }
      if (data.subscriptionFreezeEnabled !== false && data.allowedFreezeDurations.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'مدد التجميد لا يمكن أن تكون فارغة عند تفعيل التجميد / Allowed freeze durations must be non-empty when freezing is enabled',
          path: ['allowedFreezeDurations'],
        })
      }
      for (const d of data.allowedFreezeDurations) {
        if (d > maxDays) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `مدة التجميد (${d}) تتجاوز الحد الأقصى المسموح به (${maxDays}) / Freeze duration exceeds maxFreezeDays`,
            path: ['allowedFreezeDurations'],
          })
        }
      }
    }
  })

export const updateGymStatusSchema = z.object({
  isActive: z.boolean({
    required_error: 'حالة النادي الرياضي مطلوبة / isActive boolean is required',
  }),
})

export type GymSetupInput = z.infer<typeof gymSetupSchema>
export type UpdateGymInput = z.infer<typeof updateGymSchema>
export type UpdateGymStatusInput = z.infer<typeof updateGymStatusSchema>
