import mongoose from 'mongoose'
import '../app.js'
import { connectDatabase } from '../config/database.js'

async function syncIndexes(): Promise<void> {
  await connectDatabase()
  const models = Object.values(mongoose.models)

  for (const model of models) {
    const result = await model.syncIndexes()
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'MongoDB indexes synchronized',
        model: model.modelName,
        droppedIndexes: result,
      }),
    )
  }

  await mongoose.connection.close(false)
}

syncIndexes().catch(async (error) => {
  console.error(
    JSON.stringify({
      level: 'fatal',
      message: 'MongoDB index synchronization failed',
      error: error instanceof Error ? error.message : String(error),
    }),
  )
  await mongoose.connection.close(false).catch(() => undefined)
  process.exit(1)
})
