export type TeacherSubject = {
  id: string
  name: string
  slug: string
}

export type TeacherSlotPreview = {
  id: string
  date: string
  startTime: string
  endTime: string
  timezone: string
  subjectIds: string[]
}

export type PublicTeacher = {
  id: string
  userId: string
  name: string
  avatar: string | null
  bio: string
  subjects: TeacherSubject[]
  qualification: string
  experienceYears: number
  languages: string[]
  hourlyRate: number
  timezone: string
  rating: number
  totalReviews: number
  totalSessionsCompleted: number
  totalStudentsTaught: number
  averageResponseTimeMinutes: number
  verified: boolean
  availableSlotCount: number
  nextAvailableSlot: TeacherSlotPreview | null
}

export type TeacherDiscoveryResponse = {
  items: PublicTeacher[]
  summary: {
    totalTeachers: number
    availableTeachers: number
    averageRate: number
    averageRating: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type SubjectTopicOption = {
  _id: string
  name: string
  description?: string
  difficultyLevel?: number
  order?: number
  isActive?: boolean
}

export type SubjectOption = {
  _id: string
  name: string
  slug: string
  topics?: SubjectTopicOption[]
}

export type TeacherFilters = {
  search: string
  subjectId: string
  date: string
  maxPrice: string
  rating: string
  availability: 'any' | 'today' | 'week'
  sort: 'recommended' | 'rating' | 'price_asc' | 'price_desc' | 'experience'
}

export type TeacherReview = {
  id: string
  student: {
    id: string
    name: string
    avatar: string | null
  }
  rating: number
  review: string
  createdAt: string
}

export type TeacherPublicProfileResponse = {
  teacher: PublicTeacher
  slots: TeacherSlotPreview[]
  reviews: TeacherReview[]
  reviewSummary: {
    rating: number
    totalReviews: number
    displayedReviews: number
  }
}
