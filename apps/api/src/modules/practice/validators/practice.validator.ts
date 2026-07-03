import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID')

export const createPracticeSessionSchema = z.object({
  body: z.object({
    subjectId: objectId,
    topicIds: z.array(objectId).min(1).max(5),
    difficulty: z.number().int().min(1).max(5),
    questionCount: z.union([
      z.literal(5),
      z.literal(10),
      z.literal(15),
      z.literal(20),
    ]),
    practiceMode: z.enum(['adaptive', 'standard']).default('adaptive'),
  }),
})

export const practiceSessionIdSchema = z.object({
  params: z.object({ id: objectId }),
})

export const savePracticeAnswerSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    questionId: objectId,
    selectedAnswer: z.string().min(1).nullable(),
    markedForReview: z.boolean().optional(),
    timeTakenSeconds: z.number().int().min(0).max(60 * 60).optional(),
  }),
})

export const submitPracticeSessionSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    timeTakenSeconds: z.number().int().min(0).max(24 * 60 * 60).optional(),
  }),
})

export const listPracticeResultsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(80).optional(),
    subjectId: objectId.optional(),
    sort: z.enum(['recent', 'oldest', 'highest', 'lowest']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(25).optional(),
  }),
})
