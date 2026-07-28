import { Types } from 'mongoose'

import { practiceQuestionGenerator } from '../../../infrastructure/ai/practice-question-generator.js'
import { AppError } from '../../../shared/errors/app-error.js'
import { StudentProfileModel } from '../../students/models/student-profile.model.js'
import { SubjectModel } from '../../subjects/models/subject.model.js'
import { PracticeSessionModel } from '../models/practice-session.model.js'

type CreatePracticeInput = {
  subjectId: string
  topicIds: string[]
  difficulty: number
  questionCount: 5 | 10 | 15 | 20
  practiceMode: 'adaptive' | 'standard'
}

type SaveAnswerInput = {
  questionId: string
  selectedAnswer: string | null
  markedForReview?: boolean
  timeTakenSeconds?: number
}

type SubmitPracticeInput = {
  timeTakenSeconds?: number
}

type MasteryEntry = {
  topicId: unknown
  topicName?: string
  masteryScore?: number
}

class PracticeService {
  async getSetup(userId: string) {
    const [profile, subjects] = await Promise.all([
      StudentProfileModel.findOne({ userId }).lean(),
      SubjectModel.find({ isActive: true, isAiEnabled: true })
        .sort({ name: 1 })
        .lean(),
    ])

    if (!profile) {
      throw new AppError(404, 'Student profile not found', 'STUDENT_PROFILE_NOT_FOUND')
    }

    const availableSubjects = subjects
      .map((subject) => ({
        id: String(subject._id),
        name: subject.name,
        slug: subject.slug,
        description: subject.description,
        gradeLevels: subject.gradeLevels,
        topics: subject.topics
          .filter((topic) => topic.isActive && topic.isAiEnabled)
          .sort((left, right) => left.order - right.order)
          .map((topic) => ({
            id: String(topic._id),
            name: topic.name,
            description: topic.description,
            difficultyLevel: topic.difficultyLevel,
          })),
      }))
      .filter((subject) => subject.topics.length > 0)

    const mastery = (profile.topicMastery ?? []) as MasteryEntry[]
    const weakestAttemptedTopic = mastery
      .filter((topic) => Number(topic.masteryScore) < 60)
      .sort((left, right) => Number(left.masteryScore ?? 0) - Number(right.masteryScore ?? 0))[0]

    let recommendedSubjectId: string | null = null
    let recommendedTopicIds: string[] = []
    let recommendationReason = 'Start with a topic that matches your current grade and learning goal.'

    if (weakestAttemptedTopic) {
      const weakTopicId = String(weakestAttemptedTopic.topicId)
      const matchingSubject = availableSubjects.find((subject) =>
        subject.topics.some((topic) => topic.id === weakTopicId),
      )

      if (matchingSubject) {
        recommendedSubjectId = matchingSubject.id
        recommendedTopicIds = [weakTopicId]
        recommendationReason = `Improve your mastery in ${weakestAttemptedTopic.topicName ?? 'this topic'} with a focused session.`
      }
    }

    if (!recommendedSubjectId && availableSubjects.length > 0) {
      const gradeMatchedSubject = availableSubjects.find(
        (subject) =>
          !profile.gradeLevel ||
          subject.gradeLevels.length === 0 ||
          subject.gradeLevels.includes(profile.gradeLevel),
      )
      const subject = gradeMatchedSubject ?? availableSubjects[0]
      if (subject) {
        recommendedSubjectId = subject.id
        recommendedTopicIds = subject.topics[0] ? [subject.topics[0].id] : []
      }
    }

    return {
      subjects: availableSubjects,
      recommendation: {
        subjectId: recommendedSubjectId,
        topicIds: recommendedTopicIds,
        difficulty: 2,
        questionCount: 10,
        practiceMode: 'adaptive' as const,
        reason: recommendationReason,
      },
      limits: { questionCounts: [5, 10, 15, 20], maximumTopics: 5 },
    }
  }

  async createSession(userId: string, input: CreatePracticeInput) {
    const subject = await SubjectModel.findOne({
      _id: input.subjectId,
      isActive: true,
      isAiEnabled: true,
    }).lean()

    if (!subject) {
      throw new AppError(404, 'Subject not found or AI practice is unavailable', 'PRACTICE_SUBJECT_UNAVAILABLE')
    }

    const uniqueTopicIds = [...new Set(input.topicIds)]
    const allowedTopicIds = new Set(
      subject.topics
        .filter((topic) => topic.isActive && topic.isAiEnabled)
        .map((topic) => String(topic._id)),
    )

    if (uniqueTopicIds.some((topicId) => !allowedTopicIds.has(topicId))) {
      throw new AppError(422, 'One or more selected topics are unavailable', 'PRACTICE_TOPIC_UNAVAILABLE')
    }

    const selectedTopics = subject.topics
      .filter((topic) => uniqueTopicIds.includes(String(topic._id)))
      .map((topic) => ({
        id: String(topic._id),
        name: topic.name,
        description: topic.description,
      }))
    const profile = await StudentProfileModel.findOne({ userId }).select('gradeLevel').lean()
    const generated = await practiceQuestionGenerator.generate({
      subjectName: subject.name,
      gradeLevel: profile?.gradeLevel,
      topics: selectedTopics,
      difficulty: input.difficulty,
      questionCount: input.questionCount,
      practiceMode: input.practiceMode,
    })
    const topicNames = new Map(selectedTopics.map((topic) => [topic.id, topic.name]))
    const questions = generated.questions.map((question) => ({
      _id: new Types.ObjectId(),
      questionId: null,
      text: question.text,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      topicId: new Types.ObjectId(question.topicId),
      topicName: topicNames.get(question.topicId) ?? 'Practice topic',
      difficulty: question.difficulty,
      points: 10,
    }))
    const estimatedMinutes = Math.max(5, Math.ceil(input.questionCount * (1.1 + input.difficulty * 0.12)))

    const session = await PracticeSessionModel.create({
      studentId: new Types.ObjectId(userId),
      subjectId: new Types.ObjectId(input.subjectId),
      topicIds: uniqueTopicIds.map((topicId) => new Types.ObjectId(topicId)),
      generatedBy: 'ai',
      aiProvider: `${generated.provider}:${generated.model}`,
      difficulty: input.difficulty,
      questionCount: input.questionCount,
      estimatedMinutes,
      practiceMode: input.practiceMode,
      questions,
      answers: questions.map((question) => ({
        questionId: question._id,
        selectedAnswer: null,
        isCorrect: null,
        timeTakenSeconds: 0,
        markedForReview: false,
        answeredAt: null,
      })),
      status: 'in_progress',
      startedAt: new Date(),
    })

    return {
      id: String(session._id),
      status: session.status,
      estimatedMinutes: session.estimatedMinutes,
      subject: { id: String(subject._id), name: subject.name },
      selectedTopics: selectedTopics.map((topic) => ({ id: topic.id, name: topic.name })),
    }
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.prepareSession(userId, sessionId)
    const subject = await SubjectModel.findById(session.subjectId).select('name').lean()

    return {
      id: String(session._id),
      subject: {
        id: String(session.subjectId),
        name: subject?.name ?? 'Practice',
      },
      status: session.status,
      difficulty: session.difficulty,
      practiceMode: session.practiceMode,
      questionCount: session.questionCount,
      estimatedMinutes: session.estimatedMinutes,
      startedAt: session.startedAt?.toISOString() ?? null,
      questions: session.questions.map((question) => ({
        id: String(question._id),
        text: question.text,
        options: question.options,
        topicId: String(question.topicId),
        topicName: question.topicName,
        difficulty: question.difficulty,
        points: question.points,
      })),
      answers: session.answers.map((answer) => ({
        questionId: String(answer.questionId),
        selectedAnswer: answer.selectedAnswer ?? null,
        markedForReview: answer.markedForReview,
        timeTakenSeconds: answer.timeTakenSeconds,
      })),
      progress: {
        answered: session.answers.filter((answer) => answer.selectedAnswer !== null).length,
        markedForReview: session.answers.filter((answer) => answer.markedForReview).length,
      },
    }
  }

  async saveAnswer(userId: string, sessionId: string, input: SaveAnswerInput) {
    const session = await this.prepareSession(userId, sessionId)

    if (session.status === 'completed' || session.status === 'abandoned') {
      throw new AppError(409, 'This practice session can no longer be changed', 'PRACTICE_SESSION_LOCKED')
    }

    const question = session.questions.find((item) => String(item._id) === input.questionId)
    if (!question) {
      throw new AppError(404, 'Question not found in this session', 'PRACTICE_QUESTION_NOT_FOUND')
    }

    if (input.selectedAnswer !== null && !question.options.includes(input.selectedAnswer)) {
      throw new AppError(422, 'Selected answer is not valid for this question', 'PRACTICE_ANSWER_INVALID')
    }

    const answer = session.answers.find((item) => String(item.questionId) === input.questionId)
    if (!answer) {
      throw new AppError(404, 'Answer record not found', 'PRACTICE_ANSWER_NOT_FOUND')
    }

    answer.selectedAnswer = input.selectedAnswer
    if (typeof input.markedForReview === 'boolean') answer.markedForReview = input.markedForReview
    if (typeof input.timeTakenSeconds === 'number') answer.timeTakenSeconds = input.timeTakenSeconds
    answer.answeredAt = input.selectedAnswer === null ? null : new Date()

    await session.save()

    return {
      questionId: input.questionId,
      selectedAnswer: answer.selectedAnswer ?? null,
      markedForReview: answer.markedForReview,
      timeTakenSeconds: answer.timeTakenSeconds,
    }
  }

  async submitSession(userId: string, sessionId: string, input: SubmitPracticeInput) {
    const session = await this.prepareSession(userId, sessionId)

    if (session.status === 'completed') {
      return this.buildSubmitSummary(session)
    }

    if (session.status === 'abandoned') {
      throw new AppError(409, 'This practice session was abandoned', 'PRACTICE_SESSION_ABANDONED')
    }

    let correctAnswers = 0
    let wrongAnswers = 0
    let skipped = 0
    let earnedPoints = 0
    const totalPoints = session.questions.reduce((sum, question) => sum + question.points, 0)

    for (const question of session.questions) {
      const answer = session.answers.find((item) => String(item.questionId) === String(question._id))
      if (!answer || answer.selectedAnswer === null) {
        skipped += 1
        if (answer) answer.isCorrect = false
        continue
      }

      answer.isCorrect = answer.selectedAnswer === question.correctAnswer
      if (answer.isCorrect) {
        correctAnswers += 1
        earnedPoints += question.points
      } else {
        wrongAnswers += 1
      }
    }

    const score = totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100)
    const xpEarned = correctAnswers * 10 + 20
    const elapsedSeconds = session.startedAt
      ? Math.max(0, Math.floor((Date.now() - session.startedAt.getTime()) / 1000))
      : 0

    session.status = 'completed'
    session.score = score
    session.accuracyPercent = score
    session.xpEarned = xpEarned
    session.timeTakenSeconds = Math.max(0, input.timeTakenSeconds ?? elapsedSeconds)
    session.completedAt = new Date()
    await session.save()

    await this.updateStudentProgress(userId, session)

    return {
      ...this.buildSubmitSummary(session),
      correctAnswers,
      wrongAnswers,
      skipped,
    }
  }

  async listResults(
    userId: string,
    input: {
      search?: string
      subjectId?: string
      sort?: string
      page?: string | number
      limit?: string | number
    },
  ) {
    const page = Math.max(1, Number(input.page) || 1)
    const limit = Math.min(25, Math.max(1, Number(input.limit) || 8))
    const skip = (page - 1) * limit

    const baseFilter: Record<string, unknown> = {
      studentId: userId,
      status: 'completed',
    }

    if (input.subjectId) {
      baseFilter.subjectId = input.subjectId
    }

    if (input.search?.trim()) {
      const matchingSubjects = await SubjectModel.find({
        name: { $regex: input.search.trim(), $options: 'i' },
      })
        .select('_id')
        .lean()

      baseFilter.subjectId = {
        $in: matchingSubjects.map((subject) => subject._id),
      }
    }

    let sort: Record<string, 1 | -1> = { completedAt: -1 }

    if (input.sort === 'oldest') {
      sort = { completedAt: 1 }
    } else if (input.sort === 'highest') {
      sort = { score: -1, completedAt: -1 }
    } else if (input.sort === 'lowest') {
      sort = { score: 1, completedAt: -1 }
    }

    const [sessions, totalItems, summaryRows] = await Promise.all([
      PracticeSessionModel.find(baseFilter)
        .populate('subjectId', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PracticeSessionModel.countDocuments(baseFilter),
      PracticeSessionModel.aggregate<{
        _id: null
        totalCompleted: number
        averageScore: number
        bestScore: number
        totalXpEarned: number
      }>([
        {
          $match: {
            studentId: new Types.ObjectId(userId),
            status: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            totalCompleted: { $sum: 1 },
            averageScore: { $avg: '$score' },
            bestScore: { $max: '$score' },
            totalXpEarned: { $sum: '$xpEarned' },
          },
        },
      ]),
    ])

    const summary = summaryRows[0] ?? {
      totalCompleted: 0,
      averageScore: 0,
      bestScore: 0,
      totalXpEarned: 0,
    }

    const items = sessions.map((session) => {
      const subject = session.subjectId as unknown as {
        _id: unknown
        name?: string
        slug?: string
      }

      return {
        id: String(session._id),
        subject: {
          id: String(subject?._id ?? session.subjectId),
          name: subject?.name ?? 'Practice',
          slug: subject?.slug ?? '',
        },
        questionCount: session.questionCount,
        scorePercent: session.score,
        xpEarned: session.xpEarned,
        timeTakenSeconds: session.timeTakenSeconds,
        difficulty: session.difficulty,
        completedAt:
          session.completedAt?.toISOString() ?? new Date().toISOString(),
      }
    })

    const totalPages = Math.max(1, Math.ceil(totalItems / limit))

    return {
      items,
      summary: {
        totalCompleted: summary.totalCompleted,
        averageScore: Math.round(summary.averageScore || 0),
        bestScore: Math.round(summary.bestScore || 0),
        totalXpEarned: summary.totalXpEarned,
      },
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    }
  }

  async getResult(userId: string, sessionId: string) {
    const session = await PracticeSessionModel.findOne({
      _id: sessionId,
      studentId: userId,
      status: 'completed',
    }).lean()

    if (!session) {
      throw new AppError(
        404,
        'Practice result not found',
        'PRACTICE_RESULT_NOT_FOUND',
      )
    }

    const [subject, profile] = await Promise.all([
      SubjectModel.findById(session.subjectId).select('name').lean(),
      StudentProfileModel.findOne({ userId }).select('level xp').lean(),
    ])

    const answersByQuestion = new Map(
      session.answers.map((answer) => [
        String(answer.questionId),
        answer,
      ]),
    )

    const topicMap = new Map<
      string,
      {
        topicId: string
        topicName: string
        correct: number
        wrong: number
        skipped: number
        total: number
      }
    >()

    let correctAnswers = 0
    let wrongAnswers = 0
    let skipped = 0

    for (const question of session.questions) {
      const answer = answersByQuestion.get(String(question._id))
      const status =
        answer?.selectedAnswer == null
          ? 'skipped'
          : answer.isCorrect
            ? 'correct'
            : 'wrong'

      if (status === 'correct') correctAnswers += 1
      if (status === 'wrong') wrongAnswers += 1
      if (status === 'skipped') skipped += 1

      const key = String(question.topicId)
      const current = topicMap.get(key) ?? {
        topicId: key,
        topicName: question.topicName,
        correct: 0,
        wrong: 0,
        skipped: 0,
        total: 0,
      }

      current.total += 1
      if (status === 'correct') current.correct += 1
      if (status === 'wrong') current.wrong += 1
      if (status === 'skipped') current.skipped += 1
      topicMap.set(key, current)
    }

    const topicBreakdown = [...topicMap.values()].map((topic) => ({
      ...topic,
      scorePercent:
        topic.total === 0
          ? 0
          : Math.round((topic.correct / topic.total) * 100),
    }))

    const strengths = topicBreakdown
      .filter((topic) => topic.scorePercent >= 75)
      .map((topic) => topic.topicName)

    const weaknesses = topicBreakdown
      .filter((topic) => topic.scorePercent < 50)
      .map((topic) => topic.topicName)

    const recommendations =
      weaknesses.length > 0
        ? [
            `Retry ${weaknesses[0]} with a focused practice session.`,
            'Review explanations for incorrect and skipped questions.',
          ]
        : [
            'Continue with a slightly higher difficulty.',
            'Try another topic to broaden your mastery.',
          ]

    const aiFeedback =
      session.score >= 80
        ? 'Excellent work. You showed strong understanding and consistent accuracy. Keep challenging yourself with higher difficulty.'
        : session.score >= 60
          ? 'Good progress. Review the missed questions and practise the weaker topics once more to improve consistency.'
          : 'This attempt identified useful learning gaps. Review each explanation, then retry the weakest topic with a focused session.'

    const levelAfter = Math.max(1, Number(profile?.level) || 1)
    const xpBefore = Math.max(
      0,
      (Number(profile?.xp) || 0) - session.xpEarned,
    )
    const levelBefore = Math.floor(xpBefore / 1000) + 1

    return {
      id: String(session._id),
      subject: {
        id: String(session.subjectId),
        name: subject?.name ?? 'Practice',
      },
      summary: {
        totalQuestions: session.questions.length,
        correctAnswers,
        wrongAnswers,
        skipped,
        scorePercent: session.score,
        accuracyPercent: session.accuracyPercent,
        xpEarned: session.xpEarned,
        timeTakenSeconds: session.timeTakenSeconds,
      },
      topicBreakdown,
      aiFeedback,
      strengths,
      weaknesses,
      recommendations,
      level: {
        before: levelBefore,
        after: levelAfter,
        levelUp: levelAfter > levelBefore,
      },
      completedAt:
        session.completedAt?.toISOString() ?? new Date().toISOString(),
    }
  }
  async getReview(userId: string, sessionId: string) {
    const session = await PracticeSessionModel.findOne({
      _id: sessionId,
      studentId: userId,
      status: 'completed',
    }).lean()

    if (!session) {
      throw new AppError(
        404,
        'Practice review not found',
        'PRACTICE_REVIEW_NOT_FOUND',
      )
    }

    const subject = await SubjectModel.findById(session.subjectId)
      .select('name')
      .lean()

    const answersByQuestion = new Map(
      session.answers.map((answer) => [String(answer.questionId), answer]),
    )

    const questions = session.questions.map((question, index) => {
      const answer = answersByQuestion.get(String(question._id))
      const status: 'correct' | 'wrong' | 'skipped' =
        answer?.selectedAnswer == null
          ? 'skipped'
          : answer.isCorrect
            ? 'correct'
            : 'wrong'

      return {
        id: String(question._id),
        number: index + 1,
        text: question.text,
        options: question.options,
        selectedAnswer: answer?.selectedAnswer ?? null,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        status,
        markedForReview: Boolean(answer?.markedForReview),
        timeTakenSeconds: Math.max(0, Number(answer?.timeTakenSeconds) || 0),
        topic: {
          id: String(question.topicId),
          name: question.topicName,
        },
        difficulty: question.difficulty,
        points: question.points,
      }
    })

    const topicMap = new Map<
      string,
      {
        topicId: string
        topicName: string
        correct: number
        wrong: number
        skipped: number
        total: number
      }
    >()

    for (const question of questions) {
      const current = topicMap.get(question.topic.id) ?? {
        topicId: question.topic.id,
        topicName: question.topic.name,
        correct: 0,
        wrong: 0,
        skipped: 0,
        total: 0,
      }

      current.total += 1
      current[question.status] += 1
      topicMap.set(question.topic.id, current)
    }

    const topicBreakdown = [...topicMap.values()].map((topic) => ({
      ...topic,
      scorePercent:
        topic.total === 0
          ? 0
          : Math.round((topic.correct / topic.total) * 100),
    }))

    const correctAnswers = questions.filter(
      (question) => question.status === 'correct',
    ).length
    const wrongAnswers = questions.filter(
      (question) => question.status === 'wrong',
    ).length
    const skipped = questions.filter(
      (question) => question.status === 'skipped',
    ).length
    const markedForReview = questions.filter(
      (question) => question.markedForReview,
    ).length

    const aiFeedback =
      session.score >= 80
        ? 'Strong performance. Focus on the few missed explanations, then try a higher difficulty or a new topic.'
        : session.score >= 60
          ? 'Good progress. Review the incorrect and skipped answers, especially where the explanation introduces a different solving step.'
          : 'This review highlights useful learning gaps. Read each explanation carefully and retry the weakest topic in a focused session.'

    return {
      id: String(session._id),
      subject: {
        id: String(session.subjectId),
        name: subject?.name ?? 'Practice',
      },
      summary: {
        totalQuestions: questions.length,
        correctAnswers,
        wrongAnswers,
        skipped,
        markedForReview,
        scorePercent: session.score,
        xpEarned: session.xpEarned,
        timeTakenSeconds: session.timeTakenSeconds,
      },
      topicBreakdown,
      aiFeedback,
      questions,
      completedAt:
        session.completedAt?.toISOString() ?? new Date().toISOString(),
    }
  }

  private async prepareSession(userId: string, sessionId: string) {
    const session = await PracticeSessionModel.findOne({
      _id: sessionId,
      studentId: userId,
    })

    if (!session) {
      throw new AppError(404, 'Practice session not found', 'PRACTICE_SESSION_NOT_FOUND')
    }

    if (session.questions.length > 0) return session

    const subject = await SubjectModel.findById(session.subjectId).lean()
    if (!subject) {
      throw new AppError(404, 'Practice subject no longer exists', 'PRACTICE_SUBJECT_NOT_FOUND')
    }

    const selectedTopicIds = new Set(session.topicIds.map((topicId) => String(topicId)))
    const topics = subject.topics.filter((topic) => selectedTopicIds.has(String(topic._id)))

    if (topics.length === 0) {
      throw new AppError(422, 'No valid topics were found for this session', 'PRACTICE_TOPICS_EMPTY')
    }

    const profile = await StudentProfileModel.findOne({ userId }).select('gradeLevel').lean()
    const generationTopics = topics.map((topic) => ({
      id: String(topic._id),
      name: topic.name,
      description: topic.description,
    }))
    const generated = await practiceQuestionGenerator.generate({
      subjectName: subject.name,
      gradeLevel: profile?.gradeLevel,
      topics: generationTopics,
      difficulty: session.difficulty,
      questionCount: session.questionCount,
      practiceMode: session.practiceMode,
    })
    const topicNames = new Map(generationTopics.map((topic) => [topic.id, topic.name]))
    const questions = generated.questions.map((question) => ({
      _id: new Types.ObjectId(),
      questionId: null,
      text: question.text,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      topicId: new Types.ObjectId(question.topicId),
      topicName: topicNames.get(question.topicId) ?? 'Practice topic',
      difficulty: question.difficulty,
      points: 10,
    }))

    session.set({
      generatedBy: 'ai',
      aiProvider: `${generated.provider}:${generated.model}`,
      questions,
      answers: questions.map((question) => ({
        questionId: question._id,
        selectedAnswer: null,
        isCorrect: null,
        timeTakenSeconds: 0,
        markedForReview: false,
        answeredAt: null,
      })),
      status: 'in_progress',
      startedAt: new Date(),
    })
    await session.save()

    return session
  }

  private buildSubmitSummary(session: Awaited<ReturnType<typeof PracticeSessionModel.findOne>>) {
    if (!session) throw new AppError(404, 'Practice session not found', 'PRACTICE_SESSION_NOT_FOUND')

    return {
      id: String(session._id),
      status: session.status,
      score: session.score,
      accuracyPercent: session.accuracyPercent,
      xpEarned: session.xpEarned,
      timeTakenSeconds: session.timeTakenSeconds,
      completedAt: session.completedAt?.toISOString() ?? null,
    }
  }

  private async updateStudentProgress(userId: string, session: NonNullable<Awaited<ReturnType<typeof PracticeSessionModel.findOne>>>) {
    const profile = await StudentProfileModel.findOne({ userId })
    if (!profile) return

    const oldSessionCount = profile.totalPracticeSessions
    const newSessionCount = oldSessionCount + 1
    const newXp = profile.xp + session.xpEarned
    const today = new Date()
    const todayKey = today.toISOString().slice(0, 10)
    const lastKey = profile.lastActiveDate?.toISOString().slice(0, 10)
    const yesterday = new Date(today)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const yesterdayKey = yesterday.toISOString().slice(0, 10)

    const mastery = profile.topicMastery.map((entry) => ({
      topicId: entry.topicId,
      topicName: entry.topicName,
      masteryScore: entry.masteryScore,
      attemptCount: entry.attemptCount,
      lastAttemptAt: entry.lastAttemptAt,
      correctCount: entry.correctCount,
      wrongCount: entry.wrongCount,
      averageTimeSeconds: entry.averageTimeSeconds,
    }))

    const grouped = new Map<string, { topicId: Types.ObjectId; topicName: string; total: number; correct: number; time: number }>()
    for (const question of session.questions) {
      const answer = session.answers.find((item) => String(item.questionId) === String(question._id))
      const key = String(question.topicId)
      const current = grouped.get(key) ?? {
        topicId: question.topicId,
        topicName: question.topicName,
        total: 0,
        correct: 0,
        time: 0,
      }
      current.total += 1
      current.correct += answer?.isCorrect ? 1 : 0
      current.time += answer?.timeTakenSeconds ?? 0
      grouped.set(key, current)
    }

    for (const stats of grouped.values()) {
      const existing = mastery.find((entry) => String(entry.topicId) === String(stats.topicId))
      const score = Math.round((stats.correct / stats.total) * 100)
      if (existing) {
        const previousAttempts = existing.attemptCount
        existing.masteryScore = Math.round(((existing.masteryScore * previousAttempts) + (score * stats.total)) / (previousAttempts + stats.total))
        existing.attemptCount += stats.total
        existing.correctCount += stats.correct
        existing.wrongCount += stats.total - stats.correct
        existing.averageTimeSeconds = Math.round(((existing.averageTimeSeconds * previousAttempts) + stats.time) / (previousAttempts + stats.total))
        existing.lastAttemptAt = new Date()
      } else {
        mastery.push({
          topicId: stats.topicId,
          topicName: stats.topicName,
          masteryScore: score,
          attemptCount: stats.total,
          lastAttemptAt: new Date(),
          correctCount: stats.correct,
          wrongCount: stats.total - stats.correct,
          averageTimeSeconds: Math.round(stats.time / stats.total),
        })
      }
    }

    const weakTopics = mastery.filter((entry) => entry.attemptCount > 0 && entry.masteryScore < 50).map((entry) => entry.topicId)
    const strongTopics = mastery.filter((entry) => entry.attemptCount > 0 && entry.masteryScore >= 75).map((entry) => entry.topicId)

    profile.set({
      xp: newXp,
      level: Math.floor(newXp / 1000) + 1,
      streak: lastKey === todayKey ? profile.streak : lastKey === yesterdayKey ? profile.streak + 1 : 1,
      lastActiveDate: today,
      topicMastery: mastery,
      weakTopics,
      strongTopics,
      totalPracticeSessions: newSessionCount,
      totalTestsTaken: profile.totalTestsTaken + 1,
      totalPracticeTime: profile.totalPracticeTime + Math.ceil(session.timeTakenSeconds / 60),
      averageScore: Math.round(((profile.averageScore * oldSessionCount) + session.score) / newSessionCount),
      accuracyPercent: Math.round(((profile.accuracyPercent * oldSessionCount) + session.accuracyPercent) / newSessionCount),
    })

    await profile.save()
  }
}

export const practiceService = new PracticeService()
