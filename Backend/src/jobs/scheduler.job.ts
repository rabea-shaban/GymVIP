import cron, { type ScheduledTask } from 'node-cron'
import { logger } from '../utils/logger.util.js'
import { processSubscriptionExpirationReminders } from '../services/notification.service.js'

let isRunning = false
let scheduledTask: ScheduledTask | null = null

/**
 * Runs the daily subscription reminders and expiration alerts job.
 * Protected against in-process overlapping executions and handles errors safely.
 */
export const runDailySubscriptionRemindersJob = async (): Promise<{
  success: boolean
  expiringProcessed?: number
  expiredProcessed?: number
  skipped?: boolean
  error?: string
}> => {
  if (isRunning) {
    logger.warn('⚠️ [Scheduler]: Subscription reminders job is already running. Skipping overlapping run.')
    return { success: false, skipped: true }
  }

  isRunning = true
  const startTime = Date.now()
  logger.info('🔔 [Scheduler]: Starting daily subscription reminders and expiration alerts job...')

  try {
    const result = await processSubscriptionExpirationReminders()
    const duration = Date.now() - startTime
    logger.info(
      `✅ [Scheduler]: Completed subscription reminders job in ${duration}ms (Expiring: ${result.expiringProcessed}, Expired: ${result.expiredProcessed})`
    )
    return {
      success: true,
      expiringProcessed: result.expiringProcessed,
      expiredProcessed: result.expiredProcessed,
    }
  } catch (err: unknown) {
    logger.error('❌ [Scheduler]: Error executing subscription reminders job:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    isRunning = false
  }
}

/**
 * Initializes the cron scheduler for GymVIP SaaS
 * Runs daily at 01:00 AM (Africa/Cairo timezone)
 */
export const initScheduler = (): void => {
  if (scheduledTask) {
    return
  }

  // Run at 01:00 AM Africa/Cairo every day
  scheduledTask = cron.schedule(
    '0 1 * * *',
    async () => {
      await runDailySubscriptionRemindersJob()
    },
    {
      timezone: 'Africa/Cairo',
    }
  )

  logger.info('🕒 [Scheduler]: Daily subscription notifications cron initialized (01:00 AM Africa/Cairo)')
}

/**
 * Stops the scheduler gracefully during server shutdown
 */
export const stopScheduler = (): void => {
  if (scheduledTask) {
    scheduledTask.stop()
    scheduledTask = null
    logger.info('🛑 [Scheduler]: Subscription notifications cron stopped')
  }
}
