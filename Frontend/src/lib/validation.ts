/**
 * GymVIP Comprehensive Input Validation & Normalization Library
 */

/**
 * Normalizes Egyptian phone numbers:
 * - Converts Arabic-Indic numerals (٠-٩) to English (0-9)
 * - Strips whitespace, dashes, dots, brackets
 * - Strips +20, 0020, 20
 * - Adds leading 0 if 10 digits starting with 1
 */
export const normalizePhone = (val: unknown): string => {
  if (!val) return ''
  let s = String(val)
    .trim()
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\s\-\(\)\.]/g, '')
  if (s.startsWith('0020')) s = s.slice(4)
  else if (s.startsWith('+20')) s = s.slice(3)
  else if (s.startsWith('20') && s.length === 12) s = s.slice(2)
  if (!s.startsWith('0') && s.length === 10) s = '0' + s
  return s
}

export const EGYPTIAN_PHONE_REGEX = /^01[0125][0-9]{8}$/
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validates Egyptian mobile phone number
 */
export const validateEgyptianPhone = (
  phone: string,
  required: boolean = true,
  label: string = 'رقم الهاتف'
): { isValid: boolean; normalized: string; error?: string } => {
  const normalized = normalizePhone(phone)
  if (!normalized) {
    if (required) {
      return { isValid: false, normalized: '', error: `${label} مطلوب` }
    }
    return { isValid: true, normalized: '' }
  }

  if (!EGYPTIAN_PHONE_REGEX.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'يرجى إدخال رقم هاتف مصري صحيح (11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015)',
    }
  }

  return { isValid: true, normalized }
}

/**
 * Validates full name / text input
 */
export const validateName = (
  name: string,
  label: string = 'الاسم',
  min: number = 2,
  max: number = 100
): { isValid: boolean; error?: string } => {
  const trimmed = (name || '').trim()
  if (!trimmed) {
    return { isValid: false, error: `${label} مطلوب` }
  }
  if (trimmed.length < min) {
    return { isValid: false, error: `يجب أن يتكون ${label} من ${min} أحرف على الأقل` }
  }
  if (trimmed.length > max) {
    return { isValid: false, error: `${label} طويل جداً (الحد الأقصى ${max} حرف)` }
  }
  return { isValid: true }
}

/**
 * Validates email
 */
export const validateEmail = (
  email: string,
  required: boolean = false
): { isValid: boolean; error?: string } => {
  const trimmed = (email || '').trim()
  if (!trimmed) {
    if (required) {
      return { isValid: false, error: 'البريد الإلكتروني مطلوب' }
    }
    return { isValid: true }
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: 'صيغة البريد الإلكتروني غير صحيحة (مثال: user@gymvip.com)' }
  }

  return { isValid: true }
}

/**
 * Validates Date of Birth
 */
export const validateDateOfBirth = (
  val: string,
  required: boolean = false
): { isValid: boolean; error?: string } => {
  if (!val || !val.trim()) {
    if (required) return { isValid: false, error: 'تاريخ الميلاد مطلوب' }
    return { isValid: true }
  }

  let s = val.trim().replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (dmy && dmy[1] && dmy[2] && dmy[3]) {
    s = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  }

  const d = new Date(s)
  if (isNaN(d.getTime())) {
    return { isValid: false, error: 'صيغة تاريخ الميلاد غير صحيحة' }
  }

  const today = new Date()
  if (d > today) {
    return { isValid: false, error: 'تاريخ الميلاد لا يمكن أن يكون في المستقبل' }
  }

  const age = (today.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000)
  if (age < 4 || age > 110) {
    return { isValid: false, error: 'يرجى إدخال تاريخ ميلاد منطقي' }
  }

  return { isValid: true }
}

/**
 * Validates Password
 */
export const validatePassword = (
  password: string,
  required: boolean = true
): { isValid: boolean; error?: string } => {
  if (!password || !password.trim()) {
    if (required) return { isValid: false, error: 'كلمة المرور مطلوبة' }
    return { isValid: true }
  }

  if (password.length < 8) {
    return { isValid: false, error: 'كلمة المرور يجب أن لا تقل عن 8 أحرف' }
  }

  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  if (!hasLetter || !hasNumber) {
    return { isValid: false, error: 'يجب أن تحتوي كلمة المرور على أحرف وأرقام معاً' }
  }

  return { isValid: true }
}

/**
 * Extracts and maps field-level errors from backend Axios responses
 */
export const extractBackendErrors = (err: any): { fieldErrors: Record<string, string>; generalMessage: string } => {
  const fieldErrors: Record<string, string> = {}
  let generalMessage = err.response?.data?.message || err.message || 'حدث خطأ في معالجة البيانات'

  const rawErrors = err.response?.data?.errors
  if (Array.isArray(rawErrors)) {
    rawErrors.forEach((e: any) => {
      if (e.field) {
        fieldErrors[e.field] = e.message
      }
    })
    const messages = rawErrors.map((e: any) => e.message).filter(Boolean)
    if (messages.length > 0) {
      generalMessage = messages.join(' • ')
    }
  }

  return { fieldErrors, generalMessage }
}
