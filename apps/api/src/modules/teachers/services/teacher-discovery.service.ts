import { Types } from 'mongoose'

import { AvailabilityModel } from '../../availability/models/availability.model.js'
import { TeacherReviewModel } from '../../reviews/models/teacher-review.model.js'
import { AppError } from '../../../shared/errors/app-error.js'
import { TeacherProfileModel } from '../models/teacher-profile.model.js'

type DiscoveryQuery = Record<string, string | undefined>

type PublicUser = {
  _id: Types.ObjectId
  name: string
  avatar?: string | null
  isActive?: boolean
}

type PublicSubject = {
  _id: Types.ObjectId
  name: string
  slug: string
}

type PublicTeacherProfile = {
  _id: Types.ObjectId
  userId: PublicUser | Types.ObjectId
  bio?: string
  subjects?: Array<PublicSubject | Types.ObjectId>
  qualification?: string
  experienceYears?: number
  languages?: string[]
  hourlyRate?: number
  timezone?: string
  rating?: number
  totalReviews?: number
  totalSessionsCompleted?: number
  totalStudentsTaught?: number
  averageResponseTimeMinutes?: number
  isApproved?: boolean
}

type AvailabilitySlot = {
  _id: Types.ObjectId
  teacherId: Types.ObjectId
  date: Date
  startTime: string
  endTime: string
  timezone: string
  subjectIds?: Types.ObjectId[]
}

type ReviewStudent = {
  _id: Types.ObjectId
  name: string
  avatar?: string | null
}

type PublicTeacherReview = {
  _id: Types.ObjectId
  studentId: ReviewStudent | Types.ObjectId
  rating: number
  review: string
  createdAt: Date
}

function startOfLocalDay(value = new Date()): Date {
  const result = new Date(value)
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value)
  result.setDate(result.getDate() + days)
  return result
}

function parseDate(value?: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : startOfLocalDay(date)
}

function getUser(profile: PublicTeacherProfile): PublicUser | null {
  if (
    profile.userId &&
    typeof profile.userId === 'object' &&
    'name' in profile.userId
  ) {
    return profile.userId as PublicUser
  }
  return null
}

function getSubjects(profile: PublicTeacherProfile): PublicSubject[] {
  return (profile.subjects ?? []).filter(
    (subject): subject is PublicSubject =>
      typeof subject === 'object' && subject !== null && 'name' in subject,
  )
}

function mapSlot(slot: AvailabilitySlot) {
  return {
    id: String(slot._id),
    date: slot.date.toISOString(),
    startTime: slot.startTime,
    endTime: slot.endTime,
    timezone: slot.timezone,
    subjectIds: (slot.subjectIds ?? []).map(String),
  }
}

function mapTeacher(profile: PublicTeacherProfile, slots: AvailabilitySlot[]) {
  const user = getUser(profile)
  if (!user) return null

  const subjects = getSubjects(profile)
  const nextSlot = slots[0] ?? null

  return {
    id: String(profile._id),
    userId: String(user._id),
    name: user.name,
    avatar: user.avatar ?? null,
    bio: profile.bio ?? '',
    subjects: subjects.map((subject) => ({
      id: String(subject._id),
      name: subject.name,
      slug: subject.slug,
    })),
    qualification: profile.qualification ?? '',
    experienceYears: profile.experienceYears ?? 0,
    languages: profile.languages ?? [],
    hourlyRate: profile.hourlyRate ?? 0,
    timezone: profile.timezone ?? 'Asia/Kolkata',
    rating: profile.rating ?? 0,
    totalReviews: profile.totalReviews ?? 0,
    totalSessionsCompleted: profile.totalSessionsCompleted ?? 0,
    totalStudentsTaught: profile.totalStudentsTaught ?? 0,
    averageResponseTimeMinutes: profile.averageResponseTimeMinutes ?? 0,
    verified: Boolean(profile.isApproved),
    availableSlotCount: slots.length,
    nextAvailableSlot: nextSlot ? mapSlot(nextSlot) : null,
  }
}

class TeacherDiscoveryService {
  async list(query: DiscoveryQuery) {
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(24, Math.max(1, Number(query.limit) || 8))
    const search = query.search?.trim().toLowerCase() ?? ''
    const subjectId = query.subjectId ?? ''
    const maxPrice = Number(query.maxPrice)
    const minimumRating = Number(query.rating)
    const availability = query.availability ?? 'any'
    const sort = query.sort ?? 'recommended'
    const selectedDate = parseDate(query.date)

    const rawProfiles = (await TeacherProfileModel.find({
      isApproved: true,
      approvalStatus: 'approved',
    })
      .populate('userId', 'name avatar isActive')
      .populate('subjects', 'name slug')
      .lean()) as unknown as PublicTeacherProfile[]

    const activeProfiles = rawProfiles.filter((profile) => {
      const user = getUser(profile)
      return Boolean(user?.isActive !== false)
    })

    const teacherIds = activeProfiles
      .map((profile) => getUser(profile)?._id)
      .filter((id): id is Types.ObjectId => Boolean(id))

    const today = startOfLocalDay()
    let slotStart = today
    let slotEnd = addDays(today, 31)

    if (selectedDate) {
      slotStart = selectedDate
      slotEnd = addDays(selectedDate, 1)
    } else if (availability === 'today') {
      slotEnd = addDays(today, 1)
    } else if (availability === 'week') {
      slotEnd = addDays(today, 7)
    }

    const rawSlots = (await AvailabilityModel.find({
      teacherId: { $in: teacherIds },
      date: { $gte: slotStart, $lt: slotEnd },
      isBooked: false,
      isBlocked: false,
    })
      .sort({ date: 1, startTime: 1 })
      .lean()) as unknown as AvailabilitySlot[]

    const slotMap = new Map<string, AvailabilitySlot[]>()
    for (const slot of rawSlots) {
      const key = String(slot.teacherId)
      const existing = slotMap.get(key) ?? []
      existing.push(slot)
      slotMap.set(key, existing)
    }

    const mapped = activeProfiles
      .map((profile) => {
        const user = getUser(profile)
        if (!user) return null
        return mapTeacher(profile, slotMap.get(String(user._id)) ?? [])
      })
      .filter((teacher): teacher is NonNullable<typeof teacher> => Boolean(teacher))
      .filter((teacher) => {
        if (search) {
          const searchable = [
            teacher.name,
            teacher.bio,
            teacher.qualification,
            ...teacher.subjects.map((subject) => subject.name),
            ...teacher.languages,
          ]
            .join(' ')
            .toLowerCase()
          if (!searchable.includes(search)) return false
        }

        if (
          subjectId &&
          !teacher.subjects.some((subject) => subject.id === subjectId)
        ) {
          return false
        }

        if (Number.isFinite(maxPrice) && teacher.hourlyRate > maxPrice) {
          return false
        }

        if (Number.isFinite(minimumRating) && teacher.rating < minimumRating) {
          return false
        }

        if (
          (selectedDate || availability !== 'any') &&
          !teacher.nextAvailableSlot
        ) {
          return false
        }

        return true
      })

    mapped.sort((left, right) => {
      if (sort === 'rating') {
        return right.rating - left.rating || right.totalReviews - left.totalReviews
      }
      if (sort === 'price_asc') return left.hourlyRate - right.hourlyRate
      if (sort === 'price_desc') return right.hourlyRate - left.hourlyRate
      if (sort === 'experience') {
        return right.experienceYears - left.experienceYears
      }

      const availabilityDifference =
        Number(Boolean(right.nextAvailableSlot)) -
        Number(Boolean(left.nextAvailableSlot))
      return (
        availabilityDifference ||
        right.rating - left.rating ||
        right.totalSessionsCompleted - left.totalSessionsCompleted
      )
    })

    const total = mapped.length
    const start = (page - 1) * limit
    const items = mapped.slice(start, start + limit)
    const averageRate = total
      ? Math.round(
          mapped.reduce((sum, teacher) => sum + teacher.hourlyRate, 0) / total,
        )
      : 0
    const averageRating = total
      ? Number(
          (
            mapped.reduce((sum, teacher) => sum + teacher.rating, 0) / total
          ).toFixed(1),
        )
      : 0

    return {
      items,
      summary: {
        totalTeachers: total,
        availableTeachers: mapped.filter((teacher) => teacher.nextAvailableSlot)
          .length,
        averageRate,
        averageRating,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async getPublicProfile(profileId: string) {
    if (!Types.ObjectId.isValid(profileId)) {
      throw new AppError(404, 'Teacher profile not found', 'TEACHER_PROFILE_NOT_FOUND')
    }

    const profile = (await TeacherProfileModel.findOne({
      _id: profileId,
      isApproved: true,
      approvalStatus: 'approved',
    })
      .populate('userId', 'name avatar isActive')
      .populate('subjects', 'name slug')
      .lean()) as unknown as PublicTeacherProfile | null

    const user = profile ? getUser(profile) : null
    if (!profile || !user || user.isActive === false) {
      throw new AppError(404, 'Teacher profile not found', 'TEACHER_PROFILE_NOT_FOUND')
    }

    const today = startOfLocalDay()
    const rawSlots = (await AvailabilityModel.find({
      teacherId: user._id,
      date: { $gte: today, $lt: addDays(today, 31) },
      isBooked: false,
      isBlocked: false,
    })
      .sort({ date: 1, startTime: 1 })
      .lean()) as unknown as AvailabilitySlot[]

    const rawReviews = (await TeacherReviewModel.find({
      teacherId: user._id,
      isVisible: true,
    })
      .populate('studentId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean()) as unknown as PublicTeacherReview[]

    const teacher = mapTeacher(profile, rawSlots)
    if (!teacher) {
      throw new AppError(404, 'Teacher profile not found', 'TEACHER_PROFILE_NOT_FOUND')
    }

    const reviews = rawReviews.map((review) => {
      const student =
        review.studentId &&
        typeof review.studentId === 'object' &&
        'name' in review.studentId
          ? (review.studentId as ReviewStudent)
          : null

      return {
        id: String(review._id),
        student: {
          id: student ? String(student._id) : '',
          name: student?.name ?? 'Edvixa student',
          avatar: student?.avatar ?? null,
        },
        rating: review.rating,
        review: review.review,
        createdAt: review.createdAt.toISOString(),
      }
    })

    return {
      teacher,
      slots: rawSlots.map(mapSlot),
      reviews,
      reviewSummary: {
        rating: teacher.rating,
        totalReviews: teacher.totalReviews,
        displayedReviews: reviews.length,
      },
    }
  }
}

export const teacherDiscoveryService = new TeacherDiscoveryService()
