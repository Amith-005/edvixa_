import { Schema, model } from 'mongoose'

const doubtPollCommentSchema = new Schema(
  {
    pollId: {
      type: Schema.Types.ObjectId,
      ref: 'DoubtPoll',
      required: true,
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorRole: {
      type: String,
      enum: ['student', 'teacher'],
      required: true,
    },
    body: { type: String, required: true, trim: true, maxlength: 800 },
  },
  { timestamps: true },
)

doubtPollCommentSchema.index({ pollId: 1, createdAt: 1 })

export const DoubtPollCommentModel = model(
  'DoubtPollComment',
  doubtPollCommentSchema,
)
