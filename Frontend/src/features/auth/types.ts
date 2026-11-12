import { User, UserRole } from '@/types'

export interface LoginCredentials {
  phoneOrEmail: string
  password?: string
  role?: UserRole
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  switchRole: (role: UserRole) => void
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
}
