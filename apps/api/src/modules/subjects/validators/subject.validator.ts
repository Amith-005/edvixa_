import { z } from 'zod'
const topic = z.object({ name: z.string().trim().min(2), description: z.string().default(''), difficultyLevel: z.number().int().min(1).max(5).default(1), isAiEnabled: z.boolean().default(true), order: z.number().int().default(0), isActive: z.boolean().default(true) })
export const createSubjectSchema = z.object({ body: z.object({ name: z.string().trim().min(2), slug: z.string().trim().min(2).regex(/^[a-z0-9-]+$/), description: z.string().default(''), gradeLevels: z.array(z.string()).default([]), topics: z.array(topic).default([]), isActive: z.boolean().default(true), isAiEnabled: z.boolean().default(true) }) })
export const updateSubjectSchema = z.object({ body: createSubjectSchema.shape.body.partial(), params: z.object({ id: z.string().min(1) }) })
