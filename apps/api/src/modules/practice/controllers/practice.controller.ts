import type { Request, Response } from 'express'

import { practiceService } from '../services/practice.service.js'

export async function setup(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await practiceService.getSetup(req.user!.id) })
}

export async function createSession(req: Request, res: Response): Promise<void> {
  res.status(201).json({
    success: true,
    data: await practiceService.createSession(req.user!.id, req.body),
  })
}

export async function getSession(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: await practiceService.getSession(req.user!.id, String(req.params.id)),
  })
}

export async function saveAnswer(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: await practiceService.saveAnswer(
      req.user!.id,
      String(req.params.id),
      req.body,
    ),
  })
}

export async function submitSession(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: await practiceService.submitSession(
      req.user!.id,
      String(req.params.id),
      req.body,
    ),
  })
}

export async function getResult(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: await practiceService.getResult(
      req.user!.id,
      String(req.params.id),
    ),
  })
}

export async function getReview(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: await practiceService.getReview(
      req.user!.id,
      String(req.params.id),
    ),
  })
}

export async function listResults(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: await practiceService.listResults(
      req.user!.id,
      req.query as Record<string, string | undefined>,
    ),
  })
}
