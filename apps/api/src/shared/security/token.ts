import crypto from 'node:crypto'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../../config/env.js'

export type AccessTokenPayload = {
  sub: string
  role: 'student' | 'teacher' | 'admin'
  email: string
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  })
}

export function signRefreshToken(sessionId: string, userId: string): string {
  return jwt.sign({ sub: userId, sid: sessionId }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
  })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload
}

export function verifyRefreshToken(token: string): { sub: string; sid: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; sid: string }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

export function randomOtp(): string {
  return crypto.randomInt(100000, 1000000).toString()
}
