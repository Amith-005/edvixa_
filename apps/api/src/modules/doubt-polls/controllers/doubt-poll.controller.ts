import type { Request, Response } from 'express'

import { doubtPollService } from '../services/doubt-poll.service.js'

export async function listStudent(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: await doubtPollService.listStudent(
      req.user!.id,
      req.query as unknown as Parameters<typeof doubtPollService.listStudent>[1],
    ),
  })
}

export async function createStudent(req: Request, res: Response): Promise<void> {
  res.status(201).json({
    success: true,
    data: await doubtPollService.create(req.user!.id, req.body),
  })
}

export async function toggleVote(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: await doubtPollService.toggleVote(req.user!.id, String(req.params.id)),
  })
}

export async function getDetail(req: Request, res: Response): Promise<void> {
  const role = req.user!.role === 'teacher' ? 'teacher' : 'student'
  res.json({
    success: true,
    data: await doubtPollService.getDetail(req.user!.id, role, String(req.params.id)),
  })
}

export async function addComment(req: Request, res: Response): Promise<void> {
  const role = req.user!.role === 'teacher' ? 'teacher' : 'student'
  res.status(201).json({
    success: true,
    data: await doubtPollService.addComment(
      req.user!.id,
      role,
      String(req.params.id),
      req.body.body,
    ),
  })
}

export async function listTeacher(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: await doubtPollService.listTeacher(
      req.user!.id,
      req.query as unknown as Parameters<typeof doubtPollService.listTeacher>[1],
    ),
  })
}

export async function updatePreparation(
  req: Request,
  res: Response,
): Promise<void> {
  res.json({
    success: true,
    data: await doubtPollService.updatePreparation(
      req.user!.id,
      String(req.params.id),
      req.body,
    ),
  })
}
