import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import { getMediaUrl } from '@/lib/media'

/**
 * Custom luxury theme for GymVIP SweetAlert2
 */
export const gymSwal = Swal.mixin({
  background: '#111114',
  color: '#ffffff',
  customClass: {
    container: 'gym-swal-container',
    popup: 'gym-swal-popup font-cairo',
    title: 'gym-swal-title',
    htmlContainer: 'gym-swal-html',
    confirmButton: 'gym-swal-confirm-btn',
    cancelButton: 'gym-swal-cancel-btn',
    actions: 'gym-swal-actions',
  },
  buttonsStyling: false,
})

/**
 * SweetAlert for newly created member
 */
export interface MemberAlertProps {
  name: string
  memberCode: string
  phone: string
  planName?: string
  paidAmount?: number
  avatarUrl?: string | null
}

export const showMemberCreatedAlert = async ({
  name,
  memberCode,
  phone,
  planName,
  paidAmount,
  avatarUrl,
}: MemberAlertProps): Promise<'view' | 'add_another'> => {
  const result = await gymSwal.fire({
    title: 'تم تسجيل العضو بنجاح',
    html: `
      <div style="direction: rtl; text-align: center; padding-top: 6px;">
        <!-- Avatar Preview -->
        <div style="display: flex; justify-content: center; margin-bottom: 14px;">
          ${
            avatarUrl
              ? `<img src="${getMediaUrl(avatarUrl)}" alt="${name}" style="width: 86px; height: 86px; border-radius: 9999px; object-fit: cover; border: 3px solid #D4AF37; box-shadow: 0 0 25px rgba(212, 175, 55, 0.4);" />`
              : `<div style="width: 86px; height: 86px; border-radius: 9999px; background: #1c1c22; color: #F3D372; border: 3px solid #D4AF37; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 900; margin: 0 auto; box-shadow: 0 0 25px rgba(212, 175, 55, 0.3);">${name.slice(0, 2)}</div>`
          }
        </div>

        <!-- Member Name: Pure White with Cairo typography -->
        <h3 style="font-size: 22px; font-weight: 900; color: #ffffff; margin: 0 0 8px 0; font-family: 'Cairo', sans-serif; letter-spacing: -0.2px;">${name}</h3>

        <!-- Membership Code Badge -->
        <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: rgba(212, 175, 55, 0.12); border: 1px solid rgba(212, 175, 55, 0.35); color: #F3D372; padding: 5px 18px; border-radius: 9999px; font-weight: 800; font-family: monospace; font-size: 13px; margin-bottom: 16px; letter-spacing: 0.5px;">
          <span style="opacity: 0.85;">كود العضوية:</span>
          <span style="direction: ltr;">${memberCode}</span>
        </div>

        <!-- Details Card: Dark Translucent Luxury Box -->
        <div style="background: rgba(24, 24, 27, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 18px; padding: 14px 18px; font-size: 13px; color: #e4e4e7; text-align: right; margin-top: 4px; backdrop-filter: blur(10px);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="color: #a1a1aa; font-weight: 600;">رقم الهاتف:</span>
            <span style="font-weight: 700; color: #ffffff; direction: ltr; font-family: monospace; font-size: 13px;">${phone}</span>
          </div>
          ${
            planName
              ? `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="color: #a1a1aa; font-weight: 600;">الاشتراك:</span>
                  <span style="font-weight: 800; color: #F3D372;">${planName}</span>
                </div>`
              : ''
          }
          ${
            paidAmount !== undefined && paidAmount > 0
              ? `<div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed rgba(255, 255, 255, 0.1);">
                  <span style="color: #a1a1aa; font-weight: 600;">المبلغ المسدد:</span>
                  <span style="font-weight: 900; color: #10b981; font-size: 14px;">${paidAmount.toLocaleString('en-US')} ج.م</span>
                </div>`
              : ''
          }
        </div>
      </div>
    `,
    icon: 'success',
    iconColor: '#D4AF37',
    showCancelButton: true,
    confirmButtonText: 'عرض ملف العضو ←',
    cancelButtonText: '+ إضافة عضو آخر',
    reverseButtons: false,
    allowOutsideClick: false,
  })

  return result.isConfirmed ? 'view' : 'add_another'
}

/**
 * SweetAlert for newly created trainer
 */
export interface TrainerAlertProps {
  name: string
  email: string
  phone: string
  specialization?: string | null
}

export const showTrainerCreatedAlert = async ({
  name,
  email,
  phone,
  specialization,
}: TrainerAlertProps): Promise<'view' | 'add_another'> => {
  const result = await gymSwal.fire({
    title: 'تم إضافة المدرب بنجاح',
    html: `
      <div style="direction: rtl; text-align: center; padding-top: 6px;">
        <!-- Avatar Initial Circle -->
        <div style="width: 84px; height: 84px; border-radius: 9999px; background: #1c1c22; color: #F3D372; border: 3px solid #D4AF37; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; margin: 0 auto 12px auto; box-shadow: 0 0 25px rgba(212, 175, 55, 0.35);">
          ${name.slice(0, 2)}
        </div>

        <!-- Trainer Name -->
        <h3 style="font-size: 22px; font-weight: 900; color: #ffffff; margin: 0 0 6px 0; font-family: 'Cairo', sans-serif;">${name}</h3>

        ${
          specialization
            ? `<div style="display: inline-block; background: rgba(212, 175, 55, 0.12); border: 1px solid rgba(212, 175, 55, 0.35); color: #F3D372; padding: 4px 16px; border-radius: 9999px; font-weight: 800; font-size: 12px; margin-bottom: 14px;">
                ${specialization}
              </div>`
            : ''
        }

        <!-- Details Card -->
        <div style="background: rgba(24, 24, 27, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 18px; padding: 14px 18px; font-size: 13px; color: #e4e4e7; text-align: right; margin-top: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="color: #a1a1aa; font-weight: 600;">البريد الإلكتروني:</span>
            <span style="font-weight: 700; color: #ffffff; direction: ltr; font-family: monospace;">${email}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #a1a1aa; font-weight: 600;">رقم الهاتف:</span>
            <span style="font-weight: 700; color: #ffffff; direction: ltr; font-family: monospace;">${phone}</span>
          </div>
        </div>
      </div>
    `,
    icon: 'success',
    iconColor: '#D4AF37',
    showCancelButton: true,
    confirmButtonText: 'عرض ملف المدرب ←',
    cancelButtonText: '+ إضافة مدرب آخر',
    reverseButtons: false,
    allowOutsideClick: false,
  })

  return result.isConfirmed ? 'view' : 'add_another'
}

/**
 * Generic Success Alert
 */
export const showSuccessAlert = (title: string, message?: string) => {
  return gymSwal.fire({
    title,
    text: message,
    icon: 'success',
    iconColor: '#D4AF37',
    confirmButtonText: 'حسناً',
    timer: 2500,
  })
}

/**
 * Generic Error Alert showing exact backend errors list
 */
export const showErrorAlert = (title: string, message?: string, errors?: Array<{ field?: string; message: string }>) => {
  let errorListHtml = ''
  if (errors && errors.length > 0) {
    errorListHtml = `
      <div style="margin-top: 12px; padding: 12px; background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.25); border-radius: 14px; text-align: right;">
        <ul style="margin: 0; padding-right: 18px; font-size: 12px; color: #f43f5e; list-style-type: disc;">
          ${errors.map((e) => `<li style="margin-bottom: 4px;"><strong>${e.field ? e.field + ': ' : ''}</strong>${e.message}</li>`).join('')}
        </ul>
      </div>
    `
  }

  return gymSwal.fire({
    title,
    html: `<div style="color: #e4e4e7;">${message || 'يرجى مراجعة البيانات المدخلة وتصحيح الأخطاء'}${errorListHtml}</div>`,
    icon: 'error',
    iconColor: '#f43f5e',
    confirmButtonText: 'فهمت',
  })
}

/**
 * Standard confirmation dialog
 */
export const showConfirmAlert = async (
  title: string,
  text: string,
  confirmButtonText: string = 'تأكيد',
  cancelButtonText: string = 'إلغاء'
): Promise<boolean> => {
  const result = await gymSwal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
  })
  return result.isConfirmed
}

// Convenient Aliases
export const notifySuccess = showSuccessAlert
export const notifyError = showErrorAlert
export const confirmAction = showConfirmAlert

export interface LicenseActivatedAlertProps {
  gymName?: string | null
  tier?: string | null
  expiresAt?: string | null
  maxMembers?: number | null
  daysRemaining?: number
}

/**
 * Luxury celebration modal upon successful license activation
 */
export const showLicenseActivatedAlert = async ({
  gymName,
  tier = 'PRO',
  expiresAt,
  maxMembers = 500,
  daysRemaining,
}: LicenseActivatedAlertProps): Promise<void> => {
  const formattedDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('ar-EG', { dateStyle: 'long' })
    : 'غير محدد'

  await gymSwal.fire({
    title: 'تهانينا! تم تفعيل رخصة GymVIP بنجاح',
    html: `
      <div style="direction: rtl; text-align: center; padding-top: 8px;">
        <!-- Shield Icon with Glow -->
        <div style="display: flex; justify-content: center; margin-bottom: 16px;">
          <div style="width: 78px; height: 78px; border-radius: 9999px; background: rgba(16, 185, 129, 0.12); border: 2.5px solid #10b981; display: flex; align-items: center; justify-content: center; font-size: 34px; box-shadow: 0 0 35px rgba(16, 185, 129, 0.4);">
            👑
          </div>
        </div>

        <!-- Gym Name -->
        <h3 style="font-size: 22px; font-weight: 900; color: #ffffff; margin: 0 0 6px 0; font-family: 'Cairo', sans-serif;">
          ${gymName || 'نظام GymVIP'}
        </h3>
        <p style="font-size: 13px; color: #a1a1aa; margin: 0 0 16px 0;">النسخة مرخصة ومقفلة على هذا الجهاز بعقد رسمي</p>

        <!-- Tier Badge -->
        <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(212, 175, 55, 0.12); border: 1px solid rgba(212, 175, 55, 0.35); color: #F3D372; padding: 6px 20px; border-radius: 9999px; font-weight: 800; font-size: 13px; margin-bottom: 16px;">
          <span>الباقة المفعلة:</span>
          <span style="font-family: monospace; font-size: 14px; letter-spacing: 0.5px;">${tier}</span>
        </div>

        <!-- Details Card -->
        <div style="background: rgba(24, 24, 27, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 18px; padding: 16px 20px; font-size: 13px; color: #e4e4e7; text-align: right; backdrop-filter: blur(10px);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="color: #a1a1aa; font-weight: 600;">تاريخ الانتهاء:</span>
            <span style="font-weight: 800; color: #ffffff;">${formattedDate}</span>
          </div>
          ${
            daysRemaining !== undefined
              ? `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <span style="color: #a1a1aa; font-weight: 600;">المدة المتبقية:</span>
                  <span style="font-weight: 800; color: #10b981;">${daysRemaining} يوم</span>
                </div>`
              : ''
          }
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px dashed rgba(255, 255, 255, 0.1);">
            <span style="color: #a1a1aa; font-weight: 600;">سعة الأعضاء المسموحة:</span>
            <span style="font-weight: 900; color: #F3D372; font-size: 14px;">${maxMembers} عضو</span>
          </div>
        </div>
      </div>
    `,
    icon: 'success',
    iconColor: '#10b981',
    confirmButtonText: 'ابدأ العمل بالنظام الآن',
  })
}
