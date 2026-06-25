import type { Request, Response } from 'express'
import { studentProfileService } from '../services/student-profile.service.js'

export async function getProfile(
  req: Request,
  res: Response,
): Promise<void> {
  res.json({
    success: true,
    data: await studentProfileService.getProfile(req.user!.id),
  })
}

export async function updateProfile(
  req: Request,
  res: Response,
): Promise<void> {
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: await studentProfileService.updateProfile(req.user!.id, req.body),
  })
}
