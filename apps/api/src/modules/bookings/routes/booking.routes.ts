import { Router } from 'express'

import { authenticate } from '../../../middlewares/auth.middleware.js'
import { authorizeRoles } from '../../../middlewares/role.middleware.js'
import { validate } from '../../../middlewares/validate.middleware.js'
import { asyncHandler } from '../../../shared/http/async-handler.js'
import * as controller from '../controllers/booking.controller.js'
import {
  addStudentReviewSchema,
  bookingIdParamsSchema,
  cancelRazorpayPaymentSchema,
  cancelStudentSessionSchema,
  checkoutSummarySchema,
  createBookingSchema,
  createRazorpayOrderSchema,
  rescheduleStudentSessionSchema,
  studentSessionsQuerySchema,
  verifyRazorpayPaymentSchema,
} from '../validators/booking.validator.js'

export const bookingRouter = Router()

bookingRouter.use(authenticate, authorizeRoles('student'))

bookingRouter.get(
  '/checkout',
  validate(checkoutSummarySchema),
  asyncHandler(controller.checkoutSummary),
)

bookingRouter.post(
  '/payment/order',
  validate(createRazorpayOrderSchema),
  asyncHandler(controller.createRazorpayOrder),
)

bookingRouter.post(
  '/payment/verify',
  validate(verifyRazorpayPaymentSchema),
  asyncHandler(controller.verifyRazorpayPayment),
)

bookingRouter.post(
  '/payment/cancel',
  validate(cancelRazorpayPaymentSchema),
  asyncHandler(controller.cancelRazorpayPayment),
)

bookingRouter.get(
  '/',
  validate(studentSessionsQuerySchema),
  asyncHandler(controller.listStudentSessions),
)

bookingRouter.get(
  '/:id/receipt',
  validate(bookingIdParamsSchema),
  asyncHandler(controller.downloadReceipt),
)

bookingRouter.patch(
  '/:id/cancel',
  validate(cancelStudentSessionSchema),
  asyncHandler(controller.cancelStudentSession),
)

bookingRouter.patch(
  '/:id/reschedule',
  validate(rescheduleStudentSessionSchema),
  asyncHandler(controller.rescheduleStudentSession),
)

bookingRouter.post(
  '/:id/review',
  validate(addStudentReviewSchema),
  asyncHandler(controller.addStudentReview),
)

bookingRouter.post(
  '/',
  validate(createBookingSchema),
  asyncHandler(controller.create),
)
