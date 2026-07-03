export type StudentSessionStatus =
  | 'all'
  | 'upcoming'
  | 'pending'
  | 'completed'
  | 'cancelled'

export type StudentSession = {
  id: string
  teacher: {
    id: string
    profileId: string
    name: string
    avatar: string | null
  }
  subject: {
    id: string
    name: string
  }
  topicName: string
  isCustomTopic: boolean
  studentNote: string
  teacherNote: string
  scheduledAt: string
  endAt: string
  durationMinutes: number
  timezone: string
  status: string
  displayStatus: Exclude<StudentSessionStatus, 'all'>
  paymentStatus: string
  payment: {
    feeId: string
    amount: number
    platformFee: number
    totalAmount: number
    currency: string
    status: string
    method: string
    gateway: string
    receiptUrl: string | null
    refundStatus: string
    refundAmount: number
  } | null
  meeting: {
    provider: string | null
    link: string | null
    canJoin: boolean
    joinState: 'available' | 'too_early' | 'link_pending' | 'ended'
    joinAvailableAt: string
  }
  canCancel: boolean
  canReschedule: boolean
  canReview: boolean
  reviewed: boolean
  cancelledBy: string | null
  cancellationReason: string | null
  cancelledAt: string | null
  completedAt: string | null
  rescheduleCount: number
  createdAt: string
}

export type StudentSessionsResponse = {
  items: StudentSession[]
  summary: {
    total: number
    upcoming: number
    pending: number
    completed: number
    cancelled: number
    investment: number
    currency: string
  }
}
