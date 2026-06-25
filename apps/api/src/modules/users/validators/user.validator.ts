import { z } from 'zod'

export const updateMeSchema = z.object({ body: z.object({ name: z.string().trim().min(2).max(80).optional(), phone: z.string().trim().max(30).nullable().optional(), avatar: z.string().url().nullable().optional() }).refine((data) => Object.keys(data).length > 0, 'At least one field is required') })
export const changePasswordSchema = z.object({ body: z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(72) }) })
