import { Router } from 'express'
import {
  getInstallationStatusHandler,
  setupAccountHandler,
  getWizardDataHandler,
  completeSetupHandler,
} from '../controllers/installation.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'

export const installationRouter: Router = Router()

// Public: check installation state (needed on app mount & login page)
installationRouter.get('/status', getInstallationStatusHandler)

// Protected: submit initial account setup (must be authenticated as default admin or owner)
installationRouter.post('/setup-account', requireAuth, setupAccountHandler)

// Protected: wizard data and completion
installationRouter.get('/wizard-data', requireAuth, getWizardDataHandler)
installationRouter.post('/complete-setup', requireAuth, completeSetupHandler)

export default installationRouter
