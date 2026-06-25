import { Router } from 'express'
import { authenticate } from '../../../middlewares/auth.middleware.js'
import { authorizeRoles } from '../../../middlewares/role.middleware.js'
import { validate } from '../../../middlewares/validate.middleware.js'
import { asyncHandler } from '../../../shared/http/async-handler.js'
import { dashboard, progress } from '../controllers/student.controller.js'
import { getProfile, updateProfile } from '../controllers/student-profile.controller.js'
import { studentProgressQuerySchema } from '../validators/student.validator.js'
import { updateStudentProfileSchema } from '../validators/student-profile.validator.js'
export const studentRouter = Router()
studentRouter.use(authenticate, authorizeRoles('student'))
studentRouter.get('/dashboard', asyncHandler(dashboard))
studentRouter.get('/profile', asyncHandler(getProfile))
studentRouter.patch(
  '/profile',
  validate(updateStudentProfileSchema),
  asyncHandler(updateProfile),
)
studentRouter.get(
  '/progress',
  validate(studentProgressQuerySchema),
  asyncHandler(progress),
)
