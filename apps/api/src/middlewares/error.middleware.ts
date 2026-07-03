import type { ErrorRequestHandler, RequestHandler } from 'express'
import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { env } from '../config/env.js'
import { AppError } from '../shared/errors/app-error.js'

type MongoDuplicateError = Error & { code?: number; keyValue?: Record<string, unknown> }

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} was not found`, 'NOT_FOUND'))
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  let appError: AppError

  if (error instanceof ZodError) {
    appError = new AppError(422, 'Validation failed', 'VALIDATION_ERROR', error.flatten())
  } else if (error instanceof mongoose.Error.CastError) {
    appError = new AppError(400, 'The supplied identifier is invalid', 'INVALID_IDENTIFIER')
  } else if ((error as MongoDuplicateError)?.code === 11000) {
    const duplicate = error as MongoDuplicateError
    appError = new AppError(409, 'A record with these details already exists', 'DUPLICATE_RECORD', duplicate.keyValue)
  } else {
    appError = error instanceof AppError ? error : new AppError(500, 'Unexpected server error', 'INTERNAL_ERROR')
  }

  if (!(error instanceof AppError) && env.NODE_ENV !== 'test') {
    console.error(JSON.stringify({
      level: 'error',
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      message: error instanceof Error ? error.message : String(error),
      stack: env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
    }))
  }

  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
      requestId: req.requestId,
      ...(env.NODE_ENV === 'development' && appError.statusCode === 500
        ? { stack: error instanceof Error ? error.stack : undefined }
        : {}),
    },
  })
}
