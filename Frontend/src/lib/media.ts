/**
 * Resolves an avatar or image URL to ensure it loads properly whether
 * it is a base64 string, absolute external URL, or uploaded backend file path (/uploads/...)
 */
export const getMediaUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined

  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed
  }

  if (trimmed.startsWith('/uploads/')) {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
      const origin = new URL(apiUrl).origin
      return `${origin}${trimmed}`
    } catch {
      return `http://localhost:5000${trimmed}`
    }
  }

  return trimmed
}
