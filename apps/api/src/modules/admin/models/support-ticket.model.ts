import { Schema, model } from 'mongoose'

const supportTicketSchema = new Schema(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    requesterName: { type: String, required: true, trim: true, maxlength: 100 },
    requesterEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    requesterRole: { type: String, enum: ['student', 'teacher', 'admin'], required: true },
    subject: { type: String, required: true, trim: true, maxlength: 180 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    category: { type: String, enum: ['account', 'booking', 'payment', 'technical', 'other'], default: 'other', index: true },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal', index: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open', index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolution: { type: String, default: '', trim: true, maxlength: 3000 },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

supportTicketSchema.index({ status: 1, priority: -1, createdAt: -1 })

export const SupportTicketModel = model('SupportTicket', supportTicketSchema)
