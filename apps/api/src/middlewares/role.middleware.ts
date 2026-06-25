import type { RequestHandler } from 'express'
import { AppError } from '../shared/errors/app-error.js'

type Role = 'student' | 'teacher' | 'admin'

export function authorizeRoles(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to access this resource', 'FORBIDDEN'))
    }
    next()
  }
}
