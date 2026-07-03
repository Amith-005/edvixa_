import type { Request, Response } from 'express'
import { subjectService } from '../services/subject.service.js'
export async function list(req: Request, res: Response): Promise<void> { res.json({ success: true, data: await subjectService.list(req.user?.role !== 'admin') }) }
export async function create(req: Request, res: Response): Promise<void> { res.status(201).json({ success: true, data: await subjectService.create(req.body, req.user!.id) }) }
export async function update(req: Request, res: Response): Promise<void> { res.json({ success: true, data: await subjectService.update(String(req.params.id), req.body) }) }
export async function remove(req: Request, res: Response): Promise<void> { res.json({ success: true, data: await subjectService.remove(String(req.params.id)) }) }
