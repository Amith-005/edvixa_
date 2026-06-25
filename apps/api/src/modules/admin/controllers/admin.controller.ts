import type { Request, Response } from 'express'
import { adminService } from '../services/admin.service.js'
export async function dashboard(_req: Request, res: Response): Promise<void> { res.json({ success: true, data: await adminService.dashboard() }) }
export async function pendingTeachers(_req: Request, res: Response): Promise<void> { res.json({ success: true, data: await adminService.pendingTeachers() }) }
export async function decideTeacher(req: Request, res: Response): Promise<void> { res.json({ success: true, data: await adminService.decideTeacher(String(req.params.id), req.user!.id, req.body.decision, req.body.reason) }) }
export async function userDetails(req: Request, res: Response): Promise<void> { res.json({ success: true, data: await adminService.userDetails(String(req.params.id)) }) }
