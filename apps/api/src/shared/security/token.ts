import crypto from 'node:crypto'
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'
import { env } from '../../config/env.js'

export type AccessTokenPayload = {
  sub: string
  role: 'student' | 'teacher' | 'admin'
  email: string
}

const issuer = 'edvixa-api'
const audience = 'edvixa-web'
const algorithm = 'HS256' as const

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm,
    issuer,
    audience,
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  })
}

export function signRefreshToken(sessionId: string, userId: string): string {
  return jwt.sign({ sub: userId, sid: sessionId, type: 'refresh', jti: randomToken(16) }, env.JWT_REFRESH_SECRET, {
    algorithm,
    issuer,
    audience,
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
  })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: [algorithm],
    issuer,
    audience,
  }) as JwtPayload

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    !['student', 'teacher', 'admin'].includes(String(payload.role))
  ) {
    throw new jwt.JsonWebTokenError('Access token claims are invalid')
  }

  return {
    sub: payload.sub,
    email: payload.email,
    role: payload.role as AccessTokenPayload['role'],
  }
}

export function verifyRefreshToken(token: string): { sub: string; sid: string; type: 'refresh' } {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: [algorithm],
    issuer,
    audience,
  }) as JwtPayload

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string' ||
    payload.type !== 'refresh'
  ) {
    throw new jwt.JsonWebTokenError('Refresh token claims are invalid')
  }

  return { sub: payload.sub, sid: payload.sid, type: 'refresh' }
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
