import { Schema, model } from 'mongoose'

const doubtPollSchema = new Schema(
  {
    creatorStudentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    gradeLevel: { type: String, required: true, trim: true, index: true },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true,
    },
    subjectName: { type: String, required: true, trim: true },
    topicId: { type: Schema.Types.ObjectId, default: null, index: true },
    topicName: { type: String, required: true, trim: true, maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: '', trim: true, maxlength: 1200 },
    status: {
      type: String,
      enum: ['open', 'will_cover', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    voteCount: { type: Number, default: 1, min: 0, index: true },
    commentCount: { type: Number, default: 0, min: 0 },
    assignedTeacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    preparationNote: { type: String, default: '', trim: true, maxlength: 1200 },
    willCoverAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    linkedBookingIds: [{ type: Schema.Types.ObjectId, ref: 'Booking' }],
  },
  { timestamps: true },
)

doubtPollSchema.index({ gradeLevel: 1, subjectId: 1, topicId: 1, status: 1 })
doubtPollSchema.index({ gradeLevel: 1, voteCount: -1, createdAt: -1 })

export const DoubtPollModel = model('DoubtPoll', doubtPollSchema)
