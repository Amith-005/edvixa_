import { z } from 'zod'

const password = z.string().min(8).max(72).regex(/[A-Z]/, 'Password must contain an uppercase letter').regex(/[a-z]/, 'Password must contain a lowercase letter').regex(/[0-9]/, 'Password must contain a number')

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().toLowerCase(),
    password,
    role: z.enum(['student', 'teacher']),
    gradeLevel: z.string().trim().optional(),
    preferredSubjects: z.array(z.string()).default([]),
    teacher: z.object({
      bio: z.string().max(1000).default(''),
      qualification: z.string().max(200).default(''),
      experienceYears: z.number().min(0).max(80).default(0),
      hourlyRate: z.number().min(0).default(0),
      timezone: z.string().default('Asia/Kolkata'),
      subjects: z.array(z.string()).default([]),
    }).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})

export const loginSchema = z.object({ body: z.object({ email: z.string().email().toLowerCase(), password: z.string().min(1) }) })
export const forgotPasswordSchema = z.object({ body: z.object({ email: z.string().email().toLowerCase() }) })
export const resetPasswordSchema = z.object({ body: z.object({ email: z.string().email().toLowerCase(), otp: z.string().length(6), newPassword: password }) })
export const verifyEmailSchema = z.object({ body: z.object({ token: z.string().min(20) }) })
