import { z } from 'zod'

export const createPlanSchema = z.object({
  name: z
    .string({ required_error: 'اسم الباقة مطلوب / Plan name is required' })
    .trim()
    .min(2, 'يجب أن يتكون اسم الباقة من حرفين على الأقل / Name must be at least 2 characters')
    .max(100, 'اسم الباقة طويل جداً (الحد الأقصى 100 حرف)'),
  description: z
    .string()
    .trim()
    .max(500, 'الوصف طويل جداً (الحد الأقصى 500 حرف)')
    .optional()
    .nullable()
    .or(z.literal('')),
  durationDays: z
    .number({ required_error: 'مدة الباقة بالأيام مطلوبة / Duration in days is required' })
    .int('يجب أن تكون المدة عدداً صحيحاً من الأيام / Duration must be an integer')
    .min(1, 'مدة الباقة يجب أن تكون يوماً واحداً على الأقل / Duration must be at least 1 day')
    .max(3650, 'مدة الباقة يجب ألا تتجاوز 3650 يوماً (10 سنوات)'),
  price: z
    .number({ required_error: 'سعر الباقة مطلوب / Price is required' })
    .min(0, 'سعر الباقة لا يمكن أن يكون سالباً / Price cannot be negative')
    .max(1000000, 'سعر الباقة يتجاوز الحد الأقصى المسموح')
    .refine(
      (val) => {
        const decimals = (val.toString().split('.')[1] || '').length
        return decimals <= 2
      },
      { message: 'سعر الباقة يجب ألا يحتوي على أكثر من خانتين عشريتين' }
    ),
})

export const updatePlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'يجب أن يتكون اسم الباقة من حرفين على الأقل / Name must be at least 2 characters')
    .max(100, 'اسم الباقة طويل جداً')
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, 'الوصف طويل جداً')
    .optional()
    .nullable()
    .or(z.literal('')),
  durationDays: z
    .number()
    .int('يجب أن تكون المدة عدداً صحيحاً من الأيام')
    .min(1, 'مدة الباقة يجب أن تكون يوماً واحداً على الأقل')
    .max(3650, 'مدة الباقة يجب ألا تتجاوز 3650 يوماً')
    .optional(),
  price: z
    .number()
    .min(0, 'سعر الباقة لا يمكن أن يكون سالباً')
    .max(1000000, 'سعر الباقة يتجاوز الحد الأقصى المسموح')
    .refine(
      (val) => {
        const decimals = (val.toString().split('.')[1] || '').length
        return decimals <= 2
      },
      { message: 'سعر الباقة يجب ألا يحتوي على أكثر من خانتين عشريتين' }
    )
    .optional(),
})

export const updatePlanStatusSchema = z.object({
  isActive: z.boolean({
    required_error: 'حالة الباقة مطلوبة / isActive boolean is required',
  }),
})

export const planQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreatePlanInput = z.infer<typeof createPlanSchema>
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>
export type UpdatePlanStatusInput = z.infer<typeof updatePlanStatusSchema>
export type PlanQueryParams = z.infer<typeof planQuerySchema>
