import { Types } from 'mongoose'

import { AppError } from '../../../shared/errors/app-error.js'
import { AvailabilityModel } from '../../availability/models/availability.model.js'
import { FeeModel } from '../../fees/models/fee.model.js'
import { TeacherReviewModel } from '../../reviews/models/teacher-review.model.js'
import { TeacherProfileModel } from '../../teachers/models/teacher-profile.model.js'
import { BookingModel } from '../models/booking.model.js'

type SessionStatusFilter =
  | 'all'
  | 'upcoming'
  | 'pending'
  | 'completed'
  | 'cancelled'

type SessionQuery = {
  status?: SessionStatusFilter
  search?: string
}

type NamedReference = {
  _id: Types.ObjectId
  name: string
  avatar?: string | null
}

type FeeReference = {
  _id: Types.ObjectId
  amount: number
  platformFee: number
  totalAmount: number
  currency: string
  status: string
  paymentMethod: string
  paymentGateway: string
  receiptUrl?: string | null
  refundStatus?: string
  refundAmount?: number
}

type BookingLean = {
  _id: Types.ObjectId
  teacherId: NamedReference | Types.ObjectId
  teacherProfileId: Types.ObjectId
  availabilitySlotId: Types.ObjectId
  subjectId: NamedReference | Types.ObjectId
  topicName: string
  isCustomTopic?: boolean
  studentNote?: string
  teacherNote?: string
  scheduledAt: Date
  endAt: Date
  durationMinutes: number
  timezone: string
  status: string
  meetingProvider?: string | null
  meetingLink?: string | null
  paymentStatus: string
  feeId?: FeeReference | Types.ObjectId | null
  paymentExpiresAt?: Date | null
  cancelledBy?: string | null
  cancellationReason?: string | null
  cancelledAt?: Date | null
  completedAt?: Date | null
  reviewedAt?: Date | null
  rescheduleHistory?: Array<{
    oldScheduledAt: Date
    newScheduledAt: Date
    changedAt?: Date
    reason?: string
  }>
  createdAt: Date
}

type AvailabilityLean = {
  _id: Types.ObjectId
  teacherId: Types.ObjectId
  date: Date
  startTime: string
  endTime: string
  timezone?: string
  subjectIds?: Types.ObjectId[]
  isBooked?: boolean
  isBlocked?: boolean
}

function getNamedReference(
  value: NamedReference | Types.ObjectId,
): NamedReference | null {
  if (value && typeof value === 'object' && 'name' in value) {
    return value as NamedReference
  }
  return null
}

function getFeeReference(
  value: FeeReference | Types.ObjectId | null | undefined,
): FeeReference | null {
  if (value && typeof value === 'object' && 'totalAmount' in value) {
    return value as FeeReference
  }
  return null
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hoursText = '0', minutesText = '0'] = time.split(':')
  const result = new Date(date)
  result.setHours(Number(hoursText), Number(minutesText), 0, 0)
  return result
}

function normalizeStatus(booking: BookingLean): SessionStatusFilter {
  if (
    booking.status === 'cancelled' ||
    booking.status === 'rejected'
  ) {
    return 'cancelled'
  }
  if (booking.status === 'completed') return 'completed'
  if (
    booking.status === 'pending' ||
    booking.paymentStatus === 'pending'
  ) {
    return 'pending'
  }
  return 'upcoming'
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '')
}

class StudentSessionService {
  private async releaseExpiredPendingBookings(studentId: string) {
    const expired = await BookingModel.find({
      studentId,
      status: 'pending',
      paymentStatus: 'pending',
      paymentExpiresAt: { $ne: null, $lt: new Date() },
    }).select('_id availabilitySlotId feeId')

    for (const booking of expired) {
      booking.status = 'cancelled'
      booking.paymentStatus = 'failed'
      booking.cancelledBy = 'student'
      booking.cancellationReason = 'Payment window expired'
      booking.cancelledAt = new Date()
      booking.paymentExpiresAt = null
      await booking.save()

      await FeeModel.updateOne(
        { _id: booking.feeId, status: 'pending' },
        {
          $set: {
            status: 'failed',
            failedAt: new Date(),
            failureReason: 'Payment window expired',
          },
        },
      )

      await AvailabilityModel.updateOne(
        { _id: booking.availabilitySlotId, bookingId: booking._id },
        { $set: { isBooked: false, bookingId: null } },
      )
    }
  }

  private mapBooking(booking: BookingLean) {
    const teacher = getNamedReference(booking.teacherId)
    const subject = getNamedReference(booking.subjectId)
    const fee = getFeeReference(booking.feeId)
    const now = Date.now()
    const scheduledAtMs = booking.scheduledAt.getTime()
    const endAtMs = booking.endAt.getTime()
    const displayStatus = normalizeStatus(booking)
    const joinAvailableAt = new Date(scheduledAtMs - 15 * 60 * 1000)
    const canJoin = Boolean(
      displayStatus === 'upcoming' &&
        booking.meetingLink &&
        now >= joinAvailableAt.getTime() &&
        now <= endAtMs + 30 * 60 * 1000,
    )
    const canModify =
      (displayStatus === 'upcoming' || displayStatus === 'pending') &&
      scheduledAtMs > now

    let joinState: 'available' | 'too_early' | 'link_pending' | 'ended' =
      'link_pending'
    if (now > endAtMs + 30 * 60 * 1000) joinState = 'ended'
    else if (now < joinAvailableAt.getTime()) joinState = 'too_early'
    else if (booking.meetingLink) joinState = 'available'

    return {
      id: String(booking._id),
      teacher: {
        id: teacher ? String(teacher._id) : '',
        profileId: String(booking.teacherProfileId),
        name: teacher?.name ?? 'Teacher',
        avatar: teacher?.avatar ?? null,
      },
      subject: {
        id: subject ? String(subject._id) : '',
        name: subject?.name ?? 'Subject',
      },
      topicName: booking.topicName,
      isCustomTopic: Boolean(booking.isCustomTopic),
      studentNote: booking.studentNote ?? '',
      teacherNote: booking.teacherNote ?? '',
      scheduledAt: booking.scheduledAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      durationMinutes: booking.durationMinutes,
      timezone: booking.timezone,
      status: booking.status,
      displayStatus,
      paymentStatus: booking.paymentStatus,
      payment: fee
        ? {
            feeId: String(fee._id),
            amount: fee.amount,
            platformFee: fee.platformFee,
            totalAmount: fee.totalAmount,
            currency: fee.currency,
            status: fee.status,
            method: fee.paymentMethod,
            gateway: fee.paymentGateway,
            receiptUrl: fee.receiptUrl ?? null,
            refundStatus: fee.refundStatus ?? 'none',
            refundAmount: fee.refundAmount ?? 0,
          }
        : null,
      meeting: {
        provider: booking.meetingProvider ?? null,
        link: booking.meetingLink ?? null,
        canJoin,
        joinState,
        joinAvailableAt: joinAvailableAt.toISOString(),
      },
      canCancel: canModify,
      canReschedule: canModify && displayStatus === 'upcoming',
      canReview: displayStatus === 'completed' && !booking.reviewedAt,
      reviewed: Boolean(booking.reviewedAt),
      cancelledBy: booking.cancelledBy ?? null,
      cancellationReason: booking.cancellationReason ?? null,
      cancelledAt: booking.cancelledAt?.toISOString() ?? null,
      completedAt: booking.completedAt?.toISOString() ?? null,
      rescheduleCount: booking.rescheduleHistory?.length ?? 0,
      createdAt: booking.createdAt.toISOString(),
    }
  }

  private async findOwnedBooking(studentId: string, bookingId: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new AppError(404, 'Session not found', 'BOOKING_NOT_FOUND')
    }

    const booking = await BookingModel.findOne({
      _id: bookingId,
      studentId,
    })

    if (!booking) {
      throw new AppError(404, 'Session not found', 'BOOKING_NOT_FOUND')
    }

    return booking
  }

  async list(studentId: string, query: SessionQuery) {
    await this.releaseExpiredPendingBookings(studentId)

    const rawBookings = (await BookingModel.find({ studentId })
      .populate('teacherId', 'name avatar')
      .populate('subjectId', 'name')
      .populate(
        'feeId',
        'amount platformFee totalAmount currency status paymentMethod paymentGateway receiptUrl refundStatus refundAmount',
      )
      .sort({ scheduledAt: -1 })
      .lean()) as unknown as BookingLean[]

    const allItems = rawBookings.map((booking) => this.mapBooking(booking))
    const requestedStatus = query.status ?? 'all'
    const search = query.search?.trim().toLowerCase() ?? ''

    const items = allItems.filter((item) => {
      if (requestedStatus !== 'all' && item.displayStatus !== requestedStatus) {
        return false
      }
      if (!search) return true
      return [item.teacher.name, item.subject.name, item.topicName]
        .join(' ')
        .toLowerCase()
        .includes(search)
    })

    const summary = {
      total: allItems.length,
      upcoming: allItems.filter((item) => item.displayStatus === 'upcoming')
        .length,
      pending: allItems.filter((item) => item.displayStatus === 'pending').length,
      completed: allItems.filter((item) => item.displayStatus === 'completed')
        .length,
      cancelled: allItems.filter((item) => item.displayStatus === 'cancelled')
        .length,
      investment: allItems.reduce((sum, item) => {
        if (!item.payment || item.payment.status !== 'paid') return sum
        if (item.payment.refundStatus === 'processed') {
          return sum + Math.max(0, item.payment.totalAmount - item.payment.refundAmount)
        }
        return sum + item.payment.totalAmount
      }, 0),
      currency: 'INR',
    }

    return { items, summary }
  }

  async cancel(studentId: string, bookingId: string, reason?: string) {
    const booking = await this.findOwnedBooking(studentId, bookingId)
    const displayStatus = normalizeStatus(booking.toObject() as BookingLean)

    if (displayStatus === 'completed' || displayStatus === 'cancelled') {
      throw new AppError(
        409,
        'This session can no longer be cancelled',
        'BOOKING_NOT_CANCELLABLE',
      )
    }
    if (booking.scheduledAt.getTime() <= Date.now()) {
      throw new AppError(
        409,
        'A session cannot be cancelled after it starts',
        'BOOKING_ALREADY_STARTED',
      )
    }

    const cancellationReason = reason?.trim() || 'Cancelled by student'
    booking.status = 'cancelled'
    booking.cancelledBy = 'student'
    booking.cancellationReason = cancellationReason
    booking.cancelledAt = new Date()
    booking.paymentExpiresAt = null

    const fee = await FeeModel.findOne({ bookingId: booking._id })
    if (fee?.status === 'pending') {
      fee.status = 'failed'
      fee.failedAt = new Date()
      fee.failureReason = cancellationReason
      booking.paymentStatus = 'failed'
      await fee.save()
    } else if (fee?.status === 'paid') {
      fee.refundStatus = 'requested'
      fee.refundAmount = fee.totalAmount
      fee.refundReason = cancellationReason
      await fee.save()
    }

    await booking.save()
    await AvailabilityModel.updateOne(
      { _id: booking.availabilitySlotId, bookingId: booking._id },
      { $set: { isBooked: false, bookingId: null } },
    )

    return {
      id: String(booking._id),
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      refundStatus: fee?.refundStatus ?? 'none',
    }
  }

  async reschedule(
    studentId: string,
    bookingId: string,
    input: { slotId: string; reason?: string },
  ) {
    const booking = await this.findOwnedBooking(studentId, bookingId)
    const displayStatus = normalizeStatus(booking.toObject() as BookingLean)

    if (displayStatus !== 'upcoming' || booking.scheduledAt.getTime() <= Date.now()) {
      throw new AppError(
        409,
        'Only future confirmed sessions can be rescheduled',
        'BOOKING_NOT_RESCHEDULABLE',
      )
    }
    if (!Types.ObjectId.isValid(input.slotId)) {
      throw new AppError(422, 'Select a valid time slot', 'INVALID_SLOT')
    }
    if (String(booking.availabilitySlotId) === input.slotId) {
      throw new AppError(422, 'Select a different time slot', 'SAME_SLOT')
    }

    const newSlot = (await AvailabilityModel.findOneAndUpdate(
      {
        _id: input.slotId,
        teacherId: booking.teacherId,
        isBooked: false,
        isBlocked: false,
        $or: [
          { subjectIds: { $size: 0 } },
          { subjectIds: booking.subjectId },
        ],
      },
      { $set: { isBooked: true } },
      { new: true },
    ).lean()) as unknown as AvailabilityLean | null

    if (!newSlot) {
      throw new AppError(
        409,
        'That time slot is no longer available',
        'SLOT_UNAVAILABLE',
      )
    }

    const newScheduledAt = combineDateAndTime(newSlot.date, newSlot.startTime)
    const newEndAt = combineDateAndTime(newSlot.date, newSlot.endTime)
    if (newScheduledAt.getTime() <= Date.now()) {
      await AvailabilityModel.updateOne(
        { _id: newSlot._id },
        { $set: { isBooked: false, bookingId: null } },
      )
      throw new AppError(409, 'That time slot has already passed', 'SLOT_EXPIRED')
    }

    const oldSlotId = booking.availabilitySlotId
    const oldScheduledAt = booking.scheduledAt

    try {
      booking.rescheduleHistory.push({
        oldScheduledAt,
        newScheduledAt,
        oldAvailabilitySlotId: oldSlotId,
        newAvailabilitySlotId: newSlot._id,
        changedBy: 'student',
        reason: input.reason?.trim() ?? '',
        changedAt: new Date(),
      })
      booking.availabilitySlotId = newSlot._id
      booking.scheduledAt = newScheduledAt
      booking.endAt = newEndAt
      booking.durationMinutes = Math.max(
        1,
        Math.round((newEndAt.getTime() - newScheduledAt.getTime()) / 60000),
      )
      booking.timezone = newSlot.timezone ?? booking.timezone
      booking.status = 'rescheduled'
      await booking.save()

      await AvailabilityModel.updateOne(
        { _id: newSlot._id },
        { $set: { bookingId: booking._id } },
      )
      await AvailabilityModel.updateOne(
        { _id: oldSlotId, bookingId: booking._id },
        { $set: { isBooked: false, bookingId: null } },
      )

      return {
        id: String(booking._id),
        status: booking.status,
        scheduledAt: booking.scheduledAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        timezone: booking.timezone,
      }
    } catch (error) {
      await AvailabilityModel.updateOne(
        { _id: newSlot._id },
        { $set: { isBooked: false, bookingId: null } },
      ).catch(() => undefined)
      throw error
    }
  }

  async addReview(
    studentId: string,
    bookingId: string,
    input: { rating: number; review: string },
  ) {
    const booking = await this.findOwnedBooking(studentId, bookingId)
    if (booking.status !== 'completed') {
      throw new AppError(
        409,
        'You can review a teacher only after a completed session',
        'SESSION_NOT_COMPLETED',
      )
    }
    if (booking.reviewedAt) {
      throw new AppError(409, 'This session has already been reviewed', 'ALREADY_REVIEWED')
    }

    const existingReview = await TeacherReviewModel.findOne({ bookingId })
    if (existingReview) {
      throw new AppError(409, 'This session has already been reviewed', 'ALREADY_REVIEWED')
    }

    const review = await TeacherReviewModel.create({
      studentId,
      teacherId: booking.teacherId,
      bookingId: booking._id,
      rating: input.rating,
      review: input.review.trim(),
      isVisible: true,
    })

    booking.reviewedAt = new Date()
    await booking.save()

    const ratingSummary = await TeacherReviewModel.aggregate<{
      _id: null
      rating: number
      totalReviews: number
    }>([
      { $match: { teacherId: booking.teacherId, isVisible: true } },
      {
        $group: {
          _id: null,
          rating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ])
    const summary = ratingSummary[0]
    await TeacherProfileModel.updateOne(
      { userId: booking.teacherId },
      {
        $set: {
          rating: summary ? Number(summary.rating.toFixed(1)) : input.rating,
          totalReviews: summary?.totalReviews ?? 1,
        },
      },
    )

    return {
      id: String(review._id),
      rating: review.rating,
      review: review.review,
      createdAt: review.createdAt.toISOString(),
    }
  }

  async receipt(studentId: string, bookingId: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new AppError(404, 'Receipt not found', 'RECEIPT_NOT_FOUND')
    }

    const booking = (await BookingModel.findOne({ _id: bookingId, studentId })
      .populate('teacherId', 'name')
      .populate('subjectId', 'name')
      .populate(
        'feeId',
        'amount platformFee totalAmount currency status paymentMethod paymentGateway gatewayPaymentId paidAt refundStatus refundAmount',
      )
      .lean()) as unknown as BookingLean | null

    if (!booking) {
      throw new AppError(404, 'Receipt not found', 'RECEIPT_NOT_FOUND')
    }

    const teacher = getNamedReference(booking.teacherId)
    const subject = getNamedReference(booking.subjectId)
    const fee = getFeeReference(booking.feeId)
    if (!fee) {
      throw new AppError(404, 'Payment record not found', 'PAYMENT_NOT_FOUND')
    }

    const lines = [
      'EDVIXA PAYMENT RECEIPT',
      '======================',
      `Booking ID: ${String(booking._id)}`,
      `Teacher: ${teacher?.name ?? 'Teacher'}`,
      `Subject: ${subject?.name ?? 'Subject'}`,
      `Chapter / Topic: ${booking.topicName}`,
      `Session: ${booking.scheduledAt.toLocaleString('en-IN', {
        timeZone: booking.timezone,
        dateStyle: 'full',
        timeStyle: 'short',
      })}`,
      `Timezone: ${booking.timezone}`,
      '',
      `Session fee: ${fee.currency} ${fee.amount}`,
      `Platform fee: ${fee.currency} ${fee.platformFee}`,
      `Total: ${fee.currency} ${fee.totalAmount}`,
      `Payment status: ${fee.status}`,
      `Payment method: ${fee.paymentMethod}`,
      `Payment gateway: ${fee.paymentGateway}`,
      `Refund status: ${fee.refundStatus ?? 'none'}`,
      '',
      'Thank you for learning with Edvixa.',
    ]

    return {
      filename: `edvixa-receipt-${safeFilePart(String(booking._id))}.txt`,
      content: lines.join('\n'),
    }
  }
}

export const studentSessionService = new StudentSessionService()
