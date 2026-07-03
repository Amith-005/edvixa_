import { Schema, model } from 'mongoose'

const doubtPollVoteSchema = new Schema(
  {
    pollId: {
      type: Schema.Types.ObjectId,
      ref: 'DoubtPoll',
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
)

doubtPollVoteSchema.index({ pollId: 1, studentId: 1 }, { unique: true })

export const DoubtPollVoteModel = model('DoubtPollVote', doubtPollVoteSchema)
