export type DoubtPollStatus = 'open' | 'will_cover' | 'resolved' | 'closed'

export type DoubtPoll = {
  id: string
  gradeLevel: string
  subject: { id: string; name: string }
  topic: { id: string | null; name: string }
  title: string
  description: string
  status: DoubtPollStatus
  voteCount: number
  commentCount: number
  joined: boolean
  isCreator: boolean
  creator: { id: string; name: string; avatar: string | null }
  assignedTeacher: { id: string; name: string; avatar: string | null } | null
  preparationNote: string
  willCoverAt: string | null
  resolvedAt: string | null
  linkedBookingCount: number
  createdAt: string
  updatedAt: string
}

export type DoubtComment = {
  id: string
  body: string
  authorRole: 'student' | 'teacher'
  author: { id: string; name: string; avatar: string | null }
  createdAt: string
}

export type StudentDoubtPollsResponse = {
  gradeLevel: string
  items: DoubtPoll[]
  summary: { totalPolls: number; openPolls: number; joinedPolls: number }
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export type TeacherDoubtPollsResponse = {
  items: DoubtPoll[]
  filters: {
    gradeLevels: string[]
    subjects: Array<{ id: string; name: string; slug: string }>
  }
  summary: {
    totalPolls: number
    openPolls: number
    willCoverPolls: number
    studentsWaiting: number
  }
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export type DoubtPollDetailResponse = {
  poll: DoubtPoll
  comments: DoubtComment[]
}

export type SubjectTopic = {
  _id: string
  name: string
  order?: number
  isActive?: boolean
}

export type DoubtSubject = {
  _id: string
  name: string
  slug: string
  topics?: SubjectTopic[]
}
