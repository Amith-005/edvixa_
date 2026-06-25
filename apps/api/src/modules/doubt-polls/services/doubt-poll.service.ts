import { Types } from 'mongoose'

import { AppError } from '../../../shared/errors/app-error.js'
import { StudentProfileModel } from '../../students/models/student-profile.model.js'
import { SubjectModel } from '../../subjects/models/subject.model.js'
import { TeacherProfileModel } from '../../teachers/models/teacher-profile.model.js'
import { UserModel } from '../../users/models/user.model.js'
import { DoubtPollCommentModel } from '../models/doubt-poll-comment.model.js'
import { DoubtPollVoteModel } from '../models/doubt-poll-vote.model.js'
import { DoubtPollModel } from '../models/doubt-poll.model.js'

type PollStatus = 'open' | 'will_cover' | 'resolved' | 'closed'
type StudentSort = 'popular' | 'latest' | 'unanswered'
type TeacherSort = 'popular' | 'latest'

type UserReference = {
  _id: Types.ObjectId
  name: string
  avatar?: string | null
}

type PollLean = {
  _id: Types.ObjectId
  creatorStudentId: Types.ObjectId | UserReference
  gradeLevel: string
  subjectId: Types.ObjectId
  subjectName: string
  topicId?: Types.ObjectId | null
  topicName: string
  title: string
  description: string
  status: PollStatus
  voteCount: number
  commentCount: number
  assignedTeacherId?: Types.ObjectId | UserReference | null
  preparationNote: string
  willCoverAt?: Date | null
  resolvedAt?: Date | null
  linkedBookingIds?: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

type CommentLean = {
  _id: Types.ObjectId
  authorId: Types.ObjectId | UserReference
  authorRole: 'student' | 'teacher'
  body: string
  createdAt: Date
}

type StudentListInput = {
  subjectId?: string
  topicId?: string
  topicName?: string
  status?: PollStatus | 'active'
  search?: string
  sort?: StudentSort
  page?: number
  limit?: number
}

type TeacherListInput = {
  gradeLevel?: string
  subjectId?: string
  topicId?: string
  status?: PollStatus
  search?: string
  sort?: TeacherSort
  page?: number
  limit?: number
}

type CreatePollInput = {
  subjectId: string
  topicId?: string
  topicName: string
  title: string
  description?: string
}

type PreparationInput = {
  status: 'open' | 'will_cover' | 'resolved'
  preparationNote?: string
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function asUserReference(value: Types.ObjectId | UserReference | null | undefined) {
  if (value && typeof value === 'object' && 'name' in value) {
    return value as UserReference
  }
  return null
}

class DoubtPollService {
  private async getStudentContext(studentId: string) {
    const [profile, user] = await Promise.all([
      StudentProfileModel.findOne({ userId: studentId })
        .select('gradeLevel')
        .lean(),
      UserModel.findOne({ _id: studentId, role: 'student', isActive: true })
        .select('name avatar')
        .lean(),
    ])

    if (!user) {
      throw new AppError(404, 'Student account not found', 'STUDENT_NOT_FOUND')
    }

    const gradeLevel = profile?.gradeLevel?.trim()
    if (!gradeLevel) {
      throw new AppError(
        422,
        'Add your standard or grade in Profile before using doubt polls.',
        'GRADE_REQUIRED',
      )
    }

    return { gradeLevel, user }
  }

  private async getTeacherContext(teacherUserId: string) {
    const profile = await TeacherProfileModel.findOne({
      userId: teacherUserId,
      isApproved: true,
      approvalStatus: 'approved',
    })
      .select('subjects')
      .lean()

    if (!profile) {
      throw new AppError(
        403,
        'An approved teacher profile is required to view student doubts.',
        'TEACHER_PROFILE_REQUIRED',
      )
    }

    const subjectIds = (profile.subjects ?? []).map((id) => String(id))
    return { profile, subjectIds }
  }

  private async getPoll(pollId: string): Promise<PollLean> {
    const poll = (await DoubtPollModel.findById(pollId)
      .populate('creatorStudentId', 'name avatar')
      .populate('assignedTeacherId', 'name avatar')
      .lean()) as unknown as PollLean | null

    if (!poll) {
      throw new AppError(404, 'Doubt poll not found', 'DOUBT_POLL_NOT_FOUND')
    }
    return poll
  }

  private serializePoll(poll: PollLean, joined: boolean, viewerId?: string) {
    const creator = asUserReference(poll.creatorStudentId)
    const teacher = asUserReference(poll.assignedTeacherId)
    return {
      id: String(poll._id),
      gradeLevel: poll.gradeLevel,
      subject: {
        id: String(poll.subjectId),
        name: poll.subjectName,
      },
      topic: {
        id: poll.topicId ? String(poll.topicId) : null,
        name: poll.topicName,
      },
      title: poll.title,
      description: poll.description,
      status: poll.status,
      voteCount: poll.voteCount,
      commentCount: poll.commentCount,
      joined,
      isCreator:
        Boolean(viewerId) && String(creator?._id ?? poll.creatorStudentId) === viewerId,
      creator: {
        id: String(creator?._id ?? poll.creatorStudentId),
        name: creator?.name ?? 'Student',
        avatar: creator?.avatar ?? null,
      },
      assignedTeacher: teacher
        ? { id: String(teacher._id), name: teacher.name, avatar: teacher.avatar ?? null }
        : null,
      preparationNote: poll.preparationNote,
      willCoverAt: poll.willCoverAt?.toISOString() ?? null,
      resolvedAt: poll.resolvedAt?.toISOString() ?? null,
      linkedBookingCount: poll.linkedBookingIds?.length ?? 0,
      createdAt: poll.createdAt.toISOString(),
      updatedAt: poll.updatedAt.toISOString(),
    }
  }

  async listStudent(studentId: string, input: StudentListInput) {
    const { gradeLevel } = await this.getStudentContext(studentId)
    const page = Math.max(1, input.page ?? 1)
    const limit = Math.min(30, Math.max(1, input.limit ?? 12))
    const filter: Record<string, unknown> = { gradeLevel }

    if (input.subjectId) filter.subjectId = input.subjectId
    if (input.topicId) filter.topicId = input.topicId
    else if (input.topicName) {
      filter.topicName = {
        $regex: `^${escapeRegex(input.topicName.trim())}$`,
        $options: 'i',
      }
    }
    if (input.status === 'active') filter.status = { $in: ['open', 'will_cover'] }
    else if (input.status) filter.status = input.status
    else filter.status = { $ne: 'closed' }

    if (input.search) {
      const expression = new RegExp(escapeRegex(input.search), 'i')
      filter.$or = [
        { title: expression },
        { description: expression },
        { topicName: expression },
        { subjectName: expression },
      ]
    }

    if (input.sort === 'unanswered') {
      filter.status = 'open'
      filter.commentCount = 0
    }

    const sort: Record<string, 1 | -1> =
      input.sort === 'latest'
        ? { createdAt: -1 as const }
        : { voteCount: -1 as const, createdAt: -1 as const }

    const [polls, total, openCount, joinedCount] = await Promise.all([
      DoubtPollModel.find(filter)
        .populate('creatorStudentId', 'name avatar')
        .populate('assignedTeacherId', 'name avatar')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean() as unknown as Promise<PollLean[]>,
      DoubtPollModel.countDocuments(filter),
      DoubtPollModel.countDocuments({ gradeLevel, status: 'open' }),
      DoubtPollVoteModel.countDocuments({ studentId }),
    ])

    const pollIds = polls.map((poll) => poll._id)
    const votes = pollIds.length
      ? await DoubtPollVoteModel.find({ studentId, pollId: { $in: pollIds } })
          .select('pollId')
          .lean()
      : []
    const joinedIds = new Set(votes.map((vote) => String(vote.pollId)))

    return {
      gradeLevel,
      items: polls.map((poll) =>
        this.serializePoll(poll, joinedIds.has(String(poll._id)), studentId),
      ),
      summary: {
        totalPolls: await DoubtPollModel.countDocuments({
          gradeLevel,
          status: { $ne: 'closed' },
        }),
        openPolls: openCount,
        joinedPolls: joinedCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async create(studentId: string, input: CreatePollInput) {
    const { gradeLevel } = await this.getStudentContext(studentId)
    const subject = await SubjectModel.findOne({
      _id: input.subjectId,
      isActive: true,
    }).lean()

    if (!subject) {
      throw new AppError(404, 'Subject is unavailable', 'SUBJECT_NOT_FOUND')
    }

    let topicName = input.topicName.trim()
    let topicId: Types.ObjectId | null = null
    if (input.topicId) {
      const topic = subject.topics.find(
        (item) => String(item._id) === input.topicId && item.isActive !== false,
      )
      if (!topic) {
        throw new AppError(
          422,
          'The selected chapter does not belong to this subject.',
          'TOPIC_NOT_FOUND',
        )
      }
      topicName = topic.name
      topicId = new Types.ObjectId(input.topicId)
    }

    const existing = await DoubtPollModel.findOne({
      gradeLevel,
      subjectId: input.subjectId,
      ...(topicId ? { topicId } : { topicName }),
      title: {
        $regex: `^${escapeRegex(input.title.trim())}$`,
        $options: 'i',
      },
      status: { $in: ['open', 'will_cover'] },
    }).lean()

    if (existing) {
      throw new AppError(
        409,
        'A similar doubt poll already exists. Join that poll instead.',
        'SIMILAR_POLL_EXISTS',
        { pollId: String(existing._id) },
      )
    }

    const poll = await DoubtPollModel.create({
      creatorStudentId: studentId,
      gradeLevel,
      subjectId: subject._id,
      subjectName: subject.name,
      topicId,
      topicName,
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      voteCount: 1,
    })

    try {
      await DoubtPollVoteModel.create({ pollId: poll._id, studentId })
    } catch (error) {
      await DoubtPollModel.deleteOne({ _id: poll._id }).catch(() => undefined)
      throw error
    }

    const populated = await this.getPoll(String(poll._id))
    return this.serializePoll(populated, true, studentId)
  }

  async toggleVote(studentId: string, pollId: string) {
    const { gradeLevel } = await this.getStudentContext(studentId)
    const poll = await DoubtPollModel.findById(pollId)
    if (!poll) {
      throw new AppError(404, 'Doubt poll not found', 'DOUBT_POLL_NOT_FOUND')
    }
    if (poll.gradeLevel !== gradeLevel) {
      throw new AppError(
        403,
        'This poll belongs to another standard.',
        'GRADE_MISMATCH',
      )
    }
    if (poll.status === 'closed') {
      throw new AppError(409, 'This doubt poll is closed.', 'POLL_CLOSED')
    }

    if (String(poll.creatorStudentId) === studentId) {
      return { joined: true, voteCount: poll.voteCount }
    }

    const existing = await DoubtPollVoteModel.findOne({ pollId, studentId })
    if (existing) {
      await existing.deleteOne()
      const updated = await DoubtPollModel.findByIdAndUpdate(
        pollId,
        { $inc: { voteCount: -1 } },
        { new: true },
      )
      if (updated && updated.voteCount < 1) {
        updated.voteCount = 1
        await updated.save()
      }
      return { joined: false, voteCount: Math.max(1, updated?.voteCount ?? 1) }
    }

    try {
      await DoubtPollVoteModel.create({ pollId, studentId })
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error
    }
    const updated = await DoubtPollModel.findByIdAndUpdate(
      pollId,
      { $inc: { voteCount: 1 } },
      { new: true },
    )
    return { joined: true, voteCount: updated?.voteCount ?? poll.voteCount + 1 }
  }

  private async authorizePollViewer(
    userId: string,
    role: 'student' | 'teacher',
    poll: PollLean,
  ) {
    if (role === 'student') {
      const { gradeLevel } = await this.getStudentContext(userId)
      if (poll.gradeLevel !== gradeLevel) {
        throw new AppError(
          403,
          'This poll belongs to another standard.',
          'GRADE_MISMATCH',
        )
      }
      return
    }

    const { subjectIds } = await this.getTeacherContext(userId)
    if (!subjectIds.includes(String(poll.subjectId))) {
      throw new AppError(
        403,
        'This doubt is outside your teaching subjects.',
        'SUBJECT_ACCESS_DENIED',
      )
    }
  }

  async getDetail(
    userId: string,
    role: 'student' | 'teacher',
    pollId: string,
  ) {
    const poll = await this.getPoll(pollId)
    await this.authorizePollViewer(userId, role, poll)

    const [joinedVote, comments] = await Promise.all([
      role === 'student'
        ? DoubtPollVoteModel.findOne({ pollId, studentId: userId }).lean()
        : Promise.resolve(null),
      DoubtPollCommentModel.find({ pollId })
        .populate('authorId', 'name avatar')
        .sort({ createdAt: 1 })
        .limit(100)
        .lean() as unknown as Promise<CommentLean[]>,
    ])

    return {
      poll: this.serializePoll(poll, Boolean(joinedVote), role === 'student' ? userId : undefined),
      comments: comments.map((comment) => {
        const author = asUserReference(comment.authorId)
        return {
          id: String(comment._id),
          body: comment.body,
          authorRole: comment.authorRole,
          author: {
            id: String(author?._id ?? comment.authorId),
            name: author?.name ?? (comment.authorRole === 'teacher' ? 'Teacher' : 'Student'),
            avatar: author?.avatar ?? null,
          },
          createdAt: comment.createdAt.toISOString(),
        }
      }),
    }
  }

  async addComment(
    userId: string,
    role: 'student' | 'teacher',
    pollId: string,
    body: string,
  ) {
    const poll = await this.getPoll(pollId)
    await this.authorizePollViewer(userId, role, poll)
    if (poll.status === 'closed') {
      throw new AppError(409, 'This doubt poll is closed.', 'POLL_CLOSED')
    }

    const comment = await DoubtPollCommentModel.create({
      pollId,
      authorId: userId,
      authorRole: role,
      body: body.trim(),
    })
    await DoubtPollModel.updateOne({ _id: pollId }, { $inc: { commentCount: 1 } })

    const author = await UserModel.findById(userId).select('name avatar').lean()
    return {
      id: String(comment._id),
      body: comment.body,
      authorRole: role,
      author: {
        id: userId,
        name: author?.name ?? (role === 'teacher' ? 'Teacher' : 'Student'),
        avatar: author?.avatar ?? null,
      },
      createdAt: comment.createdAt.toISOString(),
    }
  }

  async listTeacher(teacherUserId: string, input: TeacherListInput) {
    const { subjectIds } = await this.getTeacherContext(teacherUserId)
    const page = Math.max(1, input.page ?? 1)
    const limit = Math.min(30, Math.max(1, input.limit ?? 12))

    if (input.subjectId && !subjectIds.includes(input.subjectId)) {
      throw new AppError(
        403,
        'This subject is not assigned to your teacher profile.',
        'SUBJECT_ACCESS_DENIED',
      )
    }

    const filter: Record<string, unknown> = {
      subjectId: input.subjectId ?? { $in: subjectIds },
      status: input.status ?? { $ne: 'closed' },
    }
    if (input.gradeLevel) filter.gradeLevel = input.gradeLevel
    if (input.topicId) filter.topicId = input.topicId
    if (input.search) {
      const expression = new RegExp(escapeRegex(input.search), 'i')
      filter.$or = [
        { title: expression },
        { description: expression },
        { topicName: expression },
        { gradeLevel: expression },
      ]
    }

    const sort: Record<string, 1 | -1> =
      input.sort === 'latest'
        ? { createdAt: -1 as const }
        : { voteCount: -1 as const, createdAt: -1 as const }

    const [polls, total, gradeLevels, openCount, willCoverCount] =
      await Promise.all([
        DoubtPollModel.find(filter)
          .populate('creatorStudentId', 'name avatar')
          .populate('assignedTeacherId', 'name avatar')
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean() as unknown as Promise<PollLean[]>,
        DoubtPollModel.countDocuments(filter),
        DoubtPollModel.distinct('gradeLevel', {
          subjectId: { $in: subjectIds },
          status: { $ne: 'closed' },
        }),
        DoubtPollModel.countDocuments({
          subjectId: { $in: subjectIds },
          status: 'open',
        }),
        DoubtPollModel.countDocuments({
          subjectId: { $in: subjectIds },
          status: 'will_cover',
        }),
      ])

    const teacherSubjects = await SubjectModel.find({ _id: { $in: subjectIds } })
      .select('name slug')
      .sort({ name: 1 })
      .lean()

    return {
      items: polls.map((poll) => this.serializePoll(poll, false)),
      filters: {
        gradeLevels: gradeLevels.sort(),
        subjects: teacherSubjects.map((subject) => ({
          id: String(subject._id),
          name: subject.name,
          slug: subject.slug,
        })),
      },
      summary: {
        totalPolls: await DoubtPollModel.countDocuments({
          subjectId: { $in: subjectIds },
          status: { $ne: 'closed' },
        }),
        openPolls: openCount,
        willCoverPolls: willCoverCount,
        studentsWaiting: polls.reduce((sum, poll) => sum + poll.voteCount, 0),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async updatePreparation(
    teacherUserId: string,
    pollId: string,
    input: PreparationInput,
  ) {
    const poll = await this.getPoll(pollId)
    const { subjectIds } = await this.getTeacherContext(teacherUserId)
    if (!subjectIds.includes(String(poll.subjectId))) {
      throw new AppError(
        403,
        'This doubt is outside your teaching subjects.',
        'SUBJECT_ACCESS_DENIED',
      )
    }

    const updated = await DoubtPollModel.findByIdAndUpdate(
      pollId,
      {
        $set: {
          status: input.status,
          preparationNote: input.preparationNote?.trim() ?? '',
          assignedTeacherId:
            input.status === 'open' ? null : new Types.ObjectId(teacherUserId),
          willCoverAt: input.status === 'will_cover' ? new Date() : poll.willCoverAt ?? null,
          resolvedAt: input.status === 'resolved' ? new Date() : null,
        },
      },
      { new: true },
    )

    if (!updated) {
      throw new AppError(404, 'Doubt poll not found', 'DOUBT_POLL_NOT_FOUND')
    }
    const populated = await this.getPoll(pollId)
    return this.serializePoll(populated, false)
  }

  async validateForBooking(
    studentId: string,
    pollId: string,
    subjectId: string,
    topicId: string | undefined,
    topicName: string,
  ) {
    const { gradeLevel } = await this.getStudentContext(studentId)
    const poll = await DoubtPollModel.findById(pollId).lean()
    if (!poll) {
      throw new AppError(404, 'Doubt poll not found', 'DOUBT_POLL_NOT_FOUND')
    }
    if (poll.gradeLevel !== gradeLevel) {
      throw new AppError(403, 'The doubt poll belongs to another standard.', 'GRADE_MISMATCH')
    }
    if (String(poll.subjectId) !== subjectId) {
      throw new AppError(422, 'The doubt poll does not match the selected subject.', 'DOUBT_SUBJECT_MISMATCH')
    }
    const topicMatches = topicId
      ? String(poll.topicId ?? '') === topicId
      : poll.topicName.trim().toLowerCase() === topicName.trim().toLowerCase()
    if (!topicMatches) {
      throw new AppError(422, 'The doubt poll does not match the selected chapter.', 'DOUBT_TOPIC_MISMATCH')
    }
    if (poll.status === 'resolved' || poll.status === 'closed') {
      throw new AppError(409, 'Choose an open doubt poll for this booking.', 'DOUBT_POLL_INACTIVE')
    }
    const vote = await DoubtPollVoteModel.findOne({ pollId, studentId }).lean()
    if (!vote) {
      throw new AppError(
        422,
        'Join the doubt poll before continuing to checkout.',
        'DOUBT_POLL_NOT_JOINED',
      )
    }
    return {
      id: String(poll._id),
      title: poll.title,
      description: poll.description,
      gradeLevel,
    }
  }

  async linkBooking(pollId: string, bookingId: Types.ObjectId | string) {
    await DoubtPollModel.updateOne(
      { _id: pollId },
      { $addToSet: { linkedBookingIds: bookingId } },
    )
  }
}

export const doubtPollService = new DoubtPollService()
