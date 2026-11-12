import React from 'react'
import { NotFoundPage } from './NotFoundPage'

export const ServerErrorPage: React.FC = () => {
  return <NotFoundPage initialType="500" />
}

export default ServerErrorPage
