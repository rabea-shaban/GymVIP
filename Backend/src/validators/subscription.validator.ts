import { z } from 'zod'
import { SubscriptionStatus } from '@prisma/client'

export const createSubscriptionSchema = z
  .object({
    memberId: z
      .string({ required_error: 'معرف العضو مطلوب / memberId is required' })
      .min(1, 'معرف العضو مطلوب'),
    planId: z
      .string({ required_error: 'معرف الباقة مطلوب / planId is required' })
      .min(1, 'معرف الباقة مطلوب'),
    startDate: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'تاريخ البداية غير صالح / Invalid start date format',
      }),
    notes: z
      .string()
      .max(1000, 'الملاحظات يجب ألا تتجاوز 1000 حرف / Notes cannot exceed 1000 characters')
      .optional()
      .nullable(),
  })

export const subscriptionQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z
    .enum([
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.FROZEN,
      SubscriptionStatus.EXPIRED,
      SubscriptionStatus.CANCELLED,
    ])
    .optional(),
  memberId: z.string().trim().optional(),
  planId: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const memberIdParamSchema = z.object({
  memberId: z.string().min(1, 'معرف العضو مطلوب'),
})

export const subscriptionIdParamSchema = z.object({
  id: z.string().min(1, 'معرف الاشتراك مطلوب'),
})

export const freezeSubscriptionSchema = z.object({
  days: z
    .number({ required_error: 'عدد أيام التجميد مطلوب / Freeze days is required' })
    .int('عدد الأيام يجب أن يكون عدداً صحيحاً / Days must be an integer')
    .min(1, 'عدد الأيام يجب أن يكون يوماً واحداً على الأقل / Minimum 1 day')
    .max(90, 'الحد الأقصى للتجميد هو 90 يوماً / Maximum freeze duration is 90 days'),
  reason: z
    .string()
    .max(500, 'سبب التجميد يجب ألا يتجاوز 500 حرف / Reason cannot exceed 500 characters')
    .optional()
    .nullable(),
})

export const renewSubscriptionSchema = z.object({
  planId: z
    .string({ required_error: 'معرف الباقة مطلوب / planId is required' })
    .min(1, 'معرف الباقة مطلوب'),
  startDate: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'تاريخ البداية غير صالح / Invalid start date format',
    }),
  notes: z
    .string()
    .max(1000, 'الملاحظات يجب ألا تتجاوز 1000 حرف / Notes cannot exceed 1000 characters')
    .optional()
    .nullable(),
})

export const cancelSubscriptionSchema = z
  .object({
    reason: z
      .string({ required_error: 'سبب الإلغاء مطلوب / Cancellation reason is required' })
      .trim()
      .min(3, 'سبب الإلغاء يجب أن يتكون من 3 أحرف على الأقل / Cancellation reason must be at least 3 characters')
      .max(250, 'سبب الإلغاء يجب ألا يتجاوز 250 حرفاً / Cancellation reason must not exceed 250 characters'),
    notes: z
      .string()
      .trim()
      .max(1000, 'الملاحظات يجب ألا تتجاوز 1000 حرف / Notes cannot exceed 1000 characters')
      .optional()
      .nullable(),
  })
  .strict({
    message: 'الحقول المرسلة غير صالحة / Unknown or unsupported fields',
  })

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>
