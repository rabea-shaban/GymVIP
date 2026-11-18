import { User, UserRole } from '@/types'
import type { GymProfile } from '@/features/gym/types/gym.types'

export interface LoginCredentials {
  phoneOrEmail: string
  password?: string
  role?: UserRole
}

export interface AuthContextType {
  user: User | null
  gym: GymProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  updateUserData: (updated: Partial<User>) => void
  updateGymData: (updated: Partial<GymProfile>) => void
  switchRole: (role: UserRole) => void
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
}
