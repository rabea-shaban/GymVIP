import { z } from 'zod'
import { PaymentMethod, WalletProvider } from '@prisma/client'

export const createPaymentSchema = z
  .object({
    subscriptionId: z
      .string({ required_error: 'معرف الاشتراك مطلوب / subscriptionId is required' })
      .min(1, 'معرف الاشتراك مطلوب'),
    amount: z
      .number({ required_error: 'مبلغ الدفع مطلوب / amount is required' })
      .positive('مبلغ الدفع يجب أن يكون أكبر من الصفر / amount must be greater than 0')
      .refine(
        (val) => {
          const str = val.toString()
          const parts = str.split('.')
          return parts.length === 1 || (parts[1] && parts[1].length <= 2)
        },
        {
          message: 'المبلغ يجب ألا يحتوي على أكثر من منزلتين عشريتين / Maximum 2 decimal places allowed',
        }
      ),
    method: z.enum([PaymentMethod.CASH, PaymentMethod.WALLET], {
      required_error: 'طريقة الدفع مطلوبة / method is required',
    }),
    walletProvider: z
      .enum([
        WalletProvider.VODAFONE_CASH,
        WalletProvider.ORANGE_CASH,
        WalletProvider.ETISALAT_CASH,
        WalletProvider.WE,
        WalletProvider.INSTAPAY,
        WalletProvider.OTHER,
      ])
      .optional()
      .nullable(),
    transactionReference: z
      .string()
      .max(100, 'رقم العملية يجب ألا يتجاوز 100 حرف / Transaction reference max 100 chars')
      .optional()
      .nullable(),
    notes: z
      .string()
      .max(1000, 'الملاحظات يجب ألا تتجاوز 1000 حرف / Notes max 1000 chars')
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.method === PaymentMethod.CASH && data.walletProvider) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'مزود المحفظة يجب أن يكون فارغاً للدفع النقدي / walletProvider must be null for CASH',
        path: ['walletProvider'],
      })
    }
    if (data.method === PaymentMethod.WALLET && !data.walletProvider) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'مزود المحفظة مطلوب للدفع الإلكتروني / walletProvider is required for WALLET',
        path: ['walletProvider'],
      })
    }
  })

export const paymentQuerySchema = z.object({
  search: z.string().trim().optional(),
  method: z.enum([PaymentMethod.CASH, PaymentMethod.WALLET]).optional(),
  walletProvider: z
    .enum([
      WalletProvider.VODAFONE_CASH,
      WalletProvider.ORANGE_CASH,
      WalletProvider.ETISALAT_CASH,
      WalletProvider.WE,
      WalletProvider.INSTAPAY,
      WalletProvider.OTHER,
    ])
    .optional(),
  subscriptionId: z.string().trim().optional(),
  memberId: z.string().trim().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const paymentIdParamSchema = z.object({
  id: z.string().min(1, 'معرف العملية مطلوب'),
})

export const subscriptionPaymentParamSchema = z.object({
  subscriptionId: z.string().min(1, 'معرف الاشتراك مطلوب'),
})
