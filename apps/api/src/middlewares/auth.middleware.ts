import type { RequestHandler } from 'express'
import { AppError } from '../shared/errors/app-error.js'
import { verifyAccessToken } from '../shared/security/token.js'

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'))
  }
  try {
    const payload = verifyAccessToken(header.slice(7))
    req.user = { id: payload.sub, email: payload.email, role: payload.role }
    next()
  } catch {
    next(new AppError(401, 'Access token is invalid or expired', 'INVALID_ACCESS_TOKEN'))
  }
}
