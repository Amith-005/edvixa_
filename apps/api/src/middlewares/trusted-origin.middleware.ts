import type { NextFunction, Request, Response } from 'express'
import { allowedClientOrigins } from '../config/env.js'
import { AppError } from '../shared/errors/app-error.js'

const readOnlyMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * CORS controls whether a browser may read a response, but it does not prevent
 * a cross-origin request from reaching the server. Reject browser-originated
 * state changes from origins that are not explicitly trusted.
 */
export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction): void {
  if (readOnlyMethods.has(req.method)) {
    next()
    return
  }

  const origin = req.get('origin')
  if (!origin || allowedClientOrigins.includes(origin)) {
    next()
    return
  }

  next(new AppError(403, 'Request origin is not allowed', 'UNTRUSTED_ORIGIN'))
}
