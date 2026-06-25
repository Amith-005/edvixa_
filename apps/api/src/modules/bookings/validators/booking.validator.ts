import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID')

const selectionSchema = z
  .object({
    teacherId: objectId,
    subjectId: objectId,
    topicId: objectId.optional(),
    topicName: z.string().trim().min(2).max(120),
    doubtPollId: objectId,
    customTopic: z.enum(['0', '1']).optional(),
    slotId: objectId,
  })
  .refine((value) => value.customTopic === '1' || Boolean(value.topicId), {
    message: 'Select a chapter or provide a custom topic',
    path: ['topicId'],
  })

const paymentPreferenceSchema = z.object({
  paymentMethod: z.enum(['upi', 'card', 'netbanking', 'wallet']),
  studentNote: z.string().trim().max(500).optional().default(''),
  agreedToTerms: z.literal(true),
})

export const checkoutSummarySchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).optional(),
  query: selectionSchema,
})

export const createBookingSchema = z.object({
  body: selectionSchema.extend(paymentPreferenceSchema.shape),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})

export const createRazorpayOrderSchema = createBookingSchema

export const verifyRazorpayPaymentSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().trim().min(1).max(100),
    razorpayPaymentId: z.string().trim().min(1).max(100),
    razorpaySignature: z.string().trim().regex(/^[a-f\d]{64}$/i),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})

export const cancelRazorpayPaymentSchema = z.object({
  body: z.object({
    orderId: z.string().trim().min(1).max(100),
    reason: z.string().trim().max(240).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})

export const studentSessionsQuerySchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).optional(),
  query: z.object({
    status: z
      .enum(['all', 'upcoming', 'pending', 'completed', 'cancelled'])
      .optional()
      .default('all'),
    search: z.string().trim().max(100).optional().default(''),
  }),
})

export const bookingIdParamsSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
})

export const cancelStudentSessionSchema = z.object({
  body: z.object({
    reason: z.string().trim().max(300).optional().default(''),
  }),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
})

export const rescheduleStudentSessionSchema = z.object({
  body: z.object({
    slotId: objectId,
    reason: z.string().trim().max(300).optional().default(''),
  }),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
})

export const addStudentReviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    review: z.string().trim().min(5).max(1200),
  }),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
})
