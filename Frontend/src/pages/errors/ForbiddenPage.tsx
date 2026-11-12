import React from 'react'
import { NotFoundPage } from './NotFoundPage'

export const ForbiddenPage: React.FC = () => {
  return <NotFoundPage initialType="403" />
}

export default ForbiddenPage
