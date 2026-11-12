import { Router } from 'express'
import {
  getHealth,
  getDatabaseHealth,
} from '../controllers/health.controller.js'

export const healthRouter: Router = Router()

healthRouter.get('/', getHealth)
healthRouter.get('/database', getDatabaseHealth)
