import type { CookieOptions, Request, Response } from 'express'
import { env } from '../../../config/env.js'
import { authService } from '../services/auth.service.js'

const refreshCookie = 'edvixa_refresh'
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  path: '/api/v1/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
}

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body, req)
  res.cookie(refreshCookie, result.refreshToken, cookieOptions)
  res.status(201).json({ success: true, data: { accessToken: result.accessToken, user: result.user } })
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body.email, req.body.password, req)
  res.cookie(refreshCookie, result.refreshToken, cookieOptions)
  res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } })
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const result = await authService.refresh(req.cookies[refreshCookie])
  res.cookie(refreshCookie, result.refreshToken, cookieOptions)
  res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } })
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(req.cookies[refreshCookie])
  res.clearCookie(refreshCookie, { ...cookieOptions, maxAge: undefined })
  res.status(204).send()
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  await authService.forgotPassword(req.body.email, req.ip)
  res.json({ success: true, message: 'If the account exists, a reset OTP has been sent.' })
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await authService.resetPassword(req.body.email, req.body.otp, req.body.newPassword)
  res.json({ success: true, message: 'Password reset successfully.' })
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  await authService.verifyEmail(req.body.token)
  res.json({ success: true, message: 'Email verified successfully.' })
}


export async function resendVerification(req: Request, res: Response): Promise<void> {
  await authService.resendVerification(req.body.email)
  res.json({ success: true, message: 'If verification is still required, a new email has been sent.' })
}
