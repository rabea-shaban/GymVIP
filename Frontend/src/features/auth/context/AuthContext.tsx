import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { User, UserRole } from '@/types'
import type { GymProfile } from '@/features/gym/types/gym.types'
import { AuthContextType, LoginCredentials } from '../types'

const MOCK_USER: User = {
  id: 'usr_owner_01',
  name: 'أحمد إبراهيم',
  email: 'ahmed@gymvip.eg',
  phone: '01012345678',
  role: 'OWNER',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

import { authApi } from '../services/authApi'
import { reauthenticateSocket, disconnectSocket } from '@/services/socket'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('gymvip_mock_user')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return null
      }
    }
    return null
  })

  const [gym, setGym] = useState<GymProfile | null>(() => {
    const saved = localStorage.getItem('gymvip_gym')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return null
      }
    }
    return null
  })

  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    if (user) {
      localStorage.setItem('gymvip_mock_user', JSON.stringify(user))
      const token = localStorage.getItem('accessToken') || ''
      reauthenticateSocket(token)
    } else {
      localStorage.removeItem('gymvip_mock_user')
      disconnectSocket()
    }
  }, [user])

  useEffect(() => {
    if (gym) {
      localStorage.setItem('gymvip_gym', JSON.stringify(gym))
      if (gym.name) {
        document.title = `${gym.name} | إدارة الصالات الرياضية`
      }
    } else {
      localStorage.removeItem('gymvip_gym')
      document.title = 'GymVIP | إدارة الصالات الرياضية'
    }
  }, [gym])

  // Verify backend session on mount
  useEffect(() => {
    const verifySession = async () => {
      try {
        const data = await authApi.getMe()
        if (data?.user) {
          const loggedUser: User = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            phone: data.user.phone || '',
            role: data.user.role,
            avatarUrl: data.user.avatarUrl || undefined,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          setUser(loggedUser)
        }
        if (data?.gym) {
          setGym(data.gym)
        }
      } catch (err: any) {
        if (err.response?.status === 401) {
          setUser(null)
          setGym(null)
          localStorage.removeItem('gymvip_mock_user')
          localStorage.removeItem('gymvip_gym')
        }
      }
    }
    verifySession()
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)
    try {
      // 1. Try real backend login
      try {
        const data = await authApi.login({
          email: credentials.phoneOrEmail,
          password: credentials.password || '',
        })
        const loggedUser: User = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone || '',
          role: data.user.role,
          avatarUrl: data.user.avatarUrl || undefined,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        if (data.token) {
          localStorage.setItem('gymvip_token', data.token)
          localStorage.setItem('accessToken', data.token)
          reauthenticateSocket(data.token)
        }
        setUser(loggedUser)
        if (data.gym) {
          setGym(data.gym)
        }
        return
      } catch (err: any) {
        if (
          err.response?.status === 503 ||
          err.message?.includes('Database') ||
          err.response?.data?.message?.includes('Database')
        ) {
          throw new Error('خدمة قاعدة البيانات غير متاحة (MySQL). يرجى التأكد من تشغيل MySQL في XAMPP.')
        }
        // If server responded with an actual validation or authentication error (400, 401, 403), throw message to UI
        if (err.response && err.response.data?.message) {
          throw new Error(err.response.data.message)
        }
        // If server is unreachable (Network Error / dev mode without DB), allow demo mock user fallback
        if (err.code === 'ERR_NETWORK' || !err.response) {
          const role: UserRole = credentials.role || 'OWNER'
          const loggedUser: User = {
            ...MOCK_USER,
            email: credentials.phoneOrEmail.includes('@') ? credentials.phoneOrEmail : 'ahmed@gymvip.eg',
            role,
          }
          setUser(loggedUser)
          return
        }
        throw err
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore network error on logout
    } finally {
      setUser(null)
      setGym(null)
      localStorage.removeItem('gymvip_token')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('gymvip_mock_user')
      localStorage.removeItem('gymvip_gym')
    }
  }, [])

  const updateUserData = useCallback((updated: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null
      const next = { ...prev, ...updated }
      localStorage.setItem('gymvip_mock_user', JSON.stringify(next))
      return next
    })
  }, [])

  const updateGymData = useCallback((updated: Partial<GymProfile>) => {
    setGym((prev) => {
      if (!prev) return updated as GymProfile
      const next = { ...prev, ...updated }
      localStorage.setItem('gymvip_gym', JSON.stringify(next))
      return next
    })
  }, [])

  const switchRole = useCallback((role: UserRole) => {
    setUser((prev) => (prev ? { ...prev, role } : null))
  }, [])

  const hasRole = useCallback((role: UserRole) => {
    return user?.role === role
  }, [user])

  const hasAnyRole = useCallback((roles: UserRole[]) => {
    return user ? roles.includes(user.role) : false
  }, [user])

  return (
    <AuthContext.Provider
      value={{
        user,
        gym,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUserData,
        updateGymData,
        switchRole,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
