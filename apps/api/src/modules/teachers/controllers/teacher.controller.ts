import type { Request, Response } from 'express'

import { teacherDiscoveryService } from '../services/teacher-discovery.service.js'
import { teacherService } from '../services/teacher.service.js'

export async function dashboard(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: await teacherService.dashboard(req.user!.id),
  })
}

export async function listPublic(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: await teacherDiscoveryService.list(
      req.query as Record<string, string | undefined>,
    ),
  })
}

export async function getPublicProfile(
  req: Request,
  res: Response,
): Promise<void> {
  res.json({
    success: true,
    data: await teacherDiscoveryService.getPublicProfile(String(req.params.id)),
  })
}
