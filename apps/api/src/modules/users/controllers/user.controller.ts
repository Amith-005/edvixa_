import type { Request, Response } from 'express'
import { userService } from '../services/user.service.js'

export async function getMe(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await userService.getMe(req.user!.id) })
}
export async function updateMe(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await userService.updateMe(req.user!.id, req.body) })
}
export async function changePassword(req: Request, res: Response): Promise<void> {
  await userService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword)
  res.json({ success: true, message: 'Password changed. Please sign in again.' })
}
