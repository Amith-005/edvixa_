import 'dotenv/config'
import { z } from 'zod'

const booleanFromString = z
  .string()
  .default('false')
  .transform((value) => value === 'true')

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGODB_URI: z.string().min(1),
    MONGODB_MAX_POOL_SIZE: z.coerce.number().int().min(1).max(200).default(20),
    CLIENT_URL: z.string().min(1),
    APP_URL: z.string().url().default('http://localhost:5173'),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(90).default(7),
    COOKIE_SECURE: booleanFromString,
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_DOMAIN: z.string().trim().default(''),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
    API_RATE_LIMIT: z.coerce.number().int().positive().default(300),
    AI_PROVIDER: z.enum(['gemini', 'grok']).default('gemini'),
    AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(120_000).default(45_000),
    AI_MAX_RETRIES: z.coerce.number().int().min(0).max(3).default(1),
    GEMINI_API_KEY: z.string().trim().default(''),
    GEMINI_MODEL: z.string().trim().min(1).default('gemini-2.5-flash'),
    XAI_API_KEY: z.string().trim().default(''),
    XAI_MODEL: z.string().trim().min(1).default('grok-4.5'),
    EMAIL_PROVIDER: z.enum(['console', 'resend']).default('console'),
    EMAIL_FROM: z.string().min(3).default('Edvixa <onboarding@resend.dev>'),
    RESEND_API_KEY: z.string().default(''),
    ADMIN_NAME: z.string().default('Edvixa Admin'),
    ADMIN_EMAIL: z.string().email().default('admin@edvixa.local'),
    ADMIN_PASSWORD: z.string().min(8).default('ChangeMe123!'),
    PAYMENT_PROVIDER: z.enum(['demo', 'razorpay']).default('demo'),
    RAZORPAY_KEY_ID: z.string().default(''),
    RAZORPAY_KEY_SECRET: z.string().default(''),
    RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
  })
  .superRefine((value, context) => {
    if (value.COOKIE_SAME_SITE === 'none' && !value.COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be true when COOKIE_SAME_SITE is none',
      })
    }

    if (value.NODE_ENV === 'production') {
      if (!value.COOKIE_SECURE) {
        context.addIssue({
          code: 'custom',
          path: ['COOKIE_SECURE'],
          message: 'COOKIE_SECURE must be true in production',
        })
      }
      if (value.JWT_ACCESS_SECRET.includes('replace-with')) {
        context.addIssue({
          code: 'custom',
          path: ['JWT_ACCESS_SECRET'],
          message: 'Use a unique production access-token secret',
        })
      }
      if (value.JWT_REFRESH_SECRET.includes('replace-with')) {
        context.addIssue({
          code: 'custom',
          path: ['JWT_REFRESH_SECRET'],
          message: 'Use a unique production refresh-token secret',
        })
      }
      if (value.ADMIN_PASSWORD === 'ChangeMe123!') {
        context.addIssue({
          code: 'custom',
          path: ['ADMIN_PASSWORD'],
          message: 'Change the default admin password before production',
        })
      }
      if (value.EMAIL_PROVIDER !== 'resend' || !value.RESEND_API_KEY.startsWith('re_')) {
        context.addIssue({
          code: 'custom',
          path: ['RESEND_API_KEY'],
          message: 'Configure Resend transactional email before production',
        })
      }
      if (!value.APP_URL.startsWith('https://')) {
        context.addIssue({
          code: 'custom',
          path: ['APP_URL'],
          message: 'APP_URL must use HTTPS in production',
        })
      }
      const clientOrigins = value.CLIENT_URL.split(',').map((origin) => origin.trim()).filter(Boolean)
      if (clientOrigins.length === 0 || clientOrigins.some((origin) => !origin.startsWith('https://'))) {
        context.addIssue({
          code: 'custom',
          path: ['CLIENT_URL'],
          message: 'Every CLIENT_URL origin must use HTTPS in production',
        })
      }
      if (value.ADMIN_EMAIL === 'admin@edvixa.local') {
        context.addIssue({
          code: 'custom',
          path: ['ADMIN_EMAIL'],
          message: 'Configure a real administrator email before production',
        })
      }
      if (value.EMAIL_FROM.includes('onboarding@resend.dev')) {
        context.addIssue({
          code: 'custom',
          path: ['EMAIL_FROM'],
          message: 'Configure a sender on a verified production email domain',
        })
      }
      if (
        value.PAYMENT_PROVIDER !== 'razorpay' ||
        !value.RAZORPAY_KEY_ID.startsWith('rzp_') ||
        value.RAZORPAY_KEY_SECRET.length < 8 ||
        value.RAZORPAY_WEBHOOK_SECRET.length < 8
      ) {
        context.addIssue({
          code: 'custom',
          path: ['PAYMENT_PROVIDER'],
          message: 'Configure Razorpay credentials and webhook verification before production',
        })
      }
      if (value.AI_PROVIDER === 'gemini' && !value.GEMINI_API_KEY.startsWith('AIza')) {
        context.addIssue({
          code: 'custom',
          path: ['GEMINI_API_KEY'],
          message: 'Configure a valid Gemini API key before production',
        })
      }
      if (value.AI_PROVIDER === 'grok' && !value.XAI_API_KEY.startsWith('xai-')) {
        context.addIssue({
          code: 'custom',
          path: ['XAI_API_KEY'],
          message: 'Configure a valid xAI API key before production',
        })
      }
    }
  })

export const env = schema.parse(process.env)
export const allowedClientOrigins = env.CLIENT_URL.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
