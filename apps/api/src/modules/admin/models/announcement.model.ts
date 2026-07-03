import { Schema, model } from 'mongoose'

const announcementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    audience: { type: String, enum: ['all', 'student', 'teacher'], default: 'all', index: true },
    severity: { type: String, enum: ['info', 'success', 'warning', 'critical'], default: 'info' },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    publishAt: { type: Date, default: null, index: true },
    expiresAt: { type: Date, default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

announcementSchema.index({ status: 1, publishAt: -1 })

export const AnnouncementModel = model('Announcement', announcementSchema)
