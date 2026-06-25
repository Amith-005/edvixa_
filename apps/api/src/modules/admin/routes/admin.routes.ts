import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../../middlewares/auth.middleware.js'
import { authorizeRoles } from '../../../middlewares/role.middleware.js'
import { validate } from '../../../middlewares/validate.middleware.js'
import { asyncHandler } from '../../../shared/http/async-handler.js'
import * as controller from '../controllers/admin.controller.js'
export const adminRouter = Router()
adminRouter.use(authenticate, authorizeRoles('admin'))
adminRouter.get('/dashboard', asyncHandler(controller.dashboard))
adminRouter.get('/teachers/pending', asyncHandler(controller.pendingTeachers))
adminRouter.patch('/teachers/:id/decision', validate(z.object({ params: z.object({ id: z.string().min(1) }), body: z.object({ decision: z.enum(['approved', 'rejected']), reason: z.string().max(500).optional() }) })), asyncHandler(controller.decideTeacher))
adminRouter.get('/users/:id', asyncHandler(controller.userDetails))
