import { api } from '../../../services/api'

export type InstallationState =
  | 'NOT_INSTALLED'
  | 'INITIAL_LOGIN'
  | 'ACCOUNT_SETUP_REQUIRED'
  | 'ACTIVATION_REQUIRED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SUSPENDED'

export interface InstallationStatusDto {
  state: InstallationState
  isAccountSetupDone: boolean
  isActivated: boolean
  initialAdminEmail: string
  currentAdminEmail?: string
  installedAt?: string
  message: string
}

export interface SetupAccountInput {
  currentEmail: string
  newEmail: string
  confirmNewEmail: string
  newPassword: string
  confirmNewPassword: string
}

export const getInstallationStatus = async (): Promise<InstallationStatusDto> => {
  const response = await api.get('/installation/status')
  return response.data.data
}

export const setupInitialAccount = async (
  data: SetupAccountInput
): Promise<InstallationStatusDto> => {
  const response = await api.post('/installation/setup-account', data)
  return response.data.data
}

export interface CompleteSetupInput {
  name: string
  branchName?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  logo?: string
  subscriptionReminderEnabled?: boolean
  subscriptionReminderDays?: number[]
  subscriptionFreezeEnabled?: boolean
  allowedFreezeDurations?: number[]
  maxFreezeDays?: number
  allowManualCheckout?: boolean
}

export interface WizardDataDto {
  installation: InstallationStatusDto
  license: {
    status: string
    isActivated: boolean
    isValid: boolean
    inGracePeriod: boolean
    tier: string
    maxMembers: number
    daysRemaining: number
    expiresAt: string | null
    activatedAt: string | null
    licenseKey: string | null
    features: string[]
    machineId: string
    message: string
  }
  machineId: string
  gym: {
    id: string
    name: string
    slug: string
    phone: string | null
    email: string | null
    address: string | null
    city: string | null
    logo: string | null
    currency: string
    timezone: string
    setupCompleted: boolean
    subscriptionReminderEnabled: boolean
    subscriptionReminderDays: number[]
    subscriptionFreezeEnabled: boolean
    allowedFreezeDurations: number[]
    maxFreezeDays: number
    allowManualCheckout: boolean
  } | null
  backupsSummary: {
    count: number
    latestBackup: any | null
  }
}

export const getInstallationWizardData = async (): Promise<WizardDataDto> => {
  const response = await api.get('/installation/wizard-data')
  return response.data.data
}

export const completeInstallationSetup = async (
  data: CompleteSetupInput
): Promise<{ success: boolean; message: string; gym: any; installation: InstallationStatusDto }> => {
  const response = await api.post('/installation/complete-setup', data)
  return response.data.data
}
