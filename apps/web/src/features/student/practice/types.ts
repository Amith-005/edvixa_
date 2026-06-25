export type PracticeTopic = {
  id: string
  name: string
  description: string
  difficultyLevel: number
}

export type PracticeSubject = {
  id: string
  name: string
  slug: string
  description: string
  gradeLevels: string[]
  topics: PracticeTopic[]
}

export type PracticeSetupData = {
  subjects: PracticeSubject[]
  recommendation: {
    subjectId: string | null
    topicIds: string[]
    difficulty: number
    questionCount: 5 | 10 | 15 | 20
    practiceMode: 'adaptive' | 'standard'
    reason: string
  }
  limits: {
    questionCounts: Array<5 | 10 | 15 | 20>
    maximumTopics: number
  }
}

export type CreatePracticeSessionResponse = {
  id: string
  status: 'pending'
  estimatedMinutes: number
  subject: {
    id: string
    name: string
  }
  selectedTopics: Array<{
    id: string
    name: string
  }>
}

export type ActivePracticeQuestion = {
  id: string
  text: string
  options: string[]
  topicId: string
  topicName: string
  difficulty: number
  points: number
}

export type ActivePracticeAnswer = {
  questionId: string
  selectedAnswer: string | null
  markedForReview: boolean
  timeTakenSeconds: number
}

export type ActivePracticeSession = {
  id: string
  subject: {
    id: string
    name: string
  }
  status: 'in_progress' | 'completed' | 'abandoned'
  difficulty: number
  practiceMode: 'adaptive' | 'standard'
  questionCount: number
  estimatedMinutes: number
  startedAt: string | null
  questions: ActivePracticeQuestion[]
  answers: ActivePracticeAnswer[]
  progress: {
    answered: number
    markedForReview: number
  }
}

export type SubmitPracticeResponse = {
  id: string
  status: 'completed'
  score: number
  accuracyPercent: number
  xpEarned: number
  timeTakenSeconds: number
  completedAt: string | null
  correctAnswers: number
  wrongAnswers: number
  skipped: number
}
