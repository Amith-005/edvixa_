import { Router } from 'express'

import { authenticate } from '../../../middlewares/auth.middleware.js'
import { authorizeRoles } from '../../../middlewares/role.middleware.js'
import { validate } from '../../../middlewares/validate.middleware.js'
import { asyncHandler } from '../../../shared/http/async-handler.js'
import * as controller from '../controllers/practice.controller.js'
import {
  createPracticeSessionSchema,
  listPracticeResultsSchema,
  practiceSessionIdSchema,
  savePracticeAnswerSchema,
  submitPracticeSessionSchema,
} from '../validators/practice.validator.js'

export const practiceRouter = Router()

practiceRouter.use(authenticate, authorizeRoles('student'))
practiceRouter.get('/setup', asyncHandler(controller.setup))
practiceRouter.get(
  '/results',
  validate(listPracticeResultsSchema),
  asyncHandler(controller.listResults),
)

practiceRouter.post(
  '/sessions',
  validate(createPracticeSessionSchema),
  asyncHandler(controller.createSession),
)
practiceRouter.get(
  '/sessions/:id',
  validate(practiceSessionIdSchema),
  asyncHandler(controller.getSession),
)
practiceRouter.patch(
  '/sessions/:id/answers',
  validate(savePracticeAnswerSchema),
  asyncHandler(controller.saveAnswer),
)
practiceRouter.get(
  '/sessions/:id/review',
  validate(practiceSessionIdSchema),
  asyncHandler(controller.getReview),
)

practiceRouter.get(
  '/sessions/:id/result',
  validate(practiceSessionIdSchema),
  asyncHandler(controller.getResult),
)

practiceRouter.post(
  '/sessions/:id/submit',
  validate(submitPracticeSessionSchema),
  asyncHandler(controller.submitSession),
)
