import { SubscriptionStatus } from '@prisma/client'

/**
 * Parses a date string (YYYY-MM-DD or ISO) or Date into a normalized Date object
 */
export function parseDate(dateInput?: string | Date | null): Date {
  if (!dateInput) {
    return getCurrentCairoDate()
  }
  if (typeof dateInput === 'string') {
    // If format is YYYY-MM-DD, parse as UTC date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const parts = dateInput.split('-').map(Number)
      const year = parts[0] ?? 2026
      const month = parts[1] ?? 1
      const day = parts[2] ?? 1
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    }
    const parsed = new Date(dateInput)
    if (isNaN(parsed.getTime())) {
      throw new Error('تاريخ غير صالح / Invalid date format')
    }
    return parsed
  }
  return dateInput
}

/**
 * Returns current date normalized to Africa/Cairo timezone
 */
export function getCurrentCairoDate(): Date {
  const now = new Date()
  const cairoDateString = now.toLocaleDateString('en-CA', {
    timeZone: 'Africa/Cairo',
  }) // Returns "YYYY-MM-DD"
  const parts = cairoDateString.split('-').map(Number)
  const year = parts[0] ?? 2026
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

/**
 * Calculates inclusive subscription end date from start date and duration in days.
 * E.g., startDate: 2026-10-10, durationDays: 30 -> endDate: 2026-11-08 (at 23:59:59.999Z)
 */
export function calculateSubscriptionEndDate(
  startDateInput: string | Date,
  durationDays: number
): Date {
  const start = parseDate(startDateInput)
  const end = new Date(start)

  // Inclusive duration: durationDays - 1 added days
  const daysToAdd = Math.max(1, durationDays) - 1
  end.setUTCDate(end.getUTCDate() + daysToAdd)
  end.setUTCHours(23, 59, 59, 999)

  return end
}

/**
 * Determines effective status of a subscription based on stored status and current date.
 */
export function getEffectiveSubscriptionStatus(subscription: {
  status: SubscriptionStatus | string
  endDate: Date | string
}): SubscriptionStatus {
  if (subscription.status === SubscriptionStatus.CANCELLED || subscription.status === 'CANCELLED') {
    return SubscriptionStatus.CANCELLED
  }

  if (subscription.status === SubscriptionStatus.FROZEN || subscription.status === 'FROZEN') {
    return SubscriptionStatus.FROZEN
  }

  const end = new Date(subscription.endDate)
  const now = new Date()

  if (now.getTime() > end.getTime()) {
    return SubscriptionStatus.EXPIRED
  }

  return SubscriptionStatus.ACTIVE
}

/**
 * Gets the offset in hours between Africa/Cairo and UTC for a given timestamp.
 */
export function getCairoOffsetHours(date: Date = new Date()): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' })
  const cairoStr = date.toLocaleString('en-US', { timeZone: 'Africa/Cairo' })
  const diffMs = new Date(cairoStr).getTime() - new Date(utcStr).getTime()
  return Math.round(diffMs / (1000 * 60 * 60))
}

/**
 * Returns the start and end of the Africa/Cairo business day in UTC for a given date.
 */
export function getCairoBusinessDayRange(dateInput?: Date | string): {
  startOfDay: Date
  endOfDay: Date
} {
  const targetDate = dateInput
    ? typeof dateInput === 'string'
      ? new Date(dateInput)
      : dateInput
    : new Date()

  const cairoDateStr = targetDate.toLocaleDateString('en-CA', {
    timeZone: 'Africa/Cairo',
  }) // YYYY-MM-DD
  const parts = cairoDateStr.split('-').map(Number)
  const year = parts[0] ?? 2026
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1

  const offsetHours = getCairoOffsetHours(targetDate)
  const startUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetHours * 60 * 60 * 1000
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000 - 1

  return {
    startOfDay: new Date(startUtcMs),
    endOfDay: new Date(endUtcMs),
  }
}

/**
 * Calculates duration in whole minutes between check-in and check-out (always >= 0).
 */
export function calculateDurationMinutes(
  checkInAt: Date | string,
  checkOutAt: Date | string
): number {
  const inMs = new Date(checkInAt).getTime()
  const outMs = new Date(checkOutAt).getTime()
  const diffMs = outMs - inMs
  return Math.max(0, Math.round(diffMs / (1000 * 60)))
}

/**
 * Returns start and end of the Cairo calendar month in UTC
 */
export function getCairoMonthRange(dateInput?: Date | string): {
  startOfMonth: Date
  endOfMonth: Date
} {
  const targetDate = dateInput
    ? typeof dateInput === 'string'
      ? new Date(dateInput)
      : dateInput
    : new Date()

  const cairoDateStr = targetDate.toLocaleDateString('en-CA', {
    timeZone: 'Africa/Cairo',
  })
  const parts = cairoDateStr.split('-').map(Number)
  const year = parts[0] ?? 2026
  const month = parts[1] ?? 1

  const offsetHours = getCairoOffsetHours(targetDate)
  const startUtcMs = Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - offsetHours * 60 * 60 * 1000
  const nextMonthStartUtcMs = Date.UTC(year, month, 1, 0, 0, 0, 0) - offsetHours * 60 * 60 * 1000
  const endUtcMs = nextMonthStartUtcMs - 1

  return {
    startOfMonth: new Date(startUtcMs),
    endOfMonth: new Date(endUtcMs),
  }
}
