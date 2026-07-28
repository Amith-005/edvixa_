import { Types } from 'mongoose'
import { AppError } from '../../../shared/errors/app-error.js'
import { AuthSessionModel } from '../../auth/models/auth-session.model.js'
import { AvailabilityModel } from '../../availability/models/availability.model.js'
import { BookingModel } from '../../bookings/models/booking.model.js'
import { FeeModel } from '../../fees/models/fee.model.js'
import { PracticeSessionModel } from '../../practice/models/practice-session.model.js'
import { StudentProfileModel } from '../../students/models/student-profile.model.js'
import { SubjectModel } from '../../subjects/models/subject.model.js'
import { TeacherProfileModel } from '../../teachers/models/teacher-profile.model.js'
import { UserModel } from '../../users/models/user.model.js'
import { AdminAuditLogModel } from '../models/admin-audit-log.model.js'
import { AnnouncementModel } from '../models/announcement.model.js'
import { PlatformSettingModel } from '../models/platform-setting.model.js'
import { SupportTicketModel } from '../models/support-ticket.model.js'

type AdminContext = {
  adminId: string
  ipAddress?: string
  userAgent?: string | null
  requestId?: string
}

type PaginationQuery = { page: number; limit: number }
type UserListQuery = PaginationQuery & {
  search?: string
  role: 'all' | 'student' | 'teacher' | 'admin'
  status: 'all' | 'active' | 'inactive' | 'banned' | 'unverified'
  sort: 'newest' | 'oldest' | 'name' | 'lastLogin'
}
type TeacherListQuery = PaginationQuery & {
  search?: string
  status: 'all' | 'draft' | 'pending' | 'approved' | 'rejected'
}
type BookingListQuery = PaginationQuery & {
  search?: string
  status: 'all' | 'pending' | 'accepted' | 'rejected' | 'upcoming' | 'awaiting_completion' | 'completed' | 'cancelled' | 'rescheduled'
  paymentStatus: 'all' | 'pending' | 'paid' | 'failed' | 'refunded'
  from?: Date
  to?: Date
}
type FeeListQuery = PaginationQuery & {
  search?: string
  status: 'all' | 'pending' | 'paid' | 'failed' | 'refunded'
  payoutStatus: 'all' | 'pending' | 'approved' | 'paid' | 'failed'
}

type ReportQuery = {
  type: 'overview' | 'users' | 'bookings' | 'revenue'
  format: 'json' | 'csv'
  from?: Date
  to?: Date
}

const ACTIVE_BOOKING_STATUSES = ['pending', 'accepted', 'upcoming', 'rescheduled'] as const
const COMPLETABLE_BOOKING_STATUSES = ['accepted', 'upcoming', 'rescheduled'] as const

function effectiveBookingStatus(booking: { status: string; endAt: Date | string }): string {
  if (
    COMPLETABLE_BOOKING_STATUSES.includes(booking.status as (typeof COMPLETABLE_BOOKING_STATUSES)[number])
    && new Date(booking.endAt).getTime() <= Date.now()
  ) {
    return 'awaiting_completion'
  }
  return booking.status
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfDay = (date: Date) => {
  const value = new Date(date)
  value.setUTCHours(23, 59, 59, 999)
  return value
}
const toIso = (value: Date | string | null | undefined) => value ? new Date(value).toISOString() : null

function pageMeta(total: number, page: number, limit: number) {
  return { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) }
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const raw = value instanceof Date ? value.toISOString() : String(value)
  // Prevent spreadsheet applications from interpreting exported user content
  // as a formula when an administrator opens the report.
  const text = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function rowsToCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return 'No data\n'
  const headers = Object.keys(rows[0] ?? {})
  return [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n')
}

class AdminService {
  private async audit(
    context: AdminContext,
    action: string,
    targetType: string,
    targetId: string | null,
    summary: string,
    metadata?: Record<string, unknown>,
  ) {
    await AdminAuditLogModel.create({
      actorId: context.adminId,
      action,
      targetType,
      targetId,
      summary,
      metadata: metadata ?? null,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      requestId: context.requestId ?? null,
    })
  }

  async dashboard() {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const [
      students,
      teachers,
      pendingTeachers,
      subjects,
      activeBookings,
      newUsersThisMonth,
      completedSessionsThisMonth,
      paidRevenue,
      pendingPayouts,
      openTickets,
      recentUsers,
      recentActivity,
      failedPayments,
      userTrend,
      bookingTrend,
      revenueTrend,
    ] = await Promise.all([
      UserModel.countDocuments({ role: 'student', deletedAt: null }),
      UserModel.countDocuments({ role: 'teacher', deletedAt: null }),
      TeacherProfileModel.countDocuments({ approvalStatus: 'pending', submittedAt: { $ne: null } }),
      SubjectModel.countDocuments({ isActive: true }),
      BookingModel.countDocuments({ status: { $in: ['pending', 'accepted', 'upcoming', 'rescheduled'] } }),
      UserModel.countDocuments({ createdAt: { $gte: monthStart }, deletedAt: null }),
      BookingModel.countDocuments({ status: 'completed', completedAt: { $gte: monthStart } }),
      FeeModel.aggregate<{ total: number }>([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      FeeModel.aggregate<{ total: number }>([
        {
          $match: {
            status: 'paid',
            refundStatus: 'none',
            payoutStatus: { $in: ['pending', 'approved'] },
          },
        },
        { $lookup: { from: 'bookings', localField: 'bookingId', foreignField: '_id', as: 'booking' } },
        { $match: { 'booking.0.status': 'completed' } },
        { $group: { _id: null, total: { $sum: '$teacherEarning' } } },
      ]),
      SupportTicketModel.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
      UserModel.find({ deletedAt: null })
        .select('name email role avatar isActive isEmailVerified createdAt')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      AdminAuditLogModel.find()
        .populate('actorId', 'name email')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      FeeModel.countDocuments({ status: 'failed', createdAt: { $gte: monthStart } }),
      UserModel.aggregate<{ _id: { year: number; month: number }; value: number }>([
        { $match: { createdAt: { $gte: sixMonthsAgo }, deletedAt: null } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, value: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      BookingModel.aggregate<{ _id: { year: number; month: number }; value: number }>([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, value: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      FeeModel.aggregate<{ _id: { year: number; month: number }; value: number }>([
        { $match: { paidAt: { $gte: sixMonthsAgo }, status: 'paid' } },
        { $group: { _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } }, value: { $sum: '$totalAmount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ])

    const trend = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const find = (items: Array<{ _id: { year: number; month: number }; value: number }>) =>
        items.find((item) => item._id.year === year && item._id.month === month)?.value ?? 0
      return {
        label: date.toLocaleString('en-US', { month: 'short' }),
        users: find(userTrend),
        bookings: find(bookingTrend),
        revenue: find(revenueTrend),
      }
    })

    const alerts = [
      pendingTeachers > 0 ? { tone: 'warning', message: `${pendingTeachers} teacher application${pendingTeachers === 1 ? '' : 's'} awaiting review` } : null,
      failedPayments > 0 ? { tone: 'danger', message: `${failedPayments} failed payment${failedPayments === 1 ? '' : 's'} this month` } : null,
      openTickets > 0 ? { tone: 'warning', message: `${openTickets} support ticket${openTickets === 1 ? '' : 's'} need attention` } : null,
    ].filter(Boolean)

    return {
      students,
      teachers,
      pendingTeachers,
      subjects,
      activeBookings,
      revenue: paidRevenue[0]?.total ?? 0,
      pendingPayouts: pendingPayouts[0]?.total ?? 0,
      openTickets,
      newUsersThisMonth,
      completedSessionsThisMonth,
      trend,
      alerts,
      recentUsers,
      recentActivity,
    }
  }

  async listUsers(query: UserListQuery) {
    const filter: Record<string, unknown> = { deletedAt: null }
    if (query.role !== 'all') filter.role = query.role
    if (query.status === 'active') filter.isActive = true
    if (query.status === 'inactive') filter.isActive = false
    if (query.status === 'banned') filter.bannedAt = { $ne: null }
    if (query.status === 'unverified') filter.isEmailVerified = false
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i')
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }]
    }

    const sort: Record<string, 1 | -1> = query.sort === 'oldest'
      ? { createdAt: 1 }
      : query.sort === 'name'
        ? { name: 1 }
        : query.sort === 'lastLogin'
          ? { lastLoginAt: -1 }
          : { createdAt: -1 }

    const [items, total] = await Promise.all([
      UserModel.find(filter)
        .select('name email role avatar phone isActive isEmailVerified banReason bannedAt lastLoginAt createdAt updatedAt')
        .sort(sort)
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      UserModel.countDocuments(filter),
    ])

    return { items, pagination: pageMeta(total, query.page, query.limit) }
  }

  async userDetails(userId: string) {
    const user = await UserModel.findById(userId)
      .select('name email role avatar phone authProvider isActive isEmailVerified emailVerifiedAt banReason bannedAt lastLoginAt lastPasswordChangeAt createdAt updatedAt')
      .lean()
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND')

    const bookingFilter = user.role === 'teacher' ? { teacherId: userId } : { studentId: userId }
    const userObjectId = new Types.ObjectId(userId)
    const feeFilter = user.role === 'teacher' ? { teacherId: userObjectId } : { studentId: userObjectId }

    const [profile, bookings, bookingCount, feeSummary, practiceCount, activeSessions] = await Promise.all([
      user.role === 'student'
        ? StudentProfileModel.findOne({ userId }).populate('preferredSubjects', 'name slug').lean()
        : user.role === 'teacher'
          ? TeacherProfileModel.findOne({ userId }).populate('subjects', 'name slug').lean()
          : null,
      BookingModel.find(bookingFilter)
        .populate('studentId', 'name email avatar')
        .populate('teacherId', 'name email avatar')
        .populate('subjectId', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      BookingModel.countDocuments(bookingFilter),
      FeeModel.aggregate<{ paid: number; refunded: number; pending: number }>([
        { $match: { ...feeFilter } },
        {
          $group: {
            _id: null,
            paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0] } },
            refunded: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$refundAmount', 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$totalAmount', 0] } },
          },
        },
      ]),
      user.role === 'student' ? PracticeSessionModel.countDocuments({ studentId: userId }) : 0,
      AuthSessionModel.countDocuments({ userId, isRevoked: false, expiresAt: { $gt: new Date() } }),
    ])

    return {
      user,
      profile,
      bookings,
      metrics: {
        bookingCount,
        practiceCount,
        activeSessions,
        fees: feeSummary[0] ?? { paid: 0, refunded: 0, pending: 0 },
      },
    }
  }

  async updateUser(
    userId: string,
    input:
      | { action: 'activate' }
      | { action: 'deactivate'; reason: string }
      | { action: 'ban'; reason: string }
      | { action: 'unban' }
      | { action: 'verify-email' },
    context: AdminContext,
  ) {
    const user = await UserModel.findById(userId)
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND')
    if (String(user._id) === context.adminId && ['deactivate', 'ban'].includes(input.action)) {
      throw new AppError(409, 'You cannot disable your own admin account', 'SELF_ADMIN_ACTION_BLOCKED')
    }
    if (user.role === 'admin' && String(user._id) !== context.adminId && input.action !== 'verify-email') {
      throw new AppError(403, 'Other administrator accounts cannot be changed here', 'ADMIN_ACCOUNT_PROTECTED')
    }

    if (input.action === 'activate') {
      user.isActive = true
      user.banReason = null
      user.bannedAt = null
      user.bannedBy = null
    } else if (input.action === 'deactivate') {
      user.isActive = false
      user.banReason = input.reason
    } else if (input.action === 'ban') {
      user.isActive = false
      user.banReason = input.reason
      user.bannedAt = new Date()
      user.bannedBy = new Types.ObjectId(context.adminId)
    } else if (input.action === 'unban') {
      user.isActive = true
      user.banReason = null
      user.bannedAt = null
      user.bannedBy = null
    } else {
      user.isEmailVerified = true
      user.emailVerifiedAt = user.emailVerifiedAt ?? new Date()
    }

    await user.save()
    if (!user.isActive) {
      await AuthSessionModel.updateMany(
        { userId: user._id, isRevoked: false },
        { isRevoked: true, revokedAt: new Date() },
      )
    }
    await this.audit(context, `user.${input.action}`, 'user', userId, `${input.action} applied to ${user.email}`, 'reason' in input ? { reason: input.reason } : undefined)
    return this.userDetails(userId)
  }

  async listTeachers(query: TeacherListQuery) {
    const filter: Record<string, unknown> = {}
    if (query.status === 'draft') filter.submittedAt = null
    if (query.status === 'pending') Object.assign(filter, { approvalStatus: 'pending', submittedAt: { $ne: null } })
    if (query.status === 'approved') filter.approvalStatus = 'approved'
    if (query.status === 'rejected') filter.approvalStatus = 'rejected'

    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i')
      const users = await UserModel.find({ role: 'teacher', $or: [{ name: regex }, { email: regex }] }).select('_id').lean()
      filter.$or = [
        { userId: { $in: users.map((user) => user._id) } },
        { qualification: regex },
        { bio: regex },
      ]
    }

    const [items, total] = await Promise.all([
      TeacherProfileModel.find(filter)
        .populate('userId', 'name email avatar isActive isEmailVerified createdAt')
        .populate('subjects', 'name slug')
        .populate('approvedBy', 'name email')
        .sort({ submittedAt: 1, createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      TeacherProfileModel.countDocuments(filter),
    ])

    return { items, pagination: pageMeta(total, query.page, query.limit) }
  }

  async pendingTeachers() {
    const result = await this.listTeachers({ page: 1, limit: 100, status: 'pending' })
    return result.items
  }

  async decideTeacher(
    profileId: string,
    decision: 'approved' | 'rejected',
    reason: string | undefined,
    context: AdminContext,
  ) {
    const profile = await TeacherProfileModel.findById(profileId).populate('userId', 'name email')
    if (!profile) throw new AppError(404, 'Teacher profile not found', 'TEACHER_PROFILE_NOT_FOUND')
    if (!profile.submittedAt) {
      throw new AppError(
        422,
        'This teacher profile is still a draft and has not been submitted for review',
        'TEACHER_APPLICATION_NOT_SUBMITTED',
      )
    }
    if (profile.approvalStatus !== 'pending') {
      throw new AppError(
        409,
        'Only pending teacher applications can be approved or rejected',
        'TEACHER_APPLICATION_NOT_PENDING',
      )
    }
    if (decision === 'approved') {
      if (profile.profileCompletedPercent < 80) {
        throw new AppError(
          422,
          'The teacher profile must be at least 80% complete before approval',
          'TEACHER_PROFILE_INCOMPLETE',
        )
      }
      if (profile.documents.length === 0) {
        throw new AppError(
          422,
          'At least one qualification document is required before approval',
          'TEACHER_DOCUMENT_REQUIRED',
        )
      }
      if (profile.subjects.length === 0 || profile.gradeLevels.length === 0) {
        throw new AppError(
          422,
          'At least one subject and grade level are required before approval',
          'TEACHER_TEACHING_SCOPE_REQUIRED',
        )
      }
    }
    if (decision === 'rejected' && !reason) {
      throw new AppError(422, 'A rejection reason is required', 'REJECTION_REASON_REQUIRED')
    }

    profile.approvalStatus = decision
    profile.isApproved = decision === 'approved'
    profile.rejectionReason = decision === 'rejected' ? reason ?? 'Application rejected' : null
    profile.approvedAt = decision === 'approved' ? new Date() : null
    profile.approvedBy = decision === 'approved' ? new Types.ObjectId(context.adminId) : null
    await profile.save()

    await this.audit(
      context,
      `teacher.${decision}`,
      'teacherProfile',
      profileId,
      `Teacher application ${decision}`,
      reason ? { reason } : undefined,
    )
    return profile
  }

  async listBookings(query: BookingListQuery) {
    const filter: Record<string, unknown> = {}
    if (query.status === 'awaiting_completion') {
      filter.status = { $in: COMPLETABLE_BOOKING_STATUSES }
      filter.endAt = { $lte: new Date() }
    } else if (query.status !== 'all') {
      filter.status = query.status
    }
    if (query.paymentStatus !== 'all') filter.paymentStatus = query.paymentStatus
    if (query.from || query.to) {
      filter.scheduledAt = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: endOfDay(query.to) } : {}),
      }
    }
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i')
      const [users, subjects] = await Promise.all([
        UserModel.find({ $or: [{ name: regex }, { email: regex }] }).select('_id').lean(),
        SubjectModel.find({ name: regex }).select('_id').lean(),
      ])
      filter.$or = [
        { studentId: { $in: users.map((user) => user._id) } },
        { teacherId: { $in: users.map((user) => user._id) } },
        { subjectId: { $in: subjects.map((subject) => subject._id) } },
        { topicName: regex },
        { meetingId: regex },
      ]
    }

    const [rawItems, total] = await Promise.all([
      BookingModel.find(filter)
        .populate('studentId', 'name email avatar')
        .populate('teacherId', 'name email avatar')
        .populate('subjectId', 'name slug')
        .populate('feeId')
        .sort({ scheduledAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      BookingModel.countDocuments(filter),
    ])

    const items = rawItems.map((booking) => {
      const fee = booking.feeId as unknown as { totalAmount?: number } | null
      const operationalStatus = effectiveBookingStatus(booking)
      return {
        ...booking,
        operationalStatus,
        totalAmount: fee?.totalAmount ?? 0,
        canComplete:
          operationalStatus === 'awaiting_completion'
          && booking.paymentStatus === 'paid',
      }
    })

    return { items, pagination: pageMeta(total, query.page, query.limit) }
  }

  async updateBooking(
    bookingId: string,
    input: { action: 'cancel'; reason: string } | { action: 'mark-completed'; reason?: string },
    context: AdminContext,
  ) {
    const booking = await BookingModel.findById(bookingId)
    if (!booking) throw new AppError(404, 'Booking not found', 'BOOKING_NOT_FOUND')

    let resultBooking = booking

    if (input.action === 'cancel') {
      if (['completed', 'cancelled', 'rejected'].includes(booking.status)) {
        throw new AppError(409, 'This booking can no longer be cancelled', 'BOOKING_NOT_CANCELLABLE')
      }
      booking.status = 'cancelled'
      booking.cancelledBy = 'admin'
      booking.cancellationReason = input.reason
      booking.cancelledAt = new Date()
      booking.paymentExpiresAt = null

      const fee = await FeeModel.findOne({ bookingId: booking._id })
      if (fee?.status === 'pending') {
        fee.status = 'failed'
        fee.failedAt = new Date()
        fee.failureReason = input.reason
        booking.paymentStatus = 'failed'
        await fee.save()
      } else if (fee?.status === 'paid') {
        if (['approved', 'paid'].includes(fee.payoutStatus)) {
          throw new AppError(
            409,
            'This booking has an approved or released teacher payout and requires financial reconciliation before cancellation',
            'BOOKING_PAYOUT_RECONCILIATION_REQUIRED',
          )
        }
        fee.refundReason = input.reason
        fee.refundAmount = fee.totalAmount
        fee.payoutStatus = 'failed'
        if (fee.paymentGateway === 'demo') {
          fee.status = 'refunded'
          fee.refundStatus = 'processed'
          fee.refundedAt = new Date()
          booking.paymentStatus = 'refunded'
        } else {
          fee.refundStatus = 'requested'
        }
        await fee.save()
      }

      await AvailabilityModel.updateOne(
        { _id: booking.availabilitySlotId, bookingId: booking._id },
        { $set: { isBooked: false, bookingId: null } },
      )
      await booking.save()
    } else {
      if (!['accepted', 'upcoming', 'rescheduled'].includes(booking.status)) {
        throw new AppError(409, 'Only active bookings can be completed', 'BOOKING_NOT_ACTIVE')
      }
      if (booking.paymentStatus !== 'paid') throw new AppError(409, 'Only paid bookings can be completed', 'BOOKING_NOT_PAID')
      if (booking.scheduledAt.getTime() > Date.now()) throw new AppError(409, 'A future booking cannot be completed', 'BOOKING_NOT_STARTED')

      const completed = await BookingModel.findOneAndUpdate(
        { _id: booking._id, status: { $in: ['accepted', 'upcoming', 'rescheduled'] } },
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
            ...(input.reason
              ? { teacherNote: [booking.teacherNote, `Admin note: ${input.reason}`].filter(Boolean).join('\n') }
              : {}),
          },
        },
        { returnDocument: 'after' },
      )
      if (!completed) throw new AppError(409, 'This booking was already updated', 'BOOKING_ALREADY_UPDATED')
      resultBooking = completed

      const taughtBefore = await BookingModel.exists({
        _id: { $ne: completed._id },
        teacherId: completed.teacherId,
        studentId: completed.studentId,
        status: 'completed',
      })
      await TeacherProfileModel.updateOne(
        { userId: completed.teacherId },
        { $inc: { totalSessionsCompleted: 1, totalStudentsTaught: taughtBefore ? 0 : 1 } },
      )
    }
    await this.audit(context, `booking.${input.action}`, 'booking', bookingId, `${input.action} applied to booking`, 'reason' in input && input.reason ? { reason: input.reason } : undefined)
    return resultBooking
  }

  async listFees(query: FeeListQuery) {
    const filter: Record<string, unknown> = {}
    if (query.status !== 'all') filter.status = query.status
    if (query.payoutStatus !== 'all') filter.payoutStatus = query.payoutStatus
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i')
      const users = await UserModel.find({ $or: [{ name: regex }, { email: regex }] }).select('_id').lean()
      filter.$or = [
        { studentId: { $in: users.map((user) => user._id) } },
        { teacherId: { $in: users.map((user) => user._id) } },
        { gatewayOrderId: regex },
        { gatewayPaymentId: regex },
      ]
    }

    const [rawItems, total, totals] = await Promise.all([
      FeeModel.find(filter)
        .populate('studentId', 'name email')
        .populate('teacherId', 'name email')
        .populate('bookingId', 'topicName scheduledAt status completedAt')
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      FeeModel.countDocuments(filter),
      FeeModel.aggregate<{ paid: number; pending: number; refunded: number; teacherOwed: number }>([
        { $match: filter },
        { $lookup: { from: 'bookings', localField: 'bookingId', foreignField: '_id', as: 'booking' } },
        { $set: { bookingStatus: { $ifNull: [{ $first: '$booking.status' }, null] } } },
        {
          $group: {
            _id: null,
            paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$totalAmount', 0] } },
            refunded: {
              $sum: {
                $cond: [
                  { $or: [{ $eq: ['$status', 'refunded'] }, { $eq: ['$refundStatus', 'processed'] }] },
                  '$refundAmount',
                  0,
                ],
              },
            },
            teacherOwed: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'paid'] },
                      { $eq: ['$refundStatus', 'none'] },
                      { $in: ['$payoutStatus', ['pending', 'approved']] },
                      { $eq: ['$bookingStatus', 'completed'] },
                    ],
                  },
                  '$teacherEarning',
                  0,
                ],
              },
            },
          },
        },
      ]),
    ])

    const items = rawItems.map((fee) => {
      const booking = fee.bookingId as unknown as { status?: string } | null
      const bookingCompleted = booking?.status === 'completed'
      const refundOpen = !['none', 'failed'].includes(fee.refundStatus)
      const payoutReleased = ['approved', 'paid'].includes(fee.payoutStatus)
      const hasFinancialConflict = refundOpen && payoutReleased

      let payoutBlockedReason: string | null = null
      if (fee.status !== 'paid') payoutBlockedReason = 'Payment is not settled'
      else if (!bookingCompleted) payoutBlockedReason = 'Complete the booking before approving payout'
      else if (fee.refundStatus !== 'none') payoutBlockedReason = 'A refund is active for this payment'
      else if (fee.payoutStatus !== 'pending') payoutBlockedReason = 'Payout is not pending approval'

      return {
        ...fee,
        payoutEligible: payoutBlockedReason === null,
        payoutBlockedReason,
        canMarkPayoutPaid:
          fee.status === 'paid'
          && bookingCompleted
          && fee.refundStatus === 'none'
          && fee.payoutStatus === 'approved',
        refundEligible:
          fee.status === 'paid'
          && ['none', 'failed'].includes(fee.refundStatus)
          && !payoutReleased,
        hasFinancialConflict,
      }
    })

    return {
      items,
      pagination: pageMeta(total, query.page, query.limit),
      totals: totals[0] ?? { paid: 0, pending: 0, refunded: 0, teacherOwed: 0 },
    }
  }

  async updateFee(
    feeId: string,
    input:
      | { action: 'request-refund'; reason: string }
      | { action: 'approve-payout' }
      | { action: 'mark-payout-paid' },
    context: AdminContext,
  ) {
    const fee = await FeeModel.findById(feeId)
    if (!fee) throw new AppError(404, 'Fee record not found', 'FEE_NOT_FOUND')

    const booking = await BookingModel.findById(fee.bookingId).select('status completedAt')
    if (!booking) throw new AppError(409, 'The related booking could not be found', 'BOOKING_NOT_FOUND')

    if (input.action === 'request-refund') {
      if (fee.status !== 'paid') {
        throw new AppError(409, 'Only paid transactions can be refunded', 'FEE_NOT_PAID')
      }
      if (fee.refundStatus !== 'none' && fee.refundStatus !== 'failed') {
        throw new AppError(409, 'A refund is already in progress', 'REFUND_ALREADY_REQUESTED')
      }
      if (fee.payoutStatus === 'paid') {
        throw new AppError(
          409,
          'The teacher payout has already been released. Reconcile the payout before refunding.',
          'PAYOUT_ALREADY_RELEASED',
        )
      }
      if (fee.payoutStatus === 'approved') {
        throw new AppError(
          409,
          'The teacher payout is already approved. Revoke or reconcile it before refunding.',
          'PAYOUT_ALREADY_APPROVED',
        )
      }
      fee.refundStatus = 'requested'
      fee.refundReason = input.reason
      fee.refundAmount = fee.totalAmount
    } else if (input.action === 'approve-payout') {
      if (fee.status !== 'paid' || fee.payoutStatus !== 'pending') {
        throw new AppError(409, 'This payout cannot be approved', 'PAYOUT_NOT_APPROVABLE')
      }
      if (fee.refundStatus !== 'none') {
        throw new AppError(409, 'A payout cannot be approved while a refund is active', 'REFUND_BLOCKS_PAYOUT')
      }
      if (booking.status !== 'completed') {
        throw new AppError(409, 'Complete the booking before approving the teacher payout', 'BOOKING_NOT_COMPLETED')
      }
      fee.payoutStatus = 'approved'
    } else {
      if (fee.payoutStatus !== 'approved') {
        throw new AppError(409, 'Approve the payout before marking it paid', 'PAYOUT_NOT_APPROVED')
      }
      if (fee.status !== 'paid' || fee.refundStatus !== 'none') {
        throw new AppError(409, 'This payout is blocked by the payment or refund state', 'PAYOUT_BLOCKED')
      }
      if (booking.status !== 'completed') {
        throw new AppError(409, 'Complete the booking before releasing the teacher payout', 'BOOKING_NOT_COMPLETED')
      }
      fee.payoutStatus = 'paid'
    }

    await fee.save()
    await this.audit(
      context,
      `fee.${input.action}`,
      'fee',
      feeId,
      `${input.action} applied to fee`,
      'reason' in input ? { reason: input.reason } : undefined,
    )
    return fee
  }

  async analytics(range: '7d' | '30d' | '90d' | '12m') {
    const now = new Date()
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365
    const start = new Date(now)
    start.setDate(start.getDate() - days + 1)
    start.setHours(0, 0, 0, 0)
    const unit = range === '12m' ? 'month' : 'day'
    const dateFormat = unit === 'month' ? '%Y-%m' : '%Y-%m-%d'

    const [users, bookings, revenue, practice, roleSplit, bookingStatus, subjectUsage] = await Promise.all([
      UserModel.aggregate<{ _id: string; value: number }>([
        { $match: { createdAt: { $gte: start }, deletedAt: null } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      BookingModel.aggregate<{ _id: string; value: number }>([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      FeeModel.aggregate<{ _id: string; value: number }>([
        { $match: { paidAt: { $gte: start }, status: 'paid' } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$paidAt' } }, value: { $sum: '$totalAmount' } } },
        { $sort: { _id: 1 } },
      ]),
      PracticeSessionModel.aggregate<{ _id: string; value: number }>([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      UserModel.aggregate<{ _id: string; value: number }>([
        { $match: { deletedAt: null } },
        { $group: { _id: '$role', value: { $sum: 1 } } },
      ]),
      BookingModel.aggregate<{ _id: string; value: number }>([
        {
          $project: {
            effectiveStatus: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', COMPLETABLE_BOOKING_STATUSES] },
                    { $lte: ['$endAt', now] },
                  ],
                },
                'awaiting_completion',
                '$status',
              ],
            },
          },
        },
        { $group: { _id: '$effectiveStatus', value: { $sum: 1 } } },
        { $sort: { value: -1 } },
      ]),
      BookingModel.aggregate<{ _id: Types.ObjectId; value: number; name: string }>([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: '$subjectId', value: { $sum: 1 } } },
        { $sort: { value: -1 } },
        { $limit: 8 },
        { $lookup: { from: 'subjects', localField: '_id', foreignField: '_id', as: 'subject' } },
        { $set: { name: { $ifNull: [{ $first: '$subject.name' }, 'Unknown subject'] } } },
        { $project: { value: 1, name: 1 } },
      ]),
    ])

    const keys: string[] = []
    if (unit === 'month') {
      for (let index = 11; index >= 0; index -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
        keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
      }
    } else {
      for (let index = days - 1; index >= 0; index -= 1) {
        const date = new Date(now)
        date.setDate(date.getDate() - index)
        keys.push(date.toISOString().slice(0, 10))
      }
    }

    const valueFor = (rows: Array<{ _id: string; value: number }>, key: string) => rows.find((row) => row._id === key)?.value ?? 0
    return {
      range,
      series: keys.map((key) => ({
        key,
        label: unit === 'month' ? new Date(`${key}-01T00:00:00`).toLocaleString('en-US', { month: 'short' }) : new Date(`${key}T00:00:00`).toLocaleString('en-US', { month: 'short', day: 'numeric' }),
        users: valueFor(users, key),
        bookings: valueFor(bookings, key),
        revenue: valueFor(revenue, key),
        practice: valueFor(practice, key),
      })),
      roleSplit: roleSplit.map((row) => ({ label: row._id, value: row.value })),
      bookingStatus: bookingStatus.map((row) => ({ label: row._id, value: row.value })),
      subjectUsage: subjectUsage.map((row) => ({ label: row.name, value: row.value })),
    }
  }

  async report(query: ReportQuery) {
    const dateFilter = query.from || query.to
      ? { createdAt: { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: endOfDay(query.to) } : {}) } }
      : {}
    let rows: Array<Record<string, unknown>>

    if (query.type === 'users') {
      const users = await UserModel.find({ deletedAt: null, ...dateFilter })
        .select('name email role isActive isEmailVerified lastLoginAt createdAt')
        .sort({ createdAt: -1 })
        .limit(5000)
        .lean()
      rows = users.map((user) => ({
        id: String(user._id), name: user.name, email: user.email, role: user.role,
        active: user.isActive, emailVerified: user.isEmailVerified,
        lastLoginAt: toIso(user.lastLoginAt), createdAt: toIso(user.createdAt),
      }))
    } else if (query.type === 'bookings') {
      const bookings = await BookingModel.find(dateFilter)
        .populate('studentId', 'name email')
        .populate('teacherId', 'name email')
        .populate('subjectId', 'name')
        .populate('feeId', 'totalAmount currency refundStatus payoutStatus')
        .sort({ createdAt: -1 })
        .limit(5000)
        .lean()
      rows = bookings.map((booking) => {
        const student = booking.studentId as unknown as { name?: string; email?: string }
        const teacher = booking.teacherId as unknown as { name?: string; email?: string }
        const subject = booking.subjectId as unknown as { name?: string }
        const fee = booking.feeId as unknown as { totalAmount?: number; currency?: string; refundStatus?: string; payoutStatus?: string } | null
        return {
          id: String(booking._id), student: student?.name, studentEmail: student?.email,
          teacher: teacher?.name, teacherEmail: teacher?.email, subject: subject?.name,
          topic: booking.topicName, status: effectiveBookingStatus(booking), paymentStatus: booking.paymentStatus,
          totalAmount: fee?.totalAmount ?? 0, currency: fee?.currency ?? 'INR',
          refundStatus: fee?.refundStatus ?? 'none', payoutStatus: fee?.payoutStatus ?? 'pending',
          scheduledAt: toIso(booking.scheduledAt), createdAt: toIso(booking.createdAt),
        }
      })
    } else if (query.type === 'revenue') {
      const fees = await FeeModel.find(dateFilter)
        .populate('studentId', 'name email')
        .populate('teacherId', 'name email')
        .sort({ createdAt: -1 })
        .limit(5000)
        .lean()
      rows = fees.map((fee) => {
        const student = fee.studentId as unknown as { name?: string; email?: string }
        const teacher = fee.teacherId as unknown as { name?: string; email?: string }
        return {
          id: String(fee._id), student: student?.name, teacher: teacher?.name,
          amount: fee.amount, platformFee: fee.platformFee, totalAmount: fee.totalAmount,
          teacherEarning: fee.teacherEarning, status: fee.status, payoutStatus: fee.payoutStatus,
          gateway: fee.paymentGateway, paymentId: fee.gatewayPaymentId,
          paidAt: toIso(fee.paidAt), createdAt: toIso(fee.createdAt),
        }
      })
    } else {
      const summary = await this.dashboard()
      rows = [{
        generatedAt: new Date().toISOString(), students: summary.students, teachers: summary.teachers,
        pendingTeachers: summary.pendingTeachers, activeSubjects: summary.subjects,
        activeBookings: summary.activeBookings, totalRevenue: summary.revenue,
        pendingPayouts: summary.pendingPayouts, openTickets: summary.openTickets,
      }]
    }

    return {
      type: query.type,
      generatedAt: new Date().toISOString(),
      count: rows.length,
      rows,
      csv: query.format === 'csv' ? rowsToCsv(rows) : null,
    }
  }

  async listSubjects() {
    return SubjectModel.find({}).sort({ name: 1 }).lean()
  }

  async listAnnouncements(query: PaginationQuery & { status: 'all' | 'draft' | 'published' | 'archived'; audience?: 'all' | 'student' | 'teacher' }) {
    const filter: Record<string, unknown> = {}
    if (query.status !== 'all') filter.status = query.status
    if (query.audience) filter.audience = query.audience
    const [items, total] = await Promise.all([
      AnnouncementModel.find(filter)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      AnnouncementModel.countDocuments(filter),
    ])
    return { items, pagination: pageMeta(total, query.page, query.limit) }
  }

  async createAnnouncement(input: Record<string, unknown>, context: AdminContext) {
    const status = String(input.status ?? 'draft')
    const publishAt = input.publishAt
      ? new Date(input.publishAt as string | Date)
      : status === 'published'
        ? new Date()
        : null
    const expiresAt = input.expiresAt ? new Date(input.expiresAt as string | Date) : null

    if (expiresAt && expiresAt.getTime() <= (publishAt?.getTime() ?? Date.now())) {
      throw new AppError(
        422,
        'The expiry time must be later than the publication time',
        'ANNOUNCEMENT_DATE_RANGE_INVALID',
      )
    }

    const announcement = await AnnouncementModel.create({
      ...input,
      publishAt,
      expiresAt,
      createdBy: context.adminId,
      updatedBy: context.adminId,
    })
    await this.audit(
      context,
      'announcement.create',
      'announcement',
      String(announcement._id),
      `Created announcement: ${announcement.title}`,
    )
    return announcement
  }

  async updateAnnouncement(id: string, input: Record<string, unknown>, context: AdminContext) {
    const announcement = await AnnouncementModel.findById(id)
    if (!announcement) throw new AppError(404, 'Announcement not found', 'ANNOUNCEMENT_NOT_FOUND')

    const nextStatus = String(input.status ?? announcement.status)
    const hasPublishAt = Object.prototype.hasOwnProperty.call(input, 'publishAt')
    const hasExpiresAt = Object.prototype.hasOwnProperty.call(input, 'expiresAt')
    let publishAt = hasPublishAt
      ? input.publishAt
        ? new Date(input.publishAt as string | Date)
        : null
      : announcement.publishAt
    const expiresAt = hasExpiresAt
      ? input.expiresAt
        ? new Date(input.expiresAt as string | Date)
        : null
      : announcement.expiresAt

    if (nextStatus === 'published' && !publishAt) publishAt = new Date()
    if (expiresAt && expiresAt.getTime() <= (publishAt?.getTime() ?? Date.now())) {
      throw new AppError(
        422,
        'The expiry time must be later than the publication time',
        'ANNOUNCEMENT_DATE_RANGE_INVALID',
      )
    }

    announcement.set({
      ...input,
      publishAt,
      expiresAt,
      updatedBy: context.adminId,
    })
    await announcement.save()
    await this.audit(
      context,
      'announcement.update',
      'announcement',
      id,
      `Updated announcement: ${announcement.title}`,
    )
    return announcement
  }

  async getSettings() {
    return PlatformSettingModel.findOneAndUpdate(
      { key: 'platform' },
      { $setOnInsert: { key: 'platform' } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean()
  }

  async updateSettings(input: Record<string, unknown>, context: AdminContext) {
    const settings = await PlatformSettingModel.findOneAndUpdate(
      { key: 'platform' },
      { $set: { ...input, updatedBy: context.adminId } },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
    )
    await this.audit(context, 'settings.update', 'platformSettings', String(settings._id), 'Updated platform settings', input)
    return settings
  }

  roles() {
    return {
      roles: [
        {
          role: 'student',
          description: 'Learns, practises, books teachers, joins sessions, and manages their own profile.',
          permissions: ['practice:own', 'bookings:own', 'doubts:student', 'profile:own', 'teachers:public'],
        },
        {
          role: 'teacher',
          description: 'Manages teaching profile, availability, booking requests, sessions, students, and earnings.',
          permissions: ['availability:own', 'bookings:assigned', 'doubts:teacher', 'students:assigned', 'earnings:own'],
        },
        {
          role: 'admin',
          description: 'Operates the platform, moderates accounts and teachers, and reviews platform activity.',
          permissions: ['users:manage', 'teachers:approve', 'bookings:manage', 'fees:manage', 'subjects:manage', 'settings:manage', 'audit:read'],
        },
      ],
      policy: {
        serverEnforced: true,
        adminCreation: 'seed-or-database-only',
        selfServiceRoleChange: false,
        leastPrivilege: true,
      },
    }
  }

  async securityOverview() {
    const now = new Date()
    const [activeSessions, revokedSessions, unverifiedUsers, bannedUsers, expiredSessions, recentAdminActions] = await Promise.all([
      AuthSessionModel.countDocuments({ isRevoked: false, expiresAt: { $gt: now } }),
      AuthSessionModel.countDocuments({ isRevoked: true }),
      UserModel.countDocuments({ isEmailVerified: false, deletedAt: null }),
      UserModel.countDocuments({ bannedAt: { $ne: null }, deletedAt: null }),
      AuthSessionModel.countDocuments({ expiresAt: { $lte: now } }),
      AdminAuditLogModel.find().populate('actorId', 'name email').sort({ createdAt: -1 }).limit(10).lean(),
    ])
    return {
      activeSessions,
      revokedSessions,
      unverifiedUsers,
      bannedUsers,
      expiredSessions,
      controls: {
        passwordHashing: 'bcrypt cost 12',
        refreshTokens: 'httpOnly cookie with rotation',
        accessTokens: 'short-lived bearer token kept in memory',
        securityHeaders: true,
        rateLimiting: true,
        requestIds: true,
        roleAuthorization: true,
      },
      recentAdminActions,
    }
  }

  async listAuditLogs(query: PaginationQuery & { search?: string; action?: string }) {
    const filter: Record<string, unknown> = {}
    if (query.action) filter.action = query.action
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i')
      filter.$or = [{ summary: regex }, { targetType: regex }, { targetId: regex }, { requestId: regex }]
    }
    const [items, total] = await Promise.all([
      AdminAuditLogModel.find(filter)
        .populate('actorId', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      AdminAuditLogModel.countDocuments(filter),
    ])
    return { items, pagination: pageMeta(total, query.page, query.limit) }
  }

  async listSupportTickets(query: PaginationQuery & { search?: string; status: 'all' | 'open' | 'in_progress' | 'resolved' | 'closed'; priority: 'all' | 'low' | 'normal' | 'high' | 'urgent' }) {
    const filter: Record<string, unknown> = {}
    if (query.status !== 'all') filter.status = query.status
    if (query.priority !== 'all') filter.priority = query.priority
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i')
      filter.$or = [{ subject: regex }, { requesterName: regex }, { requesterEmail: regex }, { message: regex }]
    }
    const [items, total] = await Promise.all([
      SupportTicketModel.find(filter)
        .populate('requesterId', 'name email role avatar')
        .populate('assignedTo', 'name email')
        .sort({ priority: -1, createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      SupportTicketModel.countDocuments(filter),
    ])
    return { items, pagination: pageMeta(total, query.page, query.limit) }
  }

  async updateSupportTicket(id: string, input: { status: 'open' | 'in_progress' | 'resolved' | 'closed'; priority?: 'low' | 'normal' | 'high' | 'urgent'; resolution?: string }, context: AdminContext) {
    const update: Record<string, unknown> = {
      status: input.status,
      assignedTo: input.status === 'open' ? null : context.adminId,
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.resolution !== undefined ? { resolution: input.resolution } : {}),
      resolvedAt: ['resolved', 'closed'].includes(input.status) ? new Date() : null,
    }
    const ticket = await SupportTicketModel.findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after', runValidators: true })
    if (!ticket) throw new AppError(404, 'Support ticket not found', 'SUPPORT_TICKET_NOT_FOUND')
    await this.audit(context, 'support.update', 'supportTicket', id, `Support ticket moved to ${input.status}`)
    return ticket
  }
}

export const adminService = new AdminService()
export type { AdminContext }
