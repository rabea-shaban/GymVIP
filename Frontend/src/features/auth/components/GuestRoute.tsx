import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface GuestRouteProps {
  children?: React.ReactNode
}

export const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
