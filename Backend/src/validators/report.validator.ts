import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const reportDateFilterSchema = z
  .object({
    from: z
      .string()
      .trim()
      .regex(dateRegex, 'تنسيق التاريخ غير صالح، يجب أن يكون YYYY-MM-DD / Invalid from date format')
      .optional(),
    to: z
      .string()
      .trim()
      .regex(dateRegex, 'تنسيق التاريخ غير صالح، يجب أن يكون YYYY-MM-DD / Invalid to date format')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to)
      }
      return true
    },
    {
      message: 'تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية / From date must be before or equal to to date',
      path: ['to'],
    }
  )
