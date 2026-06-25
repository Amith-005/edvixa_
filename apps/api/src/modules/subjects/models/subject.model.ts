import { Schema, model } from 'mongoose'

const topicSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    difficultyLevel: { type: Number, min: 1, max: 5, default: 1 },
    isAiEnabled: { type: Boolean, default: true },
    parentTopicId: { type: Schema.Types.ObjectId, default: null },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
)

const subjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    description: { type: String, default: '' },
    gradeLevels: { type: [String], default: [] },
    topics: { type: [topicSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    isAiEnabled: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

export const SubjectModel = model('Subject', subjectSchema)
