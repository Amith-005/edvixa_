import bcrypt from 'bcryptjs'
import type { Request } from 'express'
import { env } from '../../../config/env.js'
import { emailService } from '../../../infrastructure/email/email.service.js'
import { AppError } from '../../../shared/errors/app-error.js'
import { hashToken, randomOtp, randomToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../../shared/security/token.js'
import { PlatformSettingModel } from '../../admin/models/platform-setting.model.js'
import { StudentProfileModel } from '../../students/models/student-profile.model.js'
import { TeacherProfileModel } from '../../teachers/models/teacher-profile.model.js'
import { UserModel, type UserDocument } from '../../users/models/user.model.js'
import { AuthSessionModel } from '../models/auth-session.model.js'
import { AuthTokenModel } from '../models/auth-token.model.js'

const publicUser = (user: UserDocument) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar ?? null,
  isEmailVerified: user.isEmailVerified,
  isActive: user.isActive,
})

class AuthService {
  private async issueSession(user: UserDocument, req: Request) {
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
    const session = await AuthSessionModel.create({ userId: user._id, refreshTokenHash: 'pending', deviceName: String(req.headers['sec-ch-ua-platform'] ?? 'Browser'), userAgent: req.get('user-agent'), ipAddress: req.ip, expiresAt })
    const refreshToken = signRefreshToken(String(session._id), String(user._id))
    session.refreshTokenHash = hashToken(refreshToken)
    await session.save()
    const accessToken = signAccessToken({ sub: String(user._id), email: user.email, role: user.role })
    return { accessToken, refreshToken, user: publicUser(user) }
  }

  async register(input: { name: string; email: string; password: string; role: 'student' | 'teacher'; gradeLevel?: string; preferredSubjects: string[]; teacher?: { bio: string; qualification: string; experienceYears: number; hourlyRate: number; timezone: string; subjects: string[] } }, req: Request) {
    const settings = await PlatformSettingModel.findOne({ key: 'platform' }).lean()
    if (settings?.maintenanceMode) throw new AppError(503, 'Registration is temporarily unavailable during maintenance', 'MAINTENANCE_MODE')
    if (settings?.allowRegistrations === false) throw new AppError(403, 'New registrations are currently paused', 'REGISTRATIONS_PAUSED')
    if (input.role === 'teacher' && settings?.allowTeacherApplications === false) throw new AppError(403, 'Teacher applications are currently paused', 'TEACHER_APPLICATIONS_PAUSED')
    if (await UserModel.exists({ email: input.email })) throw new AppError(409, 'An account with this email already exists', 'EMAIL_EXISTS')
    const passwordHash = await bcrypt.hash(input.password, 12)
    const user = await UserModel.create({ name: input.name, email: input.email, passwordHash, role: input.role })
    try {
      if (input.role === 'student') await StudentProfileModel.create({ userId: user._id, gradeLevel: input.gradeLevel ?? null, preferredSubjects: input.preferredSubjects })
      else await TeacherProfileModel.create({ userId: user._id, ...(input.teacher ?? {}) })
    } catch (error) {
      await UserModel.findByIdAndDelete(user._id)
      throw error
    }

    const token = randomToken()
    await AuthTokenModel.create({ userId: user._id, purpose: 'email_verification', tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), ipAddress: req.ip })
    try {
      await emailService.send({
        to: user.email,
        subject: 'Verify your Edvixa email',
        text: `Welcome to Edvixa. Verify your email by opening this link: ${env.APP_URL.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}. This link expires in 24 hours.`,
        tag: 'email-verification',
      })
    } catch (error) {
      // The account is already valid at this point. Do not leave the client with
      // a false registration failure; the user can request a fresh link later.
      console.error(JSON.stringify({
        level: 'error',
        message: 'Registration verification email delivery failed',
        userId: String(user._id),
        error: error instanceof Error ? error.message : String(error),
      }))
    }
    return this.issueSession(user, req)
  }

  async login(email: string, password: string, req: Request) {
    const user = await UserModel.findOne({ email, deletedAt: null }).select('+passwordHash')
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError(401, 'Email or password is incorrect', 'INVALID_CREDENTIALS')
    if (!user.isActive) throw new AppError(403, user.banReason || 'This account is disabled', 'ACCOUNT_DISABLED')
    user.lastLoginAt = new Date()
    await user.save()
    return this.issueSession(user, req)
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new AppError(401, 'Refresh token is missing', 'MISSING_REFRESH_TOKEN')
    let payload: { sub: string; sid: string }
    try { payload = verifyRefreshToken(refreshToken) } catch { throw new AppError(401, 'Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN') }
    const session = await AuthSessionModel.findById(payload.sid)
    if (!session || session.isRevoked || session.expiresAt <= new Date() || session.refreshTokenHash !== hashToken(refreshToken)) throw new AppError(401, 'Session is no longer valid', 'SESSION_INVALID')
    const user = await UserModel.findById(payload.sub)
    if (!user || !user.isActive || user.deletedAt) throw new AppError(401, 'Account is not available', 'ACCOUNT_UNAVAILABLE')
    const nextRefreshToken = signRefreshToken(String(session._id), String(user._id))
    session.refreshTokenHash = hashToken(nextRefreshToken)
    await session.save()
    const accessToken = signAccessToken({ sub: String(user._id), email: user.email, role: user.role })
    return { accessToken, refreshToken: nextRefreshToken, user: publicUser(user) }
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return
    await AuthSessionModel.findOneAndUpdate({ refreshTokenHash: hashToken(refreshToken) }, { isRevoked: true, revokedAt: new Date() })
  }

  async forgotPassword(email: string, ipAddress?: string) {
    const user = await UserModel.findOne({ email, deletedAt: null })
    if (!user) return
    await AuthTokenModel.deleteMany({ userId: user._id, purpose: 'password_reset', usedAt: null })
    const otp = randomOtp()
    await AuthTokenModel.create({ userId: user._id, purpose: 'password_reset', otpHash: await bcrypt.hash(otp, 10), expiresAt: new Date(Date.now() + 10 * 60 * 1000), ipAddress })
    try {
      await emailService.send({
        to: user.email,
        subject: 'Your Edvixa password reset code',
        text: `Your Edvixa password reset code is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
        tag: 'password-reset',
      })
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', message: 'Password reset email delivery failed', error: error instanceof Error ? error.message : String(error) }))
    }
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await UserModel.findOne({ email, deletedAt: null })
    if (!user) throw new AppError(400, 'OTP is invalid or expired', 'INVALID_OTP')
    const tokens = await AuthTokenModel.find({ userId: user._id, purpose: 'password_reset', usedAt: null, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 })
    const token = tokens[0]
    if (!token?.otpHash || !(await bcrypt.compare(otp, token.otpHash))) throw new AppError(400, 'OTP is invalid or expired', 'INVALID_OTP')
    user.passwordHash = await bcrypt.hash(newPassword, 12)
    user.lastPasswordChangeAt = new Date()
    await user.save()
    token.usedAt = new Date()
    await token.save()
    await AuthSessionModel.updateMany({ userId: user._id, isRevoked: false }, { isRevoked: true, revokedAt: new Date() })
  }

  async resendVerification(email: string) {
    const user = await UserModel.findOne({ email, deletedAt: null })
    if (!user || user.isEmailVerified) return
    await AuthTokenModel.deleteMany({ userId: user._id, purpose: 'email_verification', usedAt: null })
    const token = randomToken()
    await AuthTokenModel.create({ userId: user._id, purpose: 'email_verification', tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) })
    try {
      await emailService.send({
        to: user.email,
        subject: 'Verify your Edvixa email',
        text: `Verify your email by opening this link: ${env.APP_URL.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}. This link expires in 24 hours.`,
        tag: 'email-verification',
      })
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', message: 'Verification email delivery failed', error: error instanceof Error ? error.message : String(error) }))
    }
  }

  async verifyEmail(token: string) {
    const record = await AuthTokenModel.findOne({ purpose: 'email_verification', tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: new Date() } })
    if (!record) throw new AppError(400, 'Verification link is invalid or expired', 'INVALID_VERIFICATION_TOKEN')
    await UserModel.findByIdAndUpdate(record.userId, { isEmailVerified: true, emailVerifiedAt: new Date() })
    record.usedAt = new Date()
    await record.save()
  }
}

export const authService = new AuthService()
