import { Schema, model } from 'mongoose'

const authTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  purpose: { type: String, enum: ['email_verification', 'password_reset'], required: true, index: true },
  tokenHash: { type: String, default: null },
  otpHash: { type: String, default: null },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  usedAt: { type: Date, default: null },
  ipAddress: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
})

export const AuthTokenModel = model('AuthToken', authTokenSchema)
