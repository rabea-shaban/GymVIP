import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useInstallation } from '../hooks/useInstallation'
import { useAuth } from '../../auth/context/AuthContext'

interface InstallationGuardProps {
  children: React.ReactNode
}

export const InstallationGuard: React.FC<InstallationGuardProps> = ({ children }) => {
  const { installation, isLoading } = useInstallation()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const location = useLocation()

  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center text-amber-400 font-cairo">
        <div className="w-8 h-8 border-3 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mb-3" />
        <span className="text-xs text-zinc-400">جاري فحص حالة تثبيت وترخيص النظام...</span>
      </div>
    )
  }

  const currentPath = location.pathname

  if (!installation) {
    return <>{children}</>
  }

  // 1. Initial Login Phase
  if (installation.state === 'INITIAL_LOGIN' && !isAuthenticated) {
    if (currentPath !== '/login') {
      return <Navigate to="/login" replace />
    }
    return <>{children}</>
  }

  // 2. Account Setup Required Phase
  if (!installation.isAccountSetupDone || installation.state === 'ACCOUNT_SETUP_REQUIRED') {
    if (currentPath !== '/initial-setup') {
      return <Navigate to="/initial-setup" replace />
    }
    return <>{children}</>
  }

  // 3. Setup Wizard & Activation Phase
  if (!installation.isActivated || installation.state === 'ACTIVATION_REQUIRED' || installation.state === 'EXPIRED' || installation.state === 'SUSPENDED') {
    if (currentPath !== '/setup' && currentPath !== '/activation') {
      return <Navigate to="/setup" replace />
    }
    return <>{children}</>
  }

  // 4. System is ACTIVE: do not allow navigating back to initial setup, activation or wizard
  if (installation.state === 'ACTIVE' && (currentPath === '/initial-setup' || currentPath === '/activation' || currentPath === '/setup')) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <>{children}</>
}

export default InstallationGuard
