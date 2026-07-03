import { Router } from 'express'

import { authenticate } from '../../../middlewares/auth.middleware.js'
import { authorizeRoles } from '../../../middlewares/role.middleware.js'
import { validate } from '../../../middlewares/validate.middleware.js'
import { asyncHandler } from '../../../shared/http/async-handler.js'
import * as controller from '../controllers/doubt-poll.controller.js'
import {
  addDoubtCommentSchema,
  createDoubtPollSchema,
  doubtPollIdSchema,
  listStudentDoubtPollsSchema,
  listTeacherDoubtPollsSchema,
  updateDoubtPreparationSchema,
} from '../validators/doubt-poll.validator.js'

export const doubtPollRouter = Router()

doubtPollRouter.use(authenticate)

doubtPollRouter.get(
  '/student',
  authorizeRoles('student'),
  validate(listStudentDoubtPollsSchema),
  asyncHandler(controller.listStudent),
)
doubtPollRouter.post(
  '/student',
  authorizeRoles('student'),
  validate(createDoubtPollSchema),
  asyncHandler(controller.createStudent),
)
doubtPollRouter.post(
  '/student/:id/vote',
  authorizeRoles('student'),
  validate(doubtPollIdSchema),
  asyncHandler(controller.toggleVote),
)

doubtPollRouter.get(
  '/teacher',
  authorizeRoles('teacher'),
  validate(listTeacherDoubtPollsSchema),
  asyncHandler(controller.listTeacher),
)
doubtPollRouter.patch(
  '/teacher/:id/preparation',
  authorizeRoles('teacher'),
  validate(updateDoubtPreparationSchema),
  asyncHandler(controller.updatePreparation),
)

doubtPollRouter.get(
  '/:id',
  authorizeRoles('student', 'teacher'),
  validate(doubtPollIdSchema),
  asyncHandler(controller.getDetail),
)
doubtPollRouter.post(
  '/:id/comments',
  authorizeRoles('student', 'teacher'),
  validate(addDoubtCommentSchema),
  asyncHandler(controller.addComment),
)
