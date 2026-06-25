import { Schema, model } from 'mongoose'

const authSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, index: true },
    deviceName: { type: String, default: 'Unknown device' },
    userAgent: { type: String, default: null },
    ipAddress: { type: String, default: null },
    isRevoked: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
)

export const AuthSessionModel = model('AuthSession', authSessionSchema)
