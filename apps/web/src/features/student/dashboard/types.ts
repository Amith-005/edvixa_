export type DashboardTopic = {
  id: string
  name: string
  masteryScore: number
  attemptCount: number
}

export type PreferredSubject = {
  id: string
  name: string
  slug: string
}

export type StudentDashboardData = {
  profile: {
    gradeLevel: string | null
    level: number
    xp: number
    streak: number
    totalPracticeSessions: number
    totalTestsTaken: number
    totalPracticeTime: number
    averageScore: number
    accuracyPercent: number
    preferredSubjects: PreferredSubject[]
  }
  xp: {
    currentLevelXp: number
    requiredForNextLevel: number
    remainingXp: number
    progressPercent: number
  }
  recommendation: {
    title: string
    description: string
    actionLabel: string
    actionUrl: string
  }
  weakTopics: DashboardTopic[]
  strongTopics: DashboardTopic[]
  recentActivity: Array<{
    id: string
    title: string
    description: string
    createdAt: string
  }>
  upcomingSessions: Array<{
    id: string
    teacherName: string
    subjectName: string
    scheduledAt: string
    status: string
  }>
}
