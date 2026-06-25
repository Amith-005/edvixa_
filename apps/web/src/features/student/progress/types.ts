export type ProgressRange = '7d' | '30d' | '90d' | 'all'

export type ProgressTopic = {
  id: string
  name: string
  subjectId: string | null
  masteryScore: number
  attemptCount: number
  correctCount: number
  wrongCount: number
  averageTimeSeconds: number
  lastAttemptAt: string | null
}

export type StudentProgressData = {
  filters: {
    range: ProgressRange
    subjectId: string | null
  }
  selectedSubjectName: string
  subjects: Array<{
    id: string
    name: string
    slug: string
  }>
  summary: {
    level: number
    xp: number
    streak: number
    completedSessions: number
    averageScore: number
    accuracyPercent: number
    xpEarned: number
    practiceMinutes: number
  }
  trend: Array<{
    id: string
    date: string
    score: number
    xpEarned: number
    cumulativeXp: number
    level: number
    practiceMinutes: number
  }>
  topicMastery: ProgressTopic[]
  weakTopics: ProgressTopic[]
  strongTopics: ProgressTopic[]
  subjectPerformance: Array<{
    subjectId: string
    subjectName: string
    sessions: number
    averageScore: number
    totalMinutes: number
  }>
  heatmap: Array<{
    date: string
    sessions: number
    minutes: number
    intensity: number
  }>
}
