import type { Request, Response } from 'express'
import { studentService } from '../services/student.service.js'
export async function dashboard(req: Request, res: Response): Promise<void> { res.json({ success: true, data: await studentService.dashboard(req.user!.id) }) }

export async function progress(req: Request, res: Response): Promise<void> {
  const range =
    req.query.range === '7d' ||
    req.query.range === '90d' ||
    req.query.range === 'all'
      ? req.query.range
      : '30d'
  const subjectId =
    typeof req.query.subjectId === 'string'
      ? req.query.subjectId
      : undefined

  res.json({
    success: true,
    data: await studentService.progress(req.user!.id, {
      range,
      ...(subjectId ? { subjectId } : {}),
    }),
  })
}
