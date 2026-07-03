import { Schema, model } from 'mongoose'

const rescheduleHistorySchema = new Schema(
  {
    oldScheduledAt: { type: Date, required: true },
    newScheduledAt: { type: Date, required: true },
    oldAvailabilitySlotId: { type: Schema.Types.ObjectId, ref: 'Availability' },
    newAvailabilitySlotId: { type: Schema.Types.ObjectId, ref: 'Availability' },
    changedBy: { type: String, enum: ['student', 'teacher', 'admin'], required: true },
    reason: { type: String, default: '' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const bookingSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    teacherProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'TeacherProfile',
      required: true,
      index: true,
    },
    availabilitySlotId: {
      type: Schema.Types.ObjectId,
      ref: 'Availability',
      required: true,
      unique: true,
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true,
    },
    topicIds: [{ type: Schema.Types.ObjectId }],
    topicName: { type: String, required: true, trim: true, maxlength: 120 },
    doubtPollId: {
      type: Schema.Types.ObjectId,
      ref: 'DoubtPoll',
      default: null,
      index: true,
    },
    doubtText: { type: String, default: '', trim: true, maxlength: 160 },
    studentGrade: { type: String, default: null, trim: true, index: true },
    isCustomTopic: { type: Boolean, default: false },
    studentNote: { type: String, default: '', trim: true, maxlength: 500 },
    teacherNote: { type: String, default: '', trim: true, maxlength: 1000 },
    scheduledAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 15, default: 60 },
    timezone: { type: String, required: true, default: 'Asia/Kolkata' },
    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'rejected',
        'upcoming',
        'completed',
        'cancelled',
        'rescheduled',
      ],
      default: 'upcoming',
      index: true,
    },
    meetingProvider: {
      type: String,
      enum: ['google_meet', 'zoom', 'manual', null],
      default: null,
    },
    meetingLink: { type: String, default: null },
    meetingId: { type: String, default: null },
    feeId: { type: Schema.Types.ObjectId, ref: 'Fee', default: null },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentExpiresAt: { type: Date, default: null, index: true },
    cancelledBy: {
      type: String,
      enum: ['student', 'teacher', 'admin', null],
      default: null,
    },
    cancellationReason: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
    rescheduleHistory: { type: [rescheduleHistorySchema], default: [] },
    completedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

bookingSchema.index({ studentId: 1, scheduledAt: -1 })
bookingSchema.index({ teacherId: 1, scheduledAt: -1 })

export const BookingModel = model('Booking', bookingSchema)
