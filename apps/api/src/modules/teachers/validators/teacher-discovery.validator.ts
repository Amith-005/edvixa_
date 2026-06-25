import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID')
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')

export const teacherDiscoveryQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().max(80).optional(),
    subjectId: objectId.optional(),
    date: isoDate.optional(),
    maxPrice: z.coerce.number().min(0).max(100000).optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    availability: z.enum(['any', 'today', 'week']).optional(),
    sort: z
      .enum(['recommended', 'rating', 'price_asc', 'price_desc', 'experience'])
      .optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(24).optional(),
  }),
})

export const publicTeacherProfileParamsSchema = z.object({
  params: z.object({
    id: objectId,
  }),
})
