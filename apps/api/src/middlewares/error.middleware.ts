import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../shared/errors/app-error.js'
import { env } from '../config/env.js'

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} was not found`, 'NOT_FOUND'))
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.flatten() } })
  }

  const appError = error instanceof AppError ? error : new AppError(500, 'Unexpected server error', 'INTERNAL_ERROR')

  if (!(error instanceof AppError)) console.error(error)

  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
      ...(env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined }),
    },
  })
}
