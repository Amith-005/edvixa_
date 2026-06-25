import bcrypt from 'bcryptjs'
import { AppError } from '../../../shared/errors/app-error.js'
import { AuthSessionModel } from '../../auth/models/auth-session.model.js'
import { StudentProfileModel } from '../../students/models/student-profile.model.js'
import { TeacherProfileModel } from '../../teachers/models/teacher-profile.model.js'
import { UserModel } from '../models/user.model.js'

class UserService {
  async getMe(userId: string) {
    const user = await UserModel.findById(userId).lean()
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND')
    const roleProfile = user.role === 'student' ? await StudentProfileModel.findOne({ userId }).populate('preferredSubjects', 'name slug').lean() : user.role === 'teacher' ? await TeacherProfileModel.findOne({ userId }).populate('subjects', 'name slug').lean() : null
    return { user: { id: String(user._id), name: user.name, email: user.email, role: user.role, avatar: user.avatar, phone: user.phone, isActive: user.isActive, isEmailVerified: user.isEmailVerified, createdAt: user.createdAt }, roleProfile }
  }

  async updateMe(userId: string, input: { name?: string; phone?: string | null; avatar?: string | null }) {
    const user = await UserModel.findByIdAndUpdate(userId, { $set: input }, { new: true, runValidators: true }).lean()
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND')
    return user
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await UserModel.findById(userId).select('+passwordHash')
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND')
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw new AppError(400, 'Current password is incorrect', 'CURRENT_PASSWORD_INCORRECT')
    user.passwordHash = await bcrypt.hash(newPassword, 12)
    user.lastPasswordChangeAt = new Date()
    await user.save()
    await AuthSessionModel.updateMany({ userId, isRevoked: false }, { isRevoked: true, revokedAt: new Date() })
  }
}

export const userService = new UserService()
