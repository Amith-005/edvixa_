import { z } from 'zod'
import { ianaTimezoneSchema } from '../../../shared/validation/iana-timezone.js'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier')
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}

export const adminUserListSchema = z.object({
  query: z.object({
    ...pagination,
    search: z.string().trim().max(120).optional(),
    role: z.enum(['all', 'student', 'teacher', 'admin']).default('all'),
    status: z.enum(['all', 'active', 'inactive', 'banned', 'unverified']).default('all'),
    sort: z.enum(['newest', 'oldest', 'name', 'lastLogin']).default('newest'),
  }),
})

export const adminIdParamsSchema = z.object({ params: z.object({ id: objectId }) })

export const adminUserActionSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.discriminatedUnion('action', [
    z.object({ action: z.literal('activate') }),
    z.object({ action: z.literal('deactivate'), reason: z.string().trim().min(3).max(500) }),
    z.object({ action: z.literal('ban'), reason: z.string().trim().min(3).max(500) }),
    z.object({ action: z.literal('unban') }),
    z.object({ action: z.literal('verify-email') }),
  ]),
})

export const adminTeacherListSchema = z.object({
  query: z.object({
    ...pagination,
    search: z.string().trim().max(120).optional(),
    status: z.enum(['all', 'draft', 'pending', 'approved', 'rejected']).default('all'),
  }),
})

export const teacherDecisionSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      decision: z.enum(['approved', 'rejected']),
      reason: z.string().trim().max(500).optional(),
    })
    .superRefine((value, context) => {
      if (value.decision === 'rejected' && (!value.reason || value.reason.length < 3)) {
        context.addIssue({ code: 'custom', path: ['reason'], message: 'A rejection reason is required' })
      }
    }),
})

export const adminBookingListSchema = z.object({
  query: z.object({
    ...pagination,
    search: z.string().trim().max(120).optional(),
    status: z.enum(['all', 'pending', 'accepted', 'rejected', 'upcoming', 'awaiting_completion', 'completed', 'cancelled', 'rescheduled']).default('all'),
    paymentStatus: z.enum(['all', 'pending', 'paid', 'failed', 'refunded']).default('all'),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
})

export const adminBookingActionSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.discriminatedUnion('action', [
    z.object({ action: z.literal('cancel'), reason: z.string().trim().min(3).max(500) }),
    z.object({ action: z.literal('mark-completed'), reason: z.string().trim().max(500).optional() }),
  ]),
})

export const adminFeeListSchema = z.object({
  query: z.object({
    ...pagination,
    search: z.string().trim().max(120).optional(),
    status: z.enum(['all', 'pending', 'paid', 'failed', 'refunded']).default('all'),
    payoutStatus: z.enum(['all', 'pending', 'approved', 'paid', 'failed']).default('all'),
  }),
})

export const adminFeeActionSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.discriminatedUnion('action', [
    z.object({ action: z.literal('request-refund'), reason: z.string().trim().min(3).max(500) }),
    z.object({ action: z.literal('approve-payout') }),
    z.object({ action: z.literal('mark-payout-paid') }),
  ]),
})

export const analyticsSchema = z.object({
  query: z.object({ range: z.enum(['7d', '30d', '90d', '12m']).default('30d') }),
})

export const reportSchema = z.object({
  query: z.object({
    type: z.enum(['overview', 'users', 'bookings', 'revenue']).default('overview'),
    format: z.enum(['json', 'csv']).default('json'),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
})

export const announcementListSchema = z.object({
  query: z.object({
    ...pagination,
    status: z.enum(['all', 'draft', 'published', 'archived']).default('all'),
    audience: z.enum(['all', 'student', 'teacher']).optional(),
  }),
})

const announcementFields = z.object({
  title: z.string().trim().min(3).max(140),
  message: z.string().trim().min(3).max(2000),
  audience: z.enum(['all', 'student', 'teacher']).default('all'),
  severity: z.enum(['info', 'success', 'warning', 'critical']).default('info'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  publishAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
})

const announcementBody = announcementFields.superRefine((value, context) => {
  if (value.publishAt && value.expiresAt && value.expiresAt <= value.publishAt) {
    context.addIssue({
      code: 'custom',
      path: ['expiresAt'],
      message: 'Expiry time must be later than publication time',
    })
  }
})

export const createAnnouncementSchema = z.object({ body: announcementBody })
export const updateAnnouncementSchema = z.object({
  params: z.object({ id: objectId }),
  body: announcementFields.partial(),
})

export const platformSettingsSchema = z.object({
  body: z.object({
    platformName: z.string().trim().min(2).max(80),
    supportEmail: z.string().trim().email(),
    defaultTimezone: ianaTimezoneSchema,
    maintenanceMode: z.boolean(),
    allowRegistrations: z.boolean(),
    allowTeacherApplications: z.boolean(),
    platformFeePercent: z.number().min(0).max(100),
    minimumBookingNoticeHours: z.number().int().min(0).max(168),
    maximumBookingAdvanceDays: z.number().int().min(1).max(365),
  }),
})

export const auditListSchema = z.object({
  query: z.object({
    ...pagination,
    search: z.string().trim().max(120).optional(),
    action: z.string().trim().max(100).optional(),
  }),
})

export const supportListSchema = z.object({
  query: z.object({
    ...pagination,
    search: z.string().trim().max(120).optional(),
    status: z.enum(['all', 'open', 'in_progress', 'resolved', 'closed']).default('all'),
    priority: z.enum(['all', 'low', 'normal', 'high', 'urgent']).default('all'),
  }),
})

export const supportUpdateSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    resolution: z.string().trim().max(3000).optional(),
  }),
})
