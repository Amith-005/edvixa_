export type ProfileSubject = {
  id: string
  name: string
  slug: string
}

export type ProfileTopic = {
  id: string
  name: string
  masteryScore: number
  attemptCount: number
}

export type StudentProfileData = {
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    avatar: string | null
    isEmailVerified: boolean
    createdAt: string
  }
  profile: {
    gradeLevel: string | null
    learningGoal: string | null
    preferredSubjects: ProfileSubject[]
    level: number
    xp: number
    streak: number
    totalPracticeSessions: number
    totalTestsTaken: number
    totalPracticeTime: number
    averageScore: number
    accuracyPercent: number
    weakTopics: ProfileTopic[]
    strongTopics: ProfileTopic[]
  }
  xp: {
    currentLevelXp: number
    requiredForNextLevel: number
    remainingXp: number
    progressPercent: number
  }
  availableSubjects: ProfileSubject[]
}

export type StudentProfileDraft = {
  name: string
  phone: string
  avatar: string
  gradeLevel: string
  learningGoal: string
  preferredSubjects: string[]
}
