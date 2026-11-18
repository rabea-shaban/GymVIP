import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLicenseStatus, activateLicense, type LicenseStatusDto } from '../services/licenseApi'
import { showLicenseActivatedAlert, notifyError } from '../../../lib/sweetAlert'

export const LICENSE_QUERY_KEY = ['systemLicense']

export const useLicense = () => {
  const queryClient = useQueryClient()

  const query = useQuery<LicenseStatusDto>({
    queryKey: LICENSE_QUERY_KEY,
    queryFn: getLicenseStatus,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Background poll every 5 min
    retry: 1,
  })

  const activateMutation = useMutation({
    mutationFn: (key: string) => activateLicense(key),
    onSuccess: (data) => {
      queryClient.setQueryData(LICENSE_QUERY_KEY, data)
      queryClient.invalidateQueries()
      // Non-blocking celebration alert on top layer
      showLicenseActivatedAlert({
        gymName: data.gymName,
        tier: data.tier,
        expiresAt: data.expiresAt,
        maxMembers: data.maxMembers,
        daysRemaining: data.daysRemaining,
      })
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'فشل في تفعيل كود الترخيص'
      notifyError('خطأ في التفعيل', msg)
    },
  })

  return {
    license: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    activate: activateMutation.mutateAsync,
    isActivating: activateMutation.isPending,
  }
}
