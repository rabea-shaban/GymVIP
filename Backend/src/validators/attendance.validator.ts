import { z } from 'zod'

export const checkInSchema = z.object({
  memberId: z
    .string({ required_error: 'معرف العضو مطلوب / Member ID is required' })
    .min(1, 'معرف العضو مطلوب / Member ID is required'),
})

export const attendanceFilterSchema = z.object({
  search: z.string().trim().optional(),
  memberId: z.string().trim().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  status: z.enum(['OPEN', 'COMPLETED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const attendanceIdParamSchema = z.object({
  id: z
    .string({ required_error: 'معرف سجل الحضور مطلوب / Attendance ID is required' })
    .min(1, 'معرف سجل الحضور مطلوب / Attendance ID is required'),
})

export const memberIdParamSchema = z.object({
  memberId: z
    .string({ required_error: 'معرف العضو مطلوب / Member ID is required' })
    .min(1, 'معرف العضو مطلوب / Member ID is required'),
})
