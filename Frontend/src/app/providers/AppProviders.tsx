import React from 'react'
import { QueryProvider } from './QueryProvider'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { ToastProvider } from '@/components/feedback/Toast'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'

interface AppProvidersProps {
  children: React.ReactNode
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}

export default AppProviders
