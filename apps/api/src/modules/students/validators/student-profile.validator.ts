import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID')

const nullableShortText = z
  .string()
  .trim()
  .max(120)
  .nullable()
  .optional()

const avatar = z
  .string()
  .max(700_000, 'Avatar image is too large')
  .refine(
    (value) =>
      /^https?:\/\//i.test(value) ||
      /^data:image\/(png|jpeg|webp);base64,/i.test(value),
    'Avatar must be an image URL or uploaded PNG, JPEG, or WebP image',
  )
  .nullable()
  .optional()

export const updateStudentProfileSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      phone: z.string().trim().max(30).nullable().optional(),
      avatar,
      gradeLevel: nullableShortText,
      learningGoal: z.string().trim().max(300).nullable().optional(),
      preferredSubjects: z.array(objectId).max(10).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    }),
})
