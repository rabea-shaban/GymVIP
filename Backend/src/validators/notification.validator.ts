import { z } from 'zod'
import { NotificationType } from '@prisma/client'

export const notificationFilterSchema = z.object({
  isRead: z
    .preprocess((val) => {
      if (val === 'true' || val === true) return true
      if (val === 'false' || val === false) return false
      return undefined
    }, z.boolean().optional())
    .optional(),
  type: z.nativeEnum(NotificationType).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const notificationIdParamSchema = z.object({
  id: z
    .string({ required_error: 'معرف الإشعار مطلوب / Notification ID is required' })
    .min(1, 'معرف الإشعار مطلوب / Notification ID is required'),
})
