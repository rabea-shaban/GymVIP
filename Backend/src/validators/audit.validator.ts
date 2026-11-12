import { z } from 'zod'

export const listAuditLogsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  actorUserId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة تاريخ البدء غير صالحة (YYYY-MM-DD)')
    .optional(),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة تاريخ الانتهاء غير صالحة (YYYY-MM-DD)')
    .optional(),
  search: z.string().max(100).optional(),
})

export type ListAuditLogsQueryInput = z.infer<typeof listAuditLogsQuerySchema>
