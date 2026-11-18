import { Router } from 'express'
import {
  getInstallationStatusHandler,
  setupAccountHandler,
} from '../controllers/installation.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'

export const installationRouter: Router = Router()

// Public: check installation state (needed on app mount & login page)
installationRouter.get('/status', getInstallationStatusHandler)

// Protected: submit initial account setup (must be authenticated as default admin or owner)
installationRouter.post('/setup-account', requireAuth, setupAccountHandler)

export default installationRouter
