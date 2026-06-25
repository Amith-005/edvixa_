import type { Request, Response } from 'express'

import { bookingService } from '../services/booking.service.js'
import { studentSessionService } from '../services/student-session.service.js'

export async function checkoutSummary(
  req: Request,
  res: Response,
): Promise<void> {
  res.json({
    success: true,
    data: await bookingService.checkoutSummary(
      req.user!.id,
      req.query as {
        teacherId: string
        subjectId: string
        topicId?: string
        topicName: string
        doubtPollId: string
        customTopic?: '0' | '1'
        slotId: string
      },
    ),
  })
}

export async function create(req: Request, res: Response): Promise<void> {
  const data = await bookingService.create(req.user!.id, req.body)
  res.status(201).json({ success: true, data })
}

export async function createRazorpayOrder(
  req: Request,
  res: Response,
): Promise<void> {
  const data = await bookingService.createRazorpayOrder(req.user!.id, req.body)
  res.status(201).json({ success: true, data })
}

export async function verifyRazorpayPayment(
  req: Request,
  res: Response,
): Promise<void> {
  const data = await bookingService.verifyRazorpayPayment(
    req.user!.id,
    req.body,
  )
  res.json({ success: true, data })
}

export async function cancelRazorpayPayment(
  req: Request,
  res: Response,
): Promise<void> {
  const data = await bookingService.cancelRazorpayPayment(
    req.user!.id,
    req.body,
  )
  res.json({ success: true, data })
}

export async function listStudentSessions(
  req: Request,
  res: Response,
): Promise<void> {
  res.json({
    success: true,
    data: await studentSessionService.list(
      req.user!.id,
      req.query as {
        status?: 'all' | 'upcoming' | 'pending' | 'completed' | 'cancelled'
        search?: string
      },
    ),
  })
}

export async function cancelStudentSession(
  req: Request,
  res: Response,
): Promise<void> {
  res.json({
    success: true,
    data: await studentSessionService.cancel(
      req.user!.id,
      String(req.params.id),
      req.body.reason,
    ),
  })
}

export async function rescheduleStudentSession(
  req: Request,
  res: Response,
): Promise<void> {
  res.json({
    success: true,
    data: await studentSessionService.reschedule(
      req.user!.id,
      String(req.params.id),
      req.body,
    ),
  })
}

export async function addStudentReview(
  req: Request,
  res: Response,
): Promise<void> {
  const data = await studentSessionService.addReview(
    req.user!.id,
    String(req.params.id),
    req.body,
  )
  res.status(201).json({ success: true, data })
}

export async function downloadReceipt(
  req: Request,
  res: Response,
): Promise<void> {
  const receipt = await studentSessionService.receipt(
    req.user!.id,
    String(req.params.id),
  )
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${receipt.filename}"`,
  )
  res.send(receipt.content)
}
