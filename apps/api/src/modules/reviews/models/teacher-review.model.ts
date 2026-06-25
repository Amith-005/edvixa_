import { Schema, model } from 'mongoose'

const teacherReviewSchema = new Schema(
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
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true, trim: true, maxlength: 1200 },
    isVisible: { type: Boolean, default: true, index: true },
    reportedAt: { type: Date, default: null },
    reportReason: { type: String, default: null },
  },
  { timestamps: true },
)

teacherReviewSchema.index({ teacherId: 1, createdAt: -1 })
teacherReviewSchema.index({ teacherId: 1, studentId: 1 })
teacherReviewSchema.index({ bookingId: 1 }, { unique: true, sparse: true })

export const TeacherReviewModel = model('TeacherReview', teacherReviewSchema)
