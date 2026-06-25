import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1),
  CLIENT_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: z.string().default('false').transform((value) => value === 'true'),
  ADMIN_NAME: z.string().default('Edvixa Admin'),
  ADMIN_EMAIL: z.string().email().default('admin@edvixa.local'),
  ADMIN_PASSWORD: z.string().min(8).default('ChangeMe123!'),
  PAYMENT_PROVIDER: z.enum(['demo', 'razorpay']).default('demo'),
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
})

export const env = schema.parse(process.env)
