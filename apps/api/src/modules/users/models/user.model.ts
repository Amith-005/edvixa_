import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose'

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'teacher', 'admin'], required: true, index: true },
    avatar: { type: String, default: null },
    phone: { type: String, default: null },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, default: null, sparse: true },
    isActive: { type: Boolean, default: true, index: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    banReason: { type: String, default: null },
    bannedAt: { type: Date, default: null },
    bannedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    lastLoginAt: { type: Date, default: null },
    lastPasswordChangeAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

export type User = InferSchemaType<typeof userSchema>
export type UserDocument = HydratedDocument<User>
export const UserModel = model('User', userSchema)
