export interface DashboardOverviewDto {
  members: {
    total: number
    active: number
    inactive: number
    newThisMonth: number
  }
  subscriptions: {
    active: number
    frozen: number
    expired: number
    expiringSoon: number
  }
  attendance: {
    presentToday: number
    checkInsToday: number
    averageDailyAttendance: number
  }
  payments?: {
    collectedToday: string
    collectedThisMonth: string
    outstandingAmount: string
  }
  trainers: {
    total: number
    active: number
  }
  charts: {
    dailyAttendance: Array<{
      date: string
      dayLabel: string
      count: number
    }>
    monthlyPayments?: Array<{
      month: string
      monthLabel: string
      amount: number
    }>
    monthlyNewMembers: Array<{
      month: string
      monthLabel: string
      count: number
    }>
  }
  recentActivity: Array<{
    id: string
    type: 'MEMBER' | 'SUBSCRIPTION' | 'PAYMENT' | 'ATTENDANCE'
    title: string
    description: string
    timestamp: string
    entityId?: string
  }>
  upcomingExpirations: Array<{
    subscriptionId: string
    memberId: string
    memberName: string
    memberCode: string
    memberPhone: string
    planName: string
    endDate: string
    daysRemaining: number
  }>
}
