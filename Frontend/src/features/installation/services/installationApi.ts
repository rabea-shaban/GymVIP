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
