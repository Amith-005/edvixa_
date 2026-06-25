import { Router } from 'express'
import { authenticate } from '../../../middlewares/auth.middleware.js'
import { validate } from '../../../middlewares/validate.middleware.js'
import { asyncHandler } from '../../../shared/http/async-handler.js'
import * as controller from '../controllers/user.controller.js'
import { changePasswordSchema, updateMeSchema } from '../validators/user.validator.js'

export const userRouter = Router()
userRouter.use(authenticate)
userRouter.get('/me', asyncHandler(controller.getMe))
userRouter.patch('/me', validate(updateMeSchema), asyncHandler(controller.updateMe))
userRouter.patch('/me/password', validate(changePasswordSchema), asyncHandler(controller.changePassword))
