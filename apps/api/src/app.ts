import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { allowedClientOrigins, env } from './config/env.js'
import { errorHandler, notFound } from './middlewares/error.middleware.js'
import { requestContext } from './middlewares/request-context.middleware.js'
import { requireTrustedOrigin } from './middlewares/trusted-origin.middleware.js'
import { asyncHandler } from './shared/http/async-handler.js'
import { adminRouter } from './modules/admin/routes/admin.routes.js'
import { authRouter } from './modules/auth/routes/auth.routes.js'
import { bookingRouter } from './modules/bookings/routes/booking.routes.js'
import { teacherBookingRouter } from './modules/bookings/routes/teacher-booking.routes.js'
import { teacherSessionRouter } from './modules/bookings/routes/teacher-session.routes.js'
import { teacherEarningsRouter } from './modules/teacher-earnings/routes/teacher-earnings.routes.js'
import { teacherStudentRouter } from './modules/teacher-students/routes/teacher-student.routes.js'
import { doubtPollRouter } from './modules/doubt-polls/routes/doubt-poll.routes.js'
import { practiceRouter } from './modules/practice/routes/practice.routes.js'
import { razorpayWebhook } from './modules/payments/controllers/razorpay-webhook.controller.js'
import { studentRouter } from './modules/students/routes/student.routes.js'
import { subjectRouter } from './modules/subjects/routes/subject.routes.js'
import { teacherRouter } from './modules/teachers/routes/teacher.routes.js'
import { userRouter } from './modules/users/routes/user.routes.js'

export const app = express()
app.disable('x-powered-by')
app.set('trust proxy', env.TRUST_PROXY_HOPS)
app.use(requestContext)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(compression())
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedClientOrigins.includes(origin)) return callback(null, true)
      return callback(null, false)
    },
  }),
)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.API_RATE_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.endsWith('/health') || req.path.endsWith('/ready'),
  }),
)
app.post(
  '/api/v1/payments/razorpay/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  asyncHandler(razorpayWebhook),
)
app.use(requireTrustedOrigin)
app.use(express.json({ limit: '3mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))
app.use(cookieParser())
app.get('/api/v1/health', (_req, res) =>
  res.json({
    success: true,
    data: { service: 'edvixa-api', status: 'ok', timestamp: new Date().toISOString() },
  }),
)
app.get('/api/v1/ready', (_req, res) => {
  const ready = mongoose.connection.readyState === 1
  res.status(ready ? 200 : 503).json({
    success: ready,
    data: { service: 'edvixa-api', status: ready ? 'ready' : 'not-ready' },
  })
})
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/bookings', bookingRouter)
app.use('/api/v1/teacher-bookings', teacherBookingRouter)
app.use('/api/v1/teacher-sessions', teacherSessionRouter)
app.use('/api/v1/teacher-earnings', teacherEarningsRouter)
app.use('/api/v1/teacher-students', teacherStudentRouter)
app.use('/api/v1/doubt-polls', doubtPollRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/students', studentRouter)
app.use('/api/v1/practice', practiceRouter)
app.use('/api/v1/teachers', teacherRouter)
app.use('/api/v1/subjects', subjectRouter)
app.use('/api/v1/admin', adminRouter)
app.use(notFound)
app.use(errorHandler)
