import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { UserRole } from '@/types'
import { UnauthorizedPage } from '@/pages/errors/UnauthorizedPage'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  children?: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gym-bg">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gym-gold"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <UnauthorizedPage
        attemptedPath={location.pathname}
        allowedRoles={allowedRoles}
        standalone={!location.pathname.startsWith('/app')}
      />
    )
  }

  return children ? <>{children}</> : <Outlet />
}
