import mongoose from 'mongoose'
import { app } from './app.js'
import { connectDatabase } from './config/database.js'
import { env } from './config/env.js'
import { bookingService } from './modules/bookings/services/booking.service.js'

async function bootstrap(): Promise<void> {
  await connectDatabase()
  const server = app.listen(env.PORT, () => {
    console.log(JSON.stringify({ level: 'info', message: 'Edvixa API started', port: env.PORT, environment: env.NODE_ENV }))
  })

  const cleanupExpiredReservations = async () => {
    try {
      const released = await bookingService.releaseExpiredReservations()
      if (released > 0) {
        console.log(JSON.stringify({ level: 'info', message: 'Released expired payment reservations', released }))
      }
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Expired reservation cleanup failed',
        error: error instanceof Error ? error.message : String(error),
      }))
    }
  }
  await cleanupExpiredReservations()
  const reservationCleanupTimer = setInterval(() => void cleanupExpiredReservations(), 5 * 60 * 1000)
  reservationCleanupTimer.unref()

  let shuttingDown = false
  const shutdown = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(JSON.stringify({ level: 'info', message: 'Shutting down Edvixa API', signal }))
    clearInterval(reservationCleanupTimer)

    const forceExit = setTimeout(() => process.exit(1), 10_000)
    forceExit.unref()

    server.close(async () => {
      await mongoose.connection.close(false).catch(() => undefined)
      clearTimeout(forceExit)
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

bootstrap().catch((error) => {
  console.error(JSON.stringify({ level: 'fatal', message: 'Failed to start API', error: error instanceof Error ? error.message : String(error) }))
  process.exit(1)
})
