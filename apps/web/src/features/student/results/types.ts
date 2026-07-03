export type PracticeResultData = {
  id: string
  subject: {
    id: string
    name: string
  }
  summary: {
    totalQuestions: number
    correctAnswers: number
    wrongAnswers: number
    skipped: number
    scorePercent: number
    accuracyPercent: number
    xpEarned: number
    timeTakenSeconds: number
  }
  topicBreakdown: Array<{
    topicId: string
    topicName: string
    correct: number
    wrong: number
    skipped: number
    total: number
    scorePercent: number
  }>
  aiFeedback: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  level: {
    before: number
    after: number
    levelUp: boolean
  }
  completedAt: string
}

export type PracticeResultListItem = {
  id: string
  subject: {
    id: string
    name: string
    slug: string
  }
  questionCount: number
  scorePercent: number
  xpEarned: number
  timeTakenSeconds: number
  difficulty: number
  completedAt: string
}

export type PracticeResultsHistoryData = {
  items: PracticeResultListItem[]
  summary: {
    totalCompleted: number
    averageScore: number
    bestScore: number
    totalXpEarned: number
  }
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

export type PracticeReviewQuestionStatus = 'correct' | 'wrong' | 'skipped'

export type PracticeReviewData = {
  id: string
  subject: {
    id: string
    name: string
  }
  summary: {
    totalQuestions: number
    correctAnswers: number
    wrongAnswers: number
    skipped: number
    markedForReview: number
    scorePercent: number
    xpEarned: number
    timeTakenSeconds: number
  }
  topicBreakdown: Array<{
    topicId: string
    topicName: string
    correct: number
    wrong: number
    skipped: number
    total: number
    scorePercent: number
  }>
  aiFeedback: string
  questions: Array<{
    id: string
    number: number
    text: string
    options: string[]
    selectedAnswer: string | null
    correctAnswer: string
    explanation: string
    status: PracticeReviewQuestionStatus
    markedForReview: boolean
    timeTakenSeconds: number
    topic: {
      id: string
      name: string
    }
    difficulty: number
    points: number
  }>
  completedAt: string
}
