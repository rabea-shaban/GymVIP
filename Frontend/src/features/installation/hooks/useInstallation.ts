import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getInstallationStatus,
  setupInitialAccount,
  type InstallationStatusDto,
  type SetupAccountInput,
} from '../services/installationApi'
import { notifySuccess, notifyError } from '../../../lib/sweetAlert'

export const INSTALLATION_QUERY_KEY = ['systemInstallationStatus']

export const useInstallation = () => {
  const queryClient = useQueryClient()

  const query = useQuery<InstallationStatusDto>({
    queryKey: INSTALLATION_QUERY_KEY,
    queryFn: getInstallationStatus,
    staleTime: 30 * 1000,
    retry: 1,
  })

  const setupMutation = useMutation({
    mutationFn: (data: SetupAccountInput) => setupInitialAccount(data),
    onSuccess: (data) => {
      queryClient.setQueryData(INSTALLATION_QUERY_KEY, data)
      queryClient.invalidateQueries()
      notifySuccess('تم حفظ بيانات الحساب بنجاح!', 'تم تحديث البريد الإلكتروني وكلمة المرور المشفرة. سيتم تحويلك الآن لتفعيل النظام.')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'فشل في تحديث بيانات الحساب'
      notifyError('خطأ في إعداد الحساب', msg)
    },
  })

  return {
    installation: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    setupAccount: setupMutation.mutateAsync,
    isSettingUp: setupMutation.isPending,
  }
}
