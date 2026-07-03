import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID')

export const studentProgressQuerySchema = z.object({
  query: z.object({
    range: z.enum(['7d', '30d', '90d', 'all']).optional(),
    subjectId: objectId.optional(),
  }),
})
