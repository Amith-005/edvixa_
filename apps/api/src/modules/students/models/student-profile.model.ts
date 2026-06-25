import { Schema, model } from 'mongoose'

const topicMasterySchema = new Schema(
  {
    topicId: { type: Schema.Types.ObjectId, required: true },
    topicName: { type: String, required: true },
    masteryScore: { type: Number, min: 0, max: 100, default: 0 },
    attemptCount: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    averageTimeSeconds: { type: Number, default: 0 },
  },
  { _id: false },
)

const studentProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    gradeLevel: { type: String, default: null },
    preferredSubjects: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    level: { type: Number, default: 1, min: 1 },
    xp: { type: Number, default: 0, min: 0 },
    streak: { type: Number, default: 0, min: 0 },
    lastActiveDate: { type: Date, default: null },
    topicMastery: { type: [topicMasterySchema], default: [] },
    weakTopics: [{ type: Schema.Types.ObjectId }],
    strongTopics: [{ type: Schema.Types.ObjectId }],
    totalTestsTaken: { type: Number, default: 0 },
    totalPracticeSessions: { type: Number, default: 0 },
    totalPracticeTime: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    accuracyPercent: { type: Number, default: 0 },
    onboardingCompleted: { type: Boolean, default: false },
    learningGoal: { type: String, default: null },
  },
  { timestamps: true },
)

export const StudentProfileModel = model('StudentProfile', studentProfileSchema)
