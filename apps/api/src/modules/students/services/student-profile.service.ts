import { AppError } from '../../../shared/errors/app-error.js'
import { SubjectModel } from '../../subjects/models/subject.model.js'
import { UserModel } from '../../users/models/user.model.js'
import { StudentProfileModel } from '../models/student-profile.model.js'

type StudentProfileUpdate = {
  name?: string
  phone?: string | null
  avatar?: string | null
  gradeLevel?: string | null
  learningGoal?: string | null
  preferredSubjects?: string[]
}

type MasteryTopic = {
  topicId: unknown
  topicName?: string
  masteryScore?: number
  attemptCount?: number
}

class StudentProfileService {
  async getProfile(userId: string) {
    const [user, profile, activeSubjects] = await Promise.all([
      UserModel.findById(userId).lean(),
      StudentProfileModel.findOne({ userId })
        .populate('preferredSubjects', 'name slug')
        .lean(),
      SubjectModel.find({ isActive: true })
        .select('name slug')
        .sort({ name: 1 })
        .lean(),
    ])

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND')
    }

    if (!profile) {
      throw new AppError(
        404,
        'Student profile not found',
        'STUDENT_PROFILE_NOT_FOUND',
      )
    }

    const level = Math.max(1, Number(profile.level) || 1)
    const xp = Math.max(0, Number(profile.xp) || 0)
    const xpPerLevel = 1000
    const levelStartXp = (level - 1) * xpPerLevel
    const currentLevelXp = Math.min(
      xpPerLevel,
      Math.max(0, xp - levelStartXp),
    )

    const mastery = (profile.topicMastery ?? []) as MasteryTopic[]
    const masteryById = new Map(
      mastery.map((topic) => [String(topic.topicId), topic]),
    )

    const topicSummary = (topicId: unknown) => {
      const topic = masteryById.get(String(topicId))
      return {
        id: String(topicId),
        name: topic?.topicName || 'Topic',
        masteryScore: clampPercent(topic?.masteryScore),
        attemptCount: Math.max(0, Number(topic?.attemptCount) || 0),
      }
    }

    return {
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone ?? null,
        avatar: user.avatar ?? null,
        isEmailVerified: Boolean(user.isEmailVerified),
        createdAt: user.createdAt,
      },
      profile: {
        gradeLevel: profile.gradeLevel ?? null,
        learningGoal: profile.learningGoal ?? null,
        preferredSubjects: (profile.preferredSubjects ?? []).map((subject) => {
          const populated = subject as unknown as {
            _id: unknown
            name?: string
            slug?: string
          }
          return {
            id: String(populated._id),
            name: populated.name || 'Subject',
            slug: populated.slug || '',
          }
        }),
        level,
        xp,
        streak: Math.max(0, Number(profile.streak) || 0),
        totalPracticeSessions: Math.max(
          0,
          Number(profile.totalPracticeSessions) || 0,
        ),
        totalTestsTaken: Math.max(
          0,
          Number(profile.totalTestsTaken) || 0,
        ),
        totalPracticeTime: Math.max(
          0,
          Number(profile.totalPracticeTime) || 0,
        ),
        averageScore: clampPercent(profile.averageScore),
        accuracyPercent: clampPercent(profile.accuracyPercent),
        weakTopics: (profile.weakTopics ?? []).map(topicSummary),
        strongTopics: (profile.strongTopics ?? []).map(topicSummary),
      },
      xp: {
        currentLevelXp,
        requiredForNextLevel: xpPerLevel,
        remainingXp: Math.max(0, xpPerLevel - currentLevelXp),
        progressPercent: Math.min(
          100,
          Math.round((currentLevelXp / xpPerLevel) * 100),
        ),
      },
      availableSubjects: activeSubjects.map((subject) => ({
        id: String(subject._id),
        name: subject.name,
        slug: subject.slug,
      })),
    }
  }

  async updateProfile(userId: string, input: StudentProfileUpdate) {
    if (input.preferredSubjects) {
      const uniqueSubjectIds = [...new Set(input.preferredSubjects)]
      const subjectCount = await SubjectModel.countDocuments({
        _id: { $in: uniqueSubjectIds },
        isActive: true,
      })

      if (subjectCount !== uniqueSubjectIds.length) {
        throw new AppError(
          400,
          'One or more preferred subjects are unavailable',
          'INVALID_PREFERRED_SUBJECT',
        )
      }

      input.preferredSubjects = uniqueSubjectIds
    }

    const userUpdate: Record<string, unknown> = {}
    const profileUpdate: Record<string, unknown> = {}

    if (input.name !== undefined) userUpdate.name = input.name
    if (input.phone !== undefined) userUpdate.phone = input.phone
    if (input.avatar !== undefined) userUpdate.avatar = input.avatar
    if (input.gradeLevel !== undefined) {
      profileUpdate.gradeLevel = input.gradeLevel
    }
    if (input.learningGoal !== undefined) {
      profileUpdate.learningGoal = input.learningGoal
    }
    if (input.preferredSubjects !== undefined) {
      profileUpdate.preferredSubjects = input.preferredSubjects
    }

    const [user, profile] = await Promise.all([
      Object.keys(userUpdate).length > 0
        ? UserModel.findByIdAndUpdate(
            userId,
            { $set: userUpdate },
            { returnDocument: 'after', runValidators: true },
          )
        : UserModel.findById(userId),
      Object.keys(profileUpdate).length > 0
        ? StudentProfileModel.findOneAndUpdate(
            { userId },
            { $set: profileUpdate },
            { returnDocument: 'after', runValidators: true },
          )
        : StudentProfileModel.findOne({ userId }),
    ])

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND')
    }

    if (!profile) {
      throw new AppError(
        404,
        'Student profile not found',
        'STUDENT_PROFILE_NOT_FOUND',
      )
    }

    return this.getProfile(userId)
  }
}

function clampPercent(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
}

export const studentProfileService = new StudentProfileService()
