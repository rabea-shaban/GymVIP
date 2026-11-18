import { useAuth } from '@/features/auth/context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gymApi } from '../services/gymApi'
import type { GymProfile, UpdateGymInput } from '../types/gym.types'

export const useGym = () => {
  const { gym: authGym, updateGymData } = useAuth()
  const queryClient = useQueryClient()

  // Query to keep gym settings fresh
  const {
    data: fetchedGym,
    isLoading,
    refetch,
  } = useQuery<GymProfile>({
    queryKey: ['gym-profile'],
    queryFn: async () => {
      const profile = await gymApi.getProfile()
      updateGymData(profile)
      return profile
    },
    initialData: authGym || undefined,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Preferred gym is fetchedGym or fallback to authGym
  const currentGym = fetchedGym || authGym

  const updateMutation = useMutation({
    mutationFn: (data: UpdateGymInput) => gymApi.updateSettings(data),
    onSuccess: (updatedGym) => {
      queryClient.setQueryData(['gym-profile'], updatedGym)
      queryClient.invalidateQueries({ queryKey: ['gym-profile'] })
      updateGymData(updatedGym)
    },
  })

  return {
    gym: currentGym,
    isLoading,
    refetch,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateGymData,
  }
}

export default useGym
