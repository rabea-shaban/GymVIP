import { Router } from 'express'
import { Role } from '@prisma/client'
import * as attendanceController from '../controllers/attendance.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/rbac.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  checkInSchema,
  attendanceFilterSchema,
  attendanceIdParamSchema,
} from '../validators/attendance.validator.js'

const router = Router()

// All attendance routes require authentication and staff roles (OWNER, MANAGER, RECEPTIONIST, TRAINER)
router.use(requireAuth)
router.use(requireRole(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST, Role.TRAINER))

/**
 * @route   POST /api/v1/attendance/check-in
 * @desc    Check-in a member into the gym
 */
router.post('/check-in', validate(checkInSchema, 'body'), attendanceController.checkIn)

/**
 * @route   POST /api/v1/attendance/:id/check-out
 * @desc    Check-out an open attendance record
 */
router.post(
  '/:id/check-out',
  validate(attendanceIdParamSchema, 'params'),
  attendanceController.checkOut
)

/**
 * @route   GET /api/v1/attendance/today
 * @desc    Get summary of today's attendance in Cairo timezone
 */
router.get('/today', attendanceController.getTodaySummary)

/**
 * @route   GET /api/v1/attendance/current
 * @desc    Get all members currently inside the gym
 */
router.get('/current', attendanceController.getCurrentlyInside)

/**
 * @route   GET /api/v1/attendance
 * @desc    List attendance records with filters and pagination
 */
router.get('/', validate(attendanceFilterSchema, 'query'), attendanceController.list)

/**
 * @route   GET /api/v1/attendance/:id
 * @desc    Get single attendance record details
 */
router.get('/:id', validate(attendanceIdParamSchema, 'params'), attendanceController.getById)

export default router
