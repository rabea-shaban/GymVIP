import { Router } from 'express'
import { healthRouter } from './health.routes.js'
import { authRouter } from './auth.routes.js'
import { gymRouter } from './gym.routes.js'
import { userRouter } from './user.routes.js'
import { memberRouter } from './member.routes.js'
import { planRouter } from './plan.routes.js'
import { subscriptionRouter } from './subscription.routes.js'
import { paymentRouter } from './payment.routes.js'
import attendanceRouter from './attendance.routes.js'
import { trainerRouter } from './trainer.routes.js'
import { notificationRouter } from './notification.routes.js'
import { dashboardRouter } from './dashboard.routes.js'
import { reportRouter } from './report.routes.js'
import { auditRouter } from './audit.routes.js'
import { exportRouter } from './export.routes.js'
import licenseRouter from './license.routes.js'
import backupRouter from './backup.routes.js'
import installationRouter from './installation.routes.js'
import { requireLicense } from '../middlewares/license.middleware.js'

export const apiRouter: Router = Router()

// 1. Unrestricted Public/Essential Sub-routers
apiRouter.use('/health', healthRouter)
apiRouter.use('/license', licenseRouter)
apiRouter.use('/installation', installationRouter)
apiRouter.use('/auth', authRouter)

// 2. License Guard Middleware (enforces active license on all operational SaaS endpoints)
apiRouter.use(requireLicense)

// 3. Operational Protected Sub-routers
apiRouter.use('/gym', gymRouter)
apiRouter.use('/users', userRouter)
apiRouter.use('/members', memberRouter)
apiRouter.use('/plans', planRouter)
apiRouter.use('/subscriptions', subscriptionRouter)
apiRouter.use('/payments', paymentRouter)
apiRouter.use('/attendance', attendanceRouter)
apiRouter.use('/trainers', trainerRouter)
apiRouter.use('/notifications', notificationRouter)
apiRouter.use('/dashboard', dashboardRouter)
apiRouter.use('/reports', reportRouter)
apiRouter.use('/activity-logs', auditRouter)
apiRouter.use('/exports', exportRouter)
apiRouter.use('/backups', backupRouter)
