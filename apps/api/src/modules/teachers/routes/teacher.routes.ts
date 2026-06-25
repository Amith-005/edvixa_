import { Router } from 'express'

import { authenticate } from '../../../middlewares/auth.middleware.js'
import { authorizeRoles } from '../../../middlewares/role.middleware.js'
import { validate } from '../../../middlewares/validate.middleware.js'
import { asyncHandler } from '../../../shared/http/async-handler.js'
import * as controller from '../controllers/teacher.controller.js'
import {
  publicTeacherProfileParamsSchema,
  teacherDiscoveryQuerySchema,
} from '../validators/teacher-discovery.validator.js'

export const teacherRouter = Router()

teacherRouter.get(
  '/',
  validate(teacherDiscoveryQuerySchema),
  asyncHandler(controller.listPublic),
)

teacherRouter.get(
  '/dashboard',
  authenticate,
  authorizeRoles('teacher'),
  asyncHandler(controller.dashboard),
)

teacherRouter.get(
  '/:id',
  validate(publicTeacherProfileParamsSchema),
  asyncHandler(controller.getPublicProfile),
)
