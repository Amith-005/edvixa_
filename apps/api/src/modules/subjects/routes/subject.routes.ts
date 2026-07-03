import { Router } from 'express'
import { authenticate } from '../../../middlewares/auth.middleware.js'
import { authorizeRoles } from '../../../middlewares/role.middleware.js'
import { validate } from '../../../middlewares/validate.middleware.js'
import { asyncHandler } from '../../../shared/http/async-handler.js'
import * as controller from '../controllers/subject.controller.js'
import { createSubjectSchema, subjectIdParamsSchema, updateSubjectSchema } from '../validators/subject.validator.js'
export const subjectRouter = Router()
subjectRouter.get('/', asyncHandler(controller.list))
subjectRouter.post('/', authenticate, authorizeRoles('admin'), validate(createSubjectSchema), asyncHandler(controller.create))
subjectRouter.patch('/:id', authenticate, authorizeRoles('admin'), validate(updateSubjectSchema), asyncHandler(controller.update))
subjectRouter.delete('/:id', authenticate, authorizeRoles('admin'), validate(subjectIdParamsSchema), asyncHandler(controller.remove))
