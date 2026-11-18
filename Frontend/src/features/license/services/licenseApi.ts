import { api } from '../../../services/api'

export interface LicenseStatusDto {
  isActivated: boolean
  isValid: boolean
  status: 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'NOT_ACTIVATED' | 'MACHINE_MISMATCH' | 'TAMPERED' | 'INVALID_SIGNATURE'
  machineId: string
  gymName?: string | null
  tier?: string | null
  maxMembers?: number | null
  currentMembersCount?: number
  daysRemaining?: number
  expiresAt?: string | null
  inGracePeriod?: boolean
  message: string
}

export const getLicenseStatus = async (): Promise<LicenseStatusDto> => {
  const response = await api.get('/license/status')
  return response.data.data
}

export const getMachineId = async (): Promise<string> => {
  const response = await api.get('/license/machine-id')
  return response.data.data.machineId
}

export const activateLicense = async (licenseKey: string): Promise<LicenseStatusDto> => {
  const response = await api.post('/license/activate', { licenseKey })
  return response.data.data
}
