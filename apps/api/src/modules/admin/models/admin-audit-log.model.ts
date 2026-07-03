import { Schema, model } from 'mongoose'

const adminAuditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorRole: { type: String, enum: ['admin'], default: 'admin' },
    action: { type: String, required: true, trim: true, index: true },
    targetType: { type: String, required: true, trim: true, index: true },
    targetId: { type: String, default: null, index: true },
    summary: { type: String, required: true, trim: true, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    requestId: { type: String, default: null, index: true },
  },
  { timestamps: true },
)

adminAuditLogSchema.index({ createdAt: -1 })
adminAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 })

export const AdminAuditLogModel = model('AdminAuditLog', adminAuditLogSchema)
