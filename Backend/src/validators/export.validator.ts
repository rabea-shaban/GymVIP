import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const exportQuerySchema = z
  .object({
    format: z
      .enum(['csv', 'xlsx'], {
        errorMap: () => ({ message: 'صيغة التصدير غير مدعومة، يرجى اختيار csv أو xlsx / Unsupported export format, choose csv or xlsx' }),
      })
      .optional()
      .default('csv'),
    from: z
      .string()
      .regex(dateRegex, 'تاريخ البداية يجب أن يكون بصيغة YYYY-MM-DD / from must be in YYYY-MM-DD format')
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'تاريخ البداية غير صالح / Invalid from date',
      })
      .optional(),
    to: z
      .string()
      .regex(dateRegex, 'تاريخ النهاية يجب أن يكون بصيغة YYYY-MM-DD / to must be in YYYY-MM-DD format')
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'تاريخ النهاية غير صالح / Invalid to date',
      })
      .optional(),
    status: z.string().optional(),
    method: z.string().optional(),
    paymentMethod: z.string().optional(),
    search: z.string().optional(),
    memberId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to)
      }
      return true
    },
    {
      message: 'تاريخ البداية يجب أن يسبق أو يساوي تاريخ النهاية / from date must be before or equal to to date',
      path: ['from'],
    }
  )

export type ExportQueryInput = z.infer<typeof exportQuerySchema>
