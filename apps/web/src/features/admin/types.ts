export type Pagination = { total: number; page: number; limit: number; pages: number }
export type Paginated<T> = { items: T[]; pagination: Pagination }
export type NamedUser = { _id: string; name: string; email?: string; avatar?: string | null; role?: string }

export type AdminUser = {
  _id: string
  name: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  avatar?: string | null
  phone?: string | null
  isActive: boolean
  isEmailVerified: boolean
  banReason?: string | null
  bannedAt?: string | null
  lastLoginAt?: string | null
  createdAt: string
  updatedAt?: string
}

export type AdminTeacher = {
  _id: string
  userId: NamedUser & { isActive?: boolean; isEmailVerified?: boolean; createdAt?: string }
  bio?: string
  teachingApproach?: string
  subjects: Array<{ _id: string; name: string; slug?: string }>
  qualification?: string
  experienceYears: number
  languages: string[]
  gradeLevels: string[]
  hourlyRate: number
  rating: number
  totalReviews: number
  approvalStatus: 'pending' | 'approved' | 'rejected'
  isApproved: boolean
  rejectionReason?: string | null
  submittedAt?: string | null
  approvedAt?: string | null
  profileCompletedPercent: number
  documents: Array<{ _id: string; title: string; fileUrl: string; fileType: string; status: string }>
}

export type AdminBooking = {
  _id: string
  studentId: NamedUser
  teacherId: NamedUser
  subjectId: { _id: string; name: string; slug?: string }
  topicName: string
  studentGrade?: string | null
  scheduledAt: string
  endAt: string
  status: string
  paymentStatus: string
  totalAmount?: number
  timezone: string
  meetingLink?: string | null
  cancellationReason?: string | null
  feeId?: AdminFee | string | null
}

export type AdminFee = {
  _id: string
  studentId: NamedUser
  teacherId: NamedUser
  bookingId: { _id: string; topicName: string; scheduledAt: string; status: string }
  amount: number
  platformFee: number
  platformCommission: number
  teacherEarning: number
  totalAmount: number
  currency: string
  status: string
  paymentMethod: string
  paymentGateway: string
  gatewayOrderId?: string | null
  gatewayPaymentId?: string | null
  paidAt?: string | null
  refundStatus: string
  refundAmount: number
  refundReason?: string | null
  payoutStatus: string
  createdAt: string
}

export type AdminDashboard = {
  students: number
  teachers: number
  pendingTeachers: number
  subjects: number
  activeBookings: number
  revenue: number
  pendingPayouts: number
  openTickets: number
  newUsersThisMonth: number
  completedSessionsThisMonth: number
  trend: Array<{ label: string; users: number; bookings: number; revenue: number }>
  alerts: Array<{ tone: string; message: string }>
  recentUsers: AdminUser[]
  recentActivity: AdminAuditLog[]
}

export type AdminAuditLog = {
  _id: string
  actorId: NamedUser
  action: string
  targetType: string
  targetId?: string | null
  summary: string
  requestId?: string | null
  ipAddress?: string | null
  createdAt: string
}

export type AdminAnnouncement = {
  _id: string
  title: string
  message: string
  audience: 'all' | 'student' | 'teacher'
  severity: 'info' | 'success' | 'warning' | 'critical'
  status: 'draft' | 'published' | 'archived'
  publishAt?: string | null
  expiresAt?: string | null
  createdBy: NamedUser
  updatedAt: string
  createdAt: string
}

export type PlatformSettings = {
  _id: string
  platformName: string
  supportEmail: string
  defaultTimezone: string
  maintenanceMode: boolean
  allowRegistrations: boolean
  allowTeacherApplications: boolean
  platformFeePercent: number
  minimumBookingNoticeHours: number
  maximumBookingAdvanceDays: number
  updatedAt: string
}

export type SupportTicket = {
  _id: string
  requesterName: string
  requesterEmail: string
  requesterRole: string
  subject: string
  message: string
  category: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  resolution?: string
  assignedTo?: NamedUser | null
  createdAt: string
  updatedAt: string
}

export type SubjectTopic = {
  _id?: string
  name: string
  description: string
  difficultyLevel: number
  isAiEnabled: boolean
  order: number
  isActive: boolean
}

export type AdminSubject = {
  _id: string
  name: string
  slug: string
  description: string
  gradeLevels: string[]
  topics: SubjectTopic[]
  isActive: boolean
  isAiEnabled: boolean
}
