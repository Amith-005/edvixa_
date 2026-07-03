import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'
import { env } from '../config/env.js'

export const requestContext: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id')?.trim()
  const requestId = incoming && incoming.length <= 120 ? incoming : randomUUID()
  const startedAt = process.hrtime.bigint()

  req.requestId = requestId
  res.setHeader('x-request-id', requestId)

  if (env.NODE_ENV !== 'test') {
    res.on('finish', () => {
      const pathname = req.originalUrl.split('?')[0] ?? req.originalUrl
      if (pathname.endsWith('/health') || pathname.endsWith('/ready')) return

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
      console.log(
        JSON.stringify({
          level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
          message: 'HTTP request completed',
          requestId,
          method: req.method,
          path: pathname,
          statusCode: res.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
        }),
      )
    })
  }

  next()
}
