import type { Response, CookieOptions } from 'express'
import { env } from '../config/env.js'

export const AUTH_COOKIE_NAME = 'gymvip_token'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export const getAuthCookieOptions = (): CookieOptions => {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SEVEN_DAYS_MS,
  }
}

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions())
}

export const clearAuthCookie = (res: Response): void => {
  res.cookie(AUTH_COOKIE_NAME, '', {
    ...getAuthCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  })
}
