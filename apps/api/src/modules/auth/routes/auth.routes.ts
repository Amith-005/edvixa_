import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '../../../shared/http/async-handler.js'
import { validate } from '../../../middlewares/validate.middleware.js'
import * as controller from '../controllers/auth.controller.js'
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from '../validators/auth.validator.js'

export const authRouter = Router()
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false })

authRouter.use(authLimiter)
authRouter.post('/register', validate(registerSchema), asyncHandler(controller.register))
authRouter.post('/login', validate(loginSchema), asyncHandler(controller.login))
authRouter.post('/refresh', asyncHandler(controller.refresh))
authRouter.post('/logout', asyncHandler(controller.logout))
authRouter.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(controller.forgotPassword))
authRouter.post('/reset-password', validate(resetPasswordSchema), asyncHandler(controller.resetPassword))
authRouter.post('/verify-email', validate(verifyEmailSchema), asyncHandler(controller.verifyEmail))
