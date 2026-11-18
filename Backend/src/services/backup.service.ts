import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { prisma } from '../config/database.js'
import { logger } from '../utils/logger.util.js'
import { AppError } from '../utils/appError.util.js'

const resolveBackupsDir = (): string => {
  if (fs.existsSync(path.resolve(process.cwd(), 'Backend'))) {
    return path.resolve(process.cwd(), 'Backend', 'backups')
  }
  return path.resolve(process.cwd(), 'backups')
}

const resolveDbPath = (): string => {
  const c1 = path.resolve(process.cwd(), 'Backend', 'prisma', 'gymvip.db')
  if (fs.existsSync(c1)) return c1

  const c2 = path.resolve(process.cwd(), 'prisma', 'gymvip.db')
  if (fs.existsSync(c2)) return c2

  return c1
}

const BACKUPS_DIR = resolveBackupsDir()
const DB_SOURCE_PATH = resolveDbPath()
const MAX_BACKUP_RETENTION = 30 // Keep last 30 backups

export interface BackupItemDto {
  id: string
  fileName: string
  fileSizeBytes: number
  fileSizeFormatted: string
  backupType: string
  status: string
  createdAt: string
}

/**
 * Ensures the backups directory exists
 */
export const ensureBackupsDir = (): void => {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true })
  }
}

/**
 * Format bytes to readable string (e.g. 1.25 MB)
 */
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Creates a new backup of the SQLite database
 */
export const createDatabaseBackup = async (
  backupType: 'AUTO' | 'MANUAL' = 'MANUAL'
): Promise<BackupItemDto> => {
  ensureBackupsDir()

  if (!fs.existsSync(DB_SOURCE_PATH)) {
    throw AppError.internal('ملف قاعدة البيانات الرئيسي غير موجود')
  }

  const now = new Date()
  const timestamp = now
    .toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '')

  const fileName = `gymvip_backup_${timestamp}_${backupType.toLowerCase()}.db`
  const targetFilePath = path.join(BACKUPS_DIR, fileName)

  try {
    // 1. Copy database file
    await fs.promises.copyFile(DB_SOURCE_PATH, targetFilePath)

    const stats = await fs.promises.stat(targetFilePath)
    const fileSizeBytes = stats.size

    // 2. Calculate SHA256 checksum
    const fileBuffer = await fs.promises.readFile(targetFilePath)
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex')

    // 3. Save backup record
    const record = await prisma.backupRecord.create({
      data: {
        fileName,
        filePath: targetFilePath,
        fileSizeBytes,
        backupType,
        status: 'COMPLETED',
        checksum,
      },
    })

    logger.info(`[Backup] Created ${backupType} backup successfully: ${fileName} (${formatBytes(fileSizeBytes)})`)

    // 4. Clean up old backups exceeding retention limit
    await pruneOldBackups()

    return {
      id: record.id,
      fileName: record.fileName,
      fileSizeBytes: record.fileSizeBytes,
      fileSizeFormatted: formatBytes(record.fileSizeBytes),
      backupType: record.backupType,
      status: record.status,
      createdAt: record.createdAt.toISOString(),
    }
  } catch (error) {
    logger.error('[Backup] Failed to create database backup:', error)
    throw AppError.internal('فشل في إنشاء النسخة الاحتياطية لقاعدة البيانات')
  }
}

/**
 * Prunes backups older than MAX_BACKUP_RETENTION limit
 */
const pruneOldBackups = async (): Promise<void> => {
  try {
    const allRecords = await prisma.backupRecord.findMany({
      orderBy: { createdAt: 'desc' },
    })

    if (allRecords.length > MAX_BACKUP_RETENTION) {
      const recordsToDelete = allRecords.slice(MAX_BACKUP_RETENTION)

      for (const rec of recordsToDelete) {
        if (fs.existsSync(rec.filePath)) {
          await fs.promises.unlink(rec.filePath).catch(() => {})
        }
        await prisma.backupRecord.delete({ where: { id: rec.id } })
        logger.info(`[Backup] Pruned old backup: ${rec.fileName}`)
      }
    }
  } catch (err) {
    logger.warn('[Backup] Error pruning old backups:', err)
  }
}

/**
 * Lists all available backup records
 */
export const listDatabaseBackups = async (): Promise<BackupItemDto[]> => {
  ensureBackupsDir()

  const records = await prisma.backupRecord.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return records.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    fileSizeBytes: r.fileSizeBytes,
    fileSizeFormatted: formatBytes(r.fileSizeBytes),
    backupType: r.backupType,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }))
}

/**
 * Resolves safe absolute path for backup download
 */
export const getBackupDownloadPath = (fileName: string): string => {
  ensureBackupsDir()

  // Prevent path traversal
  const sanitized = path.basename(fileName)
  const fullPath = path.join(BACKUPS_DIR, sanitized)

  if (!fs.existsSync(fullPath)) {
    throw AppError.notFound('ملف النسخة الاحتياطية غير موجود')
  }

  return fullPath
}

/**
 * Restores database from a selected backup file
 */
export const restoreDatabaseFromBackup = async (fileName: string): Promise<void> => {
  ensureBackupsDir()

  const sanitized = path.basename(fileName)
  const sourceBackup = path.join(BACKUPS_DIR, sanitized)

  if (!fs.existsSync(sourceBackup)) {
    throw AppError.notFound('ملف النسخة الاحتياطية المراد استعادتها غير موجود')
  }

  // Create safety pre-restore backup first
  const preRestoreName = `pre_restore_safety_${Date.now()}.db`
  if (fs.existsSync(DB_SOURCE_PATH)) {
    await fs.promises.copyFile(DB_SOURCE_PATH, path.join(BACKUPS_DIR, preRestoreName))
  }

  // Replace active database file
  await fs.promises.copyFile(sourceBackup, DB_SOURCE_PATH)
  logger.info(`[Backup] Successfully restored database from: ${sanitized}`)
}

/**
 * Initializes automatic daily background backup cron (runs once every 24 hours)
 */
export const initAutoBackupScheduler = (): void => {
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

  // Run initial check: if no backup exists from the last 24 hours, take one now
  setTimeout(async () => {
    try {
      const latestBackup = await prisma.backupRecord.findFirst({
        where: { backupType: 'AUTO' },
        orderBy: { createdAt: 'desc' },
      })

      const now = Date.now()
      if (!latestBackup || now - latestBackup.createdAt.getTime() > TWENTY_FOUR_HOURS_MS) {
        logger.info('[Backup Scheduler] Taking scheduled daily auto-backup...')
        await createDatabaseBackup('AUTO')
      }
    } catch (err) {
      logger.warn('[Backup Scheduler] Daily backup check error:', err)
    }
  }, 10000) // 10 seconds after server start

  // Periodic recurring interval
  setInterval(async () => {
    try {
      logger.info('[Backup Scheduler] Triggering automatic daily database backup...')
      await createDatabaseBackup('AUTO')
    } catch (err) {
      logger.error('[Backup Scheduler] Automatic daily backup failed:', err)
    }
  }, TWENTY_FOUR_HOURS_MS)

  logger.info('[Backup Scheduler] Daily automatic backup daemon initialized.')
}
