export type PaymentMethod = 'CASH' | 'WALLET'

export type WalletProvider =
  | 'VODAFONE_CASH'
  | 'ORANGE_CASH'
  | 'ETISALAT_CASH'
  | 'WE'
  | 'INSTAPAY'
  | 'OTHER'

export interface PaymentMember {
  id: string
  name: string
  phone: string
  memberCode: string
  email?: string | null
}

export interface PaymentSubscription {
  id: string
  planName: string
  planPrice: string
  durationDays: number
  startDate: string
  endDate: string
  status: string
}

export interface PaymentUser {
  id: string
  name: string
  role: string
}

export interface PaymentGym {
  name: string
  phone?: string | null
  address?: string | null
  logo?: string | null
}

export interface PaymentSummary {
  totalAmount: string
  paidAmount: string
  outstandingAmount: string
  isPaid: boolean
  paymentCount: number
}

export interface PaymentItem {
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
  member?: PaymentMember
  subscription?: PaymentSubscription
  createdByUser?: PaymentUser
  gym?: PaymentGym
  financialSummary?: PaymentSummary
}

export interface CreatePaymentInput {
  subscriptionId: string
  amount: number
  method: PaymentMethod
  walletProvider?: WalletProvider | null
  transactionReference?: string | null
  notes?: string | null
}

export interface PaymentFilterParams {
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

export interface PaymentListResponse {
  payments: PaymentItem[]
  pagination: PaymentPagination
}

export interface SubscriptionPaymentsResponse {
  payments: PaymentItem[]
  financialSummary: PaymentSummary
}
