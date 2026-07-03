import { z } from 'zod'

export const updateMeSchema = z.object({ body: z.object({ name: z.string().trim().min(2).max(80).optional(), phone: z.string().trim().max(30).nullable().optional(), avatar: z.string().url().nullable().optional() }).refine((data) => Object.keys(data).length > 0, 'At least one field is required') })
export const changePasswordSchema = z.object({ body: z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(72) }) })


export const createSupportTicketSchema = z.object({
  body: z.object({
    subject: z.string().trim().min(3).max(180),
    message: z.string().trim().min(10).max(3000),
    category: z.enum(['account', 'booking', 'payment', 'technical', 'other']).default('other'),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  }),
})
