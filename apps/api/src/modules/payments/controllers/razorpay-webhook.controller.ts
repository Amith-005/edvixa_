import type { Request, Response } from 'express'

import { AppError } from '../../../shared/errors/app-error.js'
import { bookingService } from '../../bookings/services/booking.service.js'

export async function razorpayWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const signature = req.header('x-razorpay-signature')
  if (!signature) {
    throw new AppError(
      400,
      'Razorpay signature header is missing',
      'WEBHOOK_SIGNATURE_MISSING',
    )
  }

  if (!Buffer.isBuffer(req.body)) {
    throw new AppError(
      400,
      'Webhook body must be raw',
      'WEBHOOK_BODY_INVALID',
    )
  }

  const data = await bookingService.processRazorpayWebhook(req.body, signature)
  res.json({ success: true, data })
}
