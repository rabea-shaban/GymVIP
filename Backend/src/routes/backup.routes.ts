import { Router } from 'express'
import {
  listBackupsHandler,
  createBackupHandler,
  downloadBackupHandler,
  restoreBackupHandler,
} from '../controllers/backup.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/rbac.middleware.js'
import { Role } from '@prisma/client'

const router = Router()

router.use(requireAuth)
router.use(requireRole(Role.OWNER, Role.MANAGER))

router.get('/', listBackupsHandler)
router.post('/', createBackupHandler)
router.get('/:fileName/download', downloadBackupHandler)
router.post('/:fileName/restore', restoreBackupHandler)

export default router
