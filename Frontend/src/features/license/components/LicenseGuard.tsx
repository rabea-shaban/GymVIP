import React from 'react'
import { useLicense } from '../hooks/useLicense'
import { LicenseLockModal } from './LicenseLockModal'

interface LicenseGuardProps {
  children: React.ReactNode
}

export const LicenseGuard: React.FC<LicenseGuardProps> = ({ children }) => {
  const { license, isLoading } = useLicense()

  // During initial fetch, allow children to mount smoothly
  if (isLoading && !license) {
    return <>{children}</>
  }

  const isBlocked = license && !license.isValid && !license.inGracePeriod

  return (
    <>
      {children}
      {isBlocked && <LicenseLockModal isOpen={true} />}
    </>
  )
}
