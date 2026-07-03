import { z } from 'zod'

export function isValidIanaTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date())
    return true
  } catch {
    return false
  }
}

export const ianaTimezoneSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .refine(isValidIanaTimezone, 'Use a valid IANA timezone, for example Asia/Kolkata')
