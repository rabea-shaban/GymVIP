import { Router } from 'express'
import {
  getLicenseStatusHandler,
  getMachineIdHandler,
  activateLicenseHandler,
} from '../controllers/license.controller.js'

const router = Router()

// Public endpoints (no auth required so system can be activated before login)
router.get('/status', getLicenseStatusHandler)
router.get('/machine-id', getMachineIdHandler)
router.post('/activate', activateLicenseHandler)

export default router
