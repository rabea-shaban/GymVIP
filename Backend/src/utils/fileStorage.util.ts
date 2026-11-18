import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { logger } from './logger.util.js'

export const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads')
export const UPLOAD_SUBFOLDERS = ['members', 'users', 'gyms'] as const
export type UploadSubfolder = (typeof UPLOAD_SUBFOLDERS)[number]

/**
 * Ensure all upload directories exist on disk
 */
export const ensureUploadDirs = (): void => {
  if (!fs.existsSync(UPLOADS_ROOT)) {
    fs.mkdirSync(UPLOADS_ROOT, { recursive: true })
  }
  for (const folder of UPLOAD_SUBFOLDERS) {
    const fullPath = path.join(UPLOADS_ROOT, folder)
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true })
    }
  }
}

/**
 * Detect image extension from MIME type or base64 header
 */
const detectExtension = (mimeOrHeader: string): string => {
  const lower = mimeOrHeader.toLowerCase()
  if (lower.includes('png')) return 'png'
  if (lower.includes('webp')) return 'webp'
  if (lower.includes('gif')) return 'gif'
  if (lower.includes('svg')) return 'svg'
  return 'jpg'
}

/**
 * Saves a base64 image data string into a local file inside Backend/uploads/<subfolder>/
 * Returns the public relative path, e.g. "/uploads/members/member-uuid-timestamp.jpg"
 * If input is already an external URL or existing /uploads/ path, it is returned unchanged.
 */
export const saveBase64Image = async (
  dataString: string | null | undefined,
  subfolder: UploadSubfolder,
  prefix: string = 'img'
): Promise<string | null> => {
  if (!dataString) return null

  const trimmed = dataString.trim()
  if (!trimmed) return null

  // If already a static uploaded file or external web URL, don't re-save
  if (
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed
  }

  ensureUploadDirs()

  // Extract MIME and base64 payload
  let base64Payload = trimmed
  let ext = 'jpg'

  const dataUriMatch = trimmed.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/s)
  if (dataUriMatch && dataUriMatch[1] && dataUriMatch[2]) {
    ext = detectExtension(dataUriMatch[1])
    base64Payload = dataUriMatch[2]
  } else if (trimmed.startsWith('data:')) {
    // Other data URI pattern
    const commaIndex = trimmed.indexOf(',')
    if (commaIndex !== -1) {
      const header = trimmed.slice(0, commaIndex)
      ext = detectExtension(header)
      base64Payload = trimmed.slice(commaIndex + 1)
    }
  }

  try {
    const buffer = Buffer.from(base64Payload, 'base64')
    if (buffer.length === 0) {
      return null
    }

    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_')
    const uniqueHash = crypto.randomBytes(6).toString('hex')
    const fileName = `${cleanPrefix}-${Date.now()}-${uniqueHash}.${ext}`
    const targetFilePath = path.join(UPLOADS_ROOT, subfolder, fileName)

    await fs.promises.writeFile(targetFilePath, buffer)
    logger.info(`[FileStorage] Saved image to disk: ${subfolder}/${fileName} (${buffer.length} bytes)`)

    return `/uploads/${subfolder}/${fileName}`
  } catch (error) {
    logger.error('[FileStorage] Failed to decode and save base64 image:', error)
    return null
  }
}

/**
 * Deletes an existing uploaded file from disk if it starts with /uploads/
 */
export const deleteStoredImage = async (fileUrl?: string | null): Promise<void> => {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) return

  try {
    // Sanitize and resolve file path inside UPLOADS_ROOT
    const relativePart = fileUrl.replace(/^\/uploads\//, '')
    const targetPath = path.resolve(UPLOADS_ROOT, relativePart)

    // Security check: ensure targetPath is strictly within UPLOADS_ROOT
    if (!targetPath.startsWith(UPLOADS_ROOT)) {
      logger.warn(`[FileStorage] Path traversal attempt prevented: ${fileUrl}`)
      return
    }

    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath)
      logger.info(`[FileStorage] Deleted stored file: ${fileUrl}`)
    }
  } catch (error) {
    logger.warn(`[FileStorage] Failed to delete file ${fileUrl}:`, error)
  }
}
