import React from 'react'
import { AppProviders } from '@/app/providers/AppProviders'
import { AppRouter } from '@/app/router'
import { LicenseGuard } from '@/features/license/components/LicenseGuard'

export const App: React.FC = () => {
  return (
    <AppProviders>
      <LicenseGuard>
        <AppRouter />
      </LicenseGuard>
    </AppProviders>
  )
}

export default App
