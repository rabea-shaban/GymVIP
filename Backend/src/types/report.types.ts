export interface ReportDateFilter {
  from?: string
  to?: string
}

export interface ReportSummaryDto {
  dateRange: {
    from: string
    to: string
  }
  members: {
    totalCreated: number
    active: number
    inactive: number
  }
  subscriptions: {
    totalCreated: number
    active: number
    frozen: number
    expired: number
  }
  attendance: {
    totalCheckIns: number
    distinctMembers: number
    averageDaily: number
  }
  payments?: {
    totalCollected: string
    transactionCount: number
    cashCollected: string
    walletCollected: string
    outstandingAmount: string
  }
}

export interface MembersReportDto {
  dateRange: {
    from: string
    to: string
  }
  totalCreated: number
  active: number
  inactive: number
  breakdown: Array<{
    date: string
    count: number
  }>
}

export interface SubscriptionsReportDto {
  dateRange: {
    from: string
    to: string
  }
  totalCreated: number
  active: number
  frozen: number
  expired: number
  renewalsCount: number
  breakdown: Array<{
    date: string
    count: number
  }>
}

export interface AttendanceReportDto {
  dateRange: {
    from: string
    to: string
  }
  totalCheckIns: number
  distinctMembers: number
  averageDaily: number
  dailyBreakdown: Array<{
    date: string
    checkIns: number
    distinctMembers: number
  }>
}

export interface PaymentsReportDto {
  dateRange: {
    from: string
    to: string
  }
  totalCollected: string
  transactionCount: number
  byMethod: {
    cash: string
    wallet: string
  }
  dailyBreakdown: Array<{
    date: string
    amount: number
    count: number
  }>
  outstandingAmount: string
}
