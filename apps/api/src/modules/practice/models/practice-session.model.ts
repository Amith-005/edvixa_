import { Schema, model } from 'mongoose'

const questionSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, default: null },
    text: { type: String, required: true },
    options: { type: [String], default: [] },
    correctAnswer: { type: String, default: '' },
    explanation: { type: String, default: '' },
    topicId: { type: Schema.Types.ObjectId, required: true },
    topicName: { type: String, required: true },
    difficulty: { type: Number, min: 1, max: 5, required: true },
    points: { type: Number, min: 1, default: 10 },
  },
  { _id: true },
)

const answerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    selectedAnswer: { type: String, default: null },
    isCorrect: { type: Boolean, default: null },
    timeTakenSeconds: { type: Number, min: 0, default: 0 },
    markedForReview: { type: Boolean, default: false },
    answeredAt: { type: Date, default: null },
  },
  { _id: false },
)

const practiceSessionSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true,
    },
    topicIds: [{ type: Schema.Types.ObjectId, required: true }],
    generatedBy: {
      type: String,
      enum: ['ai'],
      default: 'ai',
    },
    aiProvider: { type: String, required: true },
    difficulty: { type: Number, min: 1, max: 5, required: true },
    questionCount: { type: Number, min: 1, max: 50, required: true },
    estimatedMinutes: { type: Number, min: 1, required: true },
    practiceMode: {
      type: String,
      enum: ['adaptive', 'standard'],
      default: 'adaptive',
    },
    questions: { type: [questionSchema], default: [] },
    answers: { type: [answerSchema], default: [] },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'abandoned'],
      default: 'pending',
      index: true,
    },
    score: { type: Number, min: 0, default: 0 },
    xpEarned: { type: Number, min: 0, default: 0 },
    accuracyPercent: { type: Number, min: 0, max: 100, default: 0 },
    timeTakenSeconds: { type: Number, min: 0, default: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

practiceSessionSchema.index({ studentId: 1, createdAt: -1 })
practiceSessionSchema.index({ studentId: 1, status: 1 })

export const PracticeSessionModel = model(
  'PracticeSession',
  practiceSessionSchema,
)
