import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate } from '../../../middlewares/auth.middleware.js'
import { authorizeRoles } from '../../../middlewares/role.middleware.js'
import { validate } from '../../../middlewares/validate.middleware.js'
import { asyncHandler } from '../../../shared/http/async-handler.js'
import * as controller from '../controllers/admin.controller.js'
import {
  adminBookingActionSchema,
  adminBookingListSchema,
  adminFeeActionSchema,
  adminFeeListSchema,
  adminIdParamsSchema,
  adminTeacherListSchema,
  adminUserActionSchema,
  adminUserListSchema,
  analyticsSchema,
  announcementListSchema,
  auditListSchema,
  createAnnouncementSchema,
  platformSettingsSchema,
  reportSchema,
  supportListSchema,
  supportUpdateSchema,
  teacherDecisionSchema,
  updateAnnouncementSchema,
} from '../validators/admin.validator.js'

export const adminRouter = Router()
adminRouter.use(authenticate, authorizeRoles('admin'))
adminRouter.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: true, legacyHeaders: false }))

adminRouter.get('/dashboard', asyncHandler(controller.dashboard))
adminRouter.get('/users', validate(adminUserListSchema), asyncHandler(controller.listUsers))
adminRouter.get('/users/:id', validate(adminIdParamsSchema), asyncHandler(controller.userDetails))
adminRouter.patch('/users/:id/action', validate(adminUserActionSchema), asyncHandler(controller.updateUser))

adminRouter.get('/teachers', validate(adminTeacherListSchema), asyncHandler(controller.listTeachers))
adminRouter.get('/teachers/pending', asyncHandler(controller.pendingTeachers))
adminRouter.patch('/teachers/:id/decision', validate(teacherDecisionSchema), asyncHandler(controller.decideTeacher))

adminRouter.get('/bookings', validate(adminBookingListSchema), asyncHandler(controller.listBookings))
adminRouter.patch('/bookings/:id/action', validate(adminBookingActionSchema), asyncHandler(controller.updateBooking))

adminRouter.get('/fees', validate(adminFeeListSchema), asyncHandler(controller.listFees))
adminRouter.patch('/fees/:id/action', validate(adminFeeActionSchema), asyncHandler(controller.updateFee))

adminRouter.get('/analytics', validate(analyticsSchema), asyncHandler(controller.analytics))
adminRouter.get('/reports', validate(reportSchema), asyncHandler(controller.report))

adminRouter.get('/subjects', asyncHandler(controller.listSubjects))

adminRouter.get('/announcements', validate(announcementListSchema), asyncHandler(controller.listAnnouncements))
adminRouter.post('/announcements', validate(createAnnouncementSchema), asyncHandler(controller.createAnnouncement))
adminRouter.patch('/announcements/:id', validate(updateAnnouncementSchema), asyncHandler(controller.updateAnnouncement))

adminRouter.get('/settings', asyncHandler(controller.getSettings))
adminRouter.patch('/settings', validate(platformSettingsSchema), asyncHandler(controller.updateSettings))
adminRouter.get('/roles', asyncHandler(controller.roles))
adminRouter.get('/security', asyncHandler(controller.security))
adminRouter.get('/audit-logs', validate(auditListSchema), asyncHandler(controller.auditLogs))
adminRouter.get('/support', validate(supportListSchema), asyncHandler(controller.supportTickets))
adminRouter.patch('/support/:id', validate(supportUpdateSchema), asyncHandler(controller.updateSupportTicket))
