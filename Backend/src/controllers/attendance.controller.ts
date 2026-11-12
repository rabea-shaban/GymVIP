import type { Request, Response, NextFunction } from 'express'
import * as attendanceService from '../services/attendance.service.js'
import { sendSuccess } from '../utils/response.util.js'
import type { AttendanceFilterQuery } from '../types/attendance.types.js'

export async function checkIn(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const { memberId } = req.body
    const attendance = await attendanceService.checkInMember(gymId, memberId, req.user?.id)
    sendSuccess(res, 201, 'تم تسجيل الحضور بنجاح', { attendance })
  } catch (error) {
    next(error)
  }
}

export async function checkOut(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const { id } = req.params
    const attendance = await attendanceService.checkOutAttendance(gymId, id!, req.user?.id)
    sendSuccess(res, 200, 'تم تسجيل الانصراف بنجاح', { attendance })
  } catch (error) {
    next(error)
  }
}

export async function checkOutByMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const { memberId } = req.params
    const attendance = await attendanceService.checkOutMember(gymId, memberId!, req.user?.id)
    sendSuccess(res, 200, 'تم تسجيل الانصراف بنجاح', { attendance })
  } catch (error) {
    next(error)
  }
}

export async function getMemberCurrent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const { memberId } = req.params
    const attendance = await attendanceService.getMemberCurrentAttendance(gymId, memberId!)
    sendSuccess(res, 200, 'Current attendance', { attendance })
  } catch (error) {
    next(error)
  }
}

export async function list(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const query = req.query as unknown as AttendanceFilterQuery
    const result = await attendanceService.getAttendanceList(gymId, query)
    sendSuccess(res, 200, 'Attendance retrieved successfully', result)
  } catch (error) {
    next(error)
  }
}

export async function getTodaySummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const result = await attendanceService.getTodayAttendanceSummary(gymId)
    sendSuccess(res, 200, 'Today attendance summary retrieved', result)
  } catch (error) {
    next(error)
  }
}

export async function getCurrentlyInside(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const attendance = await attendanceService.getCurrentlyInside(gymId)
    sendSuccess(res, 200, 'Currently inside members retrieved', { attendance })
  } catch (error) {
    next(error)
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const { id } = req.params
    const attendance = await attendanceService.getAttendanceById(gymId, id!)
    sendSuccess(res, 200, 'Attendance details retrieved', { attendance })
  } catch (error) {
    next(error)
  }
}

export async function getMemberHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const gymId = req.user!.gymId
    const { memberId } = req.params
    const attendance = await attendanceService.getMemberAttendanceHistory(gymId, memberId!)
    sendSuccess(res, 200, 'Member attendance history retrieved', { attendance })
  } catch (error) {
    next(error)
  }
}
