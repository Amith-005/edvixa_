import type { Request, RequestHandler } from 'express'
import type { ZodType } from 'zod'

import { AppError } from '../shared/errors/app-error.js'

export function validate(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    })

    if (!result.success) {
      return next(
        new AppError(
          422,
          'Validation failed',
          'VALIDATION_ERROR',
          result.error.flatten(),
        ),
      )
    }

    const data = result.data as {
      body?: unknown
      params?: unknown
      query?: unknown
    }

    if (data.body !== undefined) {
      req.body = data.body
    }

    if (data.params !== undefined) {
      Object.assign(req.params, data.params as Request['params'])
    }

    // Express 5 exposes req.query through a getter, but the returned object can be updated.
    // Mutating it preserves validated defaults and coercions for existing controllers.
    if (data.query !== undefined) {
      Object.assign(req.query as Record<string, unknown>, data.query as object)
    }

    req.validated = data
    next()
  }
}
