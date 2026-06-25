import { AppError } from '../../../shared/errors/app-error.js'
import { PracticeSessionModel } from '../../practice/models/practice-session.model.js'
import { SubjectModel } from '../../subjects/models/subject.model.js'
import { StudentProfileModel } from '../models/student-profile.model.js'

type PopulatedSubject = {
  _id: unknown
  name?: string
  slug?: string
}

type MasteryTopic = {
  topicId: unknown
  topicName?: string
  masteryScore?: number
  attemptCount?: number
}

class StudentService {
  async dashboard(userId: string) {
    const profile = await StudentProfileModel.findOne({ userId })
      .populate('preferredSubjects', 'name slug')
      .lean()

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
    const progressPercent = Math.min(
      100,
      Math.round((currentLevelXp / xpPerLevel) * 100),
    )

    const mastery = (profile.topicMastery ?? []) as MasteryTopic[]
    const weakTopicIds = new Set(
      (profile.weakTopics ?? []).map((topicId) => String(topicId)),
    )
    const strongTopicIds = new Set(
      (profile.strongTopics ?? []).map((topicId) => String(topicId)),
    )

    const mapTopic = (topic: MasteryTopic) => ({
      id: String(topic.topicId),
      name: topic.topicName || 'Topic',
      masteryScore: Math.max(
        0,
        Math.min(100, Number(topic.masteryScore) || 0),
      ),
      attemptCount: Math.max(0, Number(topic.attemptCount) || 0),
    })

    const weakTopics = mastery
      .filter(
        (topic) =>
          weakTopicIds.has(String(topic.topicId)) ||
          (Number(topic.attemptCount) > 0 &&
            Number(topic.masteryScore) < 50),
      )
      .map(mapTopic)
      .sort((left, right) => left.masteryScore - right.masteryScore)
      .slice(0, 5)

    const strongTopics = mastery
      .filter(
        (topic) =>
          strongTopicIds.has(String(topic.topicId)) ||
          (Number(topic.attemptCount) > 0 &&
            Number(topic.masteryScore) >= 75),
      )
      .map(mapTopic)
      .sort((left, right) => right.masteryScore - left.masteryScore)
      .slice(0, 5)

    const preferredSubjects = (
      (profile.preferredSubjects ?? []) as unknown as PopulatedSubject[]
    ).map((subject) => ({
      id: String(subject._id),
      name: subject.name || 'Subject',
      slug: subject.slug || '',
    }))

    const firstWeakTopic = weakTopics[0]

    const completedSessions = Math.max(
      0,
      Number(profile.totalPracticeSessions) || 0,
    )


    const recommendation =
      firstWeakTopic
        ? {
            title: `Strengthen ${firstWeakTopic.name}`,
            description:
              'A focused practice session on your weakest topic can improve your mastery score.',
            actionLabel: 'Practice weak topic',
            actionUrl: '/student/practice',
          }
        : completedSessions === 0
          ? {
              title: 'Complete your first AI practice',
              description:
                'Choose a subject and topic to receive personalised questions and build your learning profile.',
              actionLabel: 'Create practice',
              actionUrl: '/student/practice',
            }
          : {
              title: 'Keep building your topic mastery',
              description:
                'Try another practice session or increase the difficulty to continue improving.',
              actionLabel: 'Continue practising',
              actionUrl: '/student/practice',
            }

    return {
      profile: {
        gradeLevel: profile.gradeLevel ?? null,
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
        averageScore: Math.max(
          0,
          Math.min(100, Number(profile.averageScore) || 0),
        ),
        accuracyPercent: Math.max(
          0,
          Math.min(100, Number(profile.accuracyPercent) || 0),
        ),
        preferredSubjects,
      },
      xp: {
        currentLevelXp,
        requiredForNextLevel: xpPerLevel,
        remainingXp: Math.max(0, xpPerLevel - currentLevelXp),
        progressPercent,
      },
      recommendation,
      weakTopics,
      strongTopics,
      recentActivity: [],
      upcomingSessions: [],
    }
  }

  async progress(
    userId: string,
    filters: { range: '7d' | '30d' | '90d' | 'all'; subjectId?: string },
  ) {
    const [profile, subjects, sessions] = await Promise.all([
      StudentProfileModel.findOne({ userId }).lean(),
      SubjectModel.find({ isActive: true })
        .select('name slug topics')
        .sort({ name: 1 })
        .lean(),
      PracticeSessionModel.find({ studentId: userId, status: 'completed' })
        .select(
          'subjectId topicIds score xpEarned accuracyPercent timeTakenSeconds completedAt createdAt',
        )
        .sort({ completedAt: 1, createdAt: 1 })
        .lean(),
    ])

    if (!profile) {
      throw new AppError(
        404,
        'Student profile not found',
        'STUDENT_PROFILE_NOT_FOUND',
      )
    }

    const subjectByTopic = new Map<string, string>()
    const subjectNameById = new Map<string, string>()

    const subjectOptions = subjects.map((subject) => {
      const subjectId = String(subject._id)
      subjectNameById.set(subjectId, subject.name)

      for (const topic of subject.topics ?? []) {
        subjectByTopic.set(String(topic._id), subjectId)
      }

      return {
        id: subjectId,
        name: subject.name,
        slug: subject.slug,
      }
    })

    const startDate = getProgressStartDate(filters.range)
    const filteredSessions = sessions.filter((session) => {
      const completedAt = session.completedAt ?? session.createdAt
      if (!completedAt) return false

      const subjectMatches =
        !filters.subjectId || String(session.subjectId) === filters.subjectId
      const dateMatches = !startDate || new Date(completedAt) >= startDate

      return subjectMatches && dateMatches
    })

    const trendSessions = filteredSessions.slice(-24)
    let cumulativeXp = 0
    const trend = trendSessions.map((session) => {
      const completedAt = session.completedAt ?? session.createdAt ?? new Date()
      const xpEarned = Math.max(0, Number(session.xpEarned) || 0)
      cumulativeXp += xpEarned

      return {
        id: String(session._id),
        date: new Date(completedAt).toISOString(),
        score: clampPercent(session.score),
        xpEarned,
        cumulativeXp,
        level: Math.floor(cumulativeXp / 1000) + 1,
        practiceMinutes: roundToOne(
          Math.max(0, Number(session.timeTakenSeconds) || 0) / 60,
        ),
      }
    })

    const periodScoreTotal = filteredSessions.reduce(
      (total, session) => total + clampPercent(session.score),
      0,
    )
    const periodXp = filteredSessions.reduce(
      (total, session) => total + Math.max(0, Number(session.xpEarned) || 0),
      0,
    )
    const periodSeconds = filteredSessions.reduce(
      (total, session) =>
        total + Math.max(0, Number(session.timeTakenSeconds) || 0),
      0,
    )

    const mastery = (profile.topicMastery ?? []) as Array<{
      topicId: unknown
      topicName?: string
      masteryScore?: number
      attemptCount?: number
      correctCount?: number
      wrongCount?: number
      averageTimeSeconds?: number
      lastAttemptAt?: Date | null
    }>

    const topicMastery = mastery
      .filter((topic) => {
        if (!filters.subjectId) return true
        return subjectByTopic.get(String(topic.topicId)) === filters.subjectId
      })
      .map((topic) => ({
        id: String(topic.topicId),
        name: topic.topicName || 'Topic',
        subjectId: subjectByTopic.get(String(topic.topicId)) ?? null,
        masteryScore: clampPercent(topic.masteryScore),
        attemptCount: Math.max(0, Number(topic.attemptCount) || 0),
        correctCount: Math.max(0, Number(topic.correctCount) || 0),
        wrongCount: Math.max(0, Number(topic.wrongCount) || 0),
        averageTimeSeconds: roundToOne(
          Math.max(0, Number(topic.averageTimeSeconds) || 0),
        ),
        lastAttemptAt: topic.lastAttemptAt
          ? new Date(topic.lastAttemptAt).toISOString()
          : null,
      }))
      .filter((topic) => topic.attemptCount > 0)
      .sort((left, right) => right.masteryScore - left.masteryScore)

    const weakTopics = [...topicMastery]
      .filter((topic) => topic.masteryScore < 50)
      .sort((left, right) => left.masteryScore - right.masteryScore)
      .slice(0, 6)

    const strongTopics = topicMastery
      .filter((topic) => topic.masteryScore >= 75)
      .slice(0, 6)

    const subjectPerformance = subjectOptions
      .map((subject) => {
        const matches = filteredSessions.filter(
          (session) => String(session.subjectId) === subject.id,
        )
        const totalScore = matches.reduce(
          (total, session) => total + clampPercent(session.score),
          0,
        )

        return {
          subjectId: subject.id,
          subjectName: subject.name,
          sessions: matches.length,
          averageScore:
            matches.length > 0 ? Math.round(totalScore / matches.length) : 0,
          totalMinutes: roundToOne(
            matches.reduce(
              (total, session) =>
                total + Math.max(0, Number(session.timeTakenSeconds) || 0),
              0,
            ) / 60,
          ),
        }
      })
      .filter((subject) => subject.sessions > 0)
      .sort((left, right) => right.sessions - left.sessions)

    return {
      filters: {
        range: filters.range,
        subjectId: filters.subjectId ?? null,
      },
      subjects: subjectOptions,
      summary: {
        level: Math.max(1, Number(profile.level) || 1),
        xp: Math.max(0, Number(profile.xp) || 0),
        streak: Math.max(0, Number(profile.streak) || 0),
        completedSessions: filteredSessions.length,
        averageScore:
          filteredSessions.length > 0
            ? Math.round(periodScoreTotal / filteredSessions.length)
            : 0,
        accuracyPercent: clampPercent(profile.accuracyPercent),
        xpEarned: periodXp,
        practiceMinutes: roundToOne(periodSeconds / 60),
      },
      trend,
      topicMastery,
      weakTopics,
      strongTopics,
      subjectPerformance,
      heatmap: createLearningHeatmap(filteredSessions, filters.range),
      selectedSubjectName: filters.subjectId
        ? subjectNameById.get(filters.subjectId) ?? 'Selected subject'
        : 'All subjects',
    }
  }
}


function clampPercent(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
}

function roundToOne(value: number) {
  return Math.round(value * 10) / 10
}

function getProgressStartDate(range: '7d' | '30d' | '90d' | 'all') {
  if (range === 'all') return null

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - (days - 1))
  return date
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function createLearningHeatmap(
  sessions: Array<{
    completedAt?: Date | null
    createdAt?: Date | null
    timeTakenSeconds?: number
  }>,
  range: '7d' | '30d' | '90d' | 'all',
) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const activity = new Map<string, { sessions: number; minutes: number }>()

  for (const session of sessions) {
    const date = session.completedAt ?? session.createdAt
    if (!date) continue

    const key = toLocalDateKey(new Date(date))
    const current = activity.get(key) ?? { sessions: 0, minutes: 0 }
    current.sessions += 1
    current.minutes += Math.max(0, Number(session.timeTakenSeconds) || 0) / 60
    activity.set(key, current)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (days - index - 1))
    const key = toLocalDateKey(date)
    const dayActivity = activity.get(key) ?? { sessions: 0, minutes: 0 }

    return {
      date: key,
      sessions: dayActivity.sessions,
      minutes: roundToOne(dayActivity.minutes),
      intensity: Math.min(4, dayActivity.sessions),
    }
  })
}
export const studentService = new StudentService()
