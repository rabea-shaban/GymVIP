import crypto from 'crypto'

export const generateGymSlug = (name: string): string => {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  const fallback = normalized.length > 0 ? normalized : 'gym'
  const randomSuffix = crypto.randomBytes(3).toString('hex')

  return `${fallback}-${randomSuffix}`
}
