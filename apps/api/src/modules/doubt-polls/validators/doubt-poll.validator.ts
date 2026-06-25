import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID')
const status = z.enum(['open', 'will_cover', 'resolved', 'closed'])

export const listStudentDoubtPollsSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).optional(),
  query: z.object({
    subjectId: objectId.optional(),
    topicId: objectId.optional(),
    topicName: z.string().trim().max(120).optional(),
    status: z.union([status, z.literal('active')]).optional(),
    search: z.string().trim().max(100).optional().default(''),
    sort: z.enum(['popular', 'latest', 'unanswered']).optional().default('popular'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(30).optional().default(12),
  }),
})

export const createDoubtPollSchema = z.object({
  body: z
    .object({
      subjectId: objectId,
      topicId: objectId.optional(),
      topicName: z.string().trim().min(2).max(120),
      title: z.string().trim().min(5).max(160),
      description: z.string().trim().max(1200).optional().default(''),
    })
    .refine((value) => Boolean(value.topicId) || value.topicName.length >= 2, {
      message: 'Select a chapter or provide a custom chapter name',
      path: ['topicName'],
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})

export const doubtPollIdSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
})

export const addDoubtCommentSchema = z.object({
  body: z.object({ body: z.string().trim().min(2).max(800) }),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
})

export const listTeacherDoubtPollsSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).optional(),
  query: z.object({
    gradeLevel: z.string().trim().max(40).optional(),
    subjectId: objectId.optional(),
    topicId: objectId.optional(),
    status: status.optional(),
    search: z.string().trim().max(100).optional().default(''),
    sort: z.enum(['popular', 'latest']).optional().default('popular'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(30).optional().default(12),
  }),
})

export const updateDoubtPreparationSchema = z.object({
  body: z.object({
    status: z.enum(['open', 'will_cover', 'resolved']),
    preparationNote: z.string().trim().max(1200).optional().default(''),
  }),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
})
