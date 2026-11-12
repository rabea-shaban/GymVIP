import { PaymentMethod, WalletProvider } from '@prisma/client'

export interface PaymentMemberDto {
  id: string
  name: string
  phone: string
  memberCode: string
  email?: string | null
}

export interface PaymentSubscriptionDto {
  id: string
  planName: string
  planPrice: string
  durationDays: number
  startDate: string
  endDate: string
  status: string
}

export interface PaymentUserDto {
  id: string
  name: string
  role: string
}

export interface PaymentGymDto {
  name: string
  phone?: string | null
  address?: string | null
}

export interface PaymentSummaryDto {
  totalAmount: string
  paidAmount: string
  outstandingAmount: string
  isPaid: boolean
  paymentCount: number
}

export interface PaymentDto {
  id: string
  gymId: string
  subscriptionId: string
  memberId: string
  amount: string
  currency: string
  method: PaymentMethod
  walletProvider: WalletProvider | null
  transactionReference: string | null
  notes: string | null
  createdByUserId: string
  createdAt: string
  member?: PaymentMemberDto
  subscription?: PaymentSubscriptionDto
  createdByUser?: PaymentUserDto
  gym?: PaymentGymDto
  financialSummary?: PaymentSummaryDto
}

export interface CreatePaymentInput {
  subscriptionId: string
  amount: number
  method: PaymentMethod
  walletProvider?: WalletProvider | null
  transactionReference?: string | null
  notes?: string | null
}

export interface PaymentFilterQuery {
  search?: string
  method?: PaymentMethod
  walletProvider?: WalletProvider
  subscriptionId?: string
  memberId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export interface PaymentPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaymentListResult {
  payments: PaymentDto[]
  pagination: PaymentPagination
}

export interface SubscriptionPaymentsResult {
  payments: PaymentDto[]
  financialSummary: PaymentSummaryDto
}
