import { app } from './app.js'
import { connectDatabase } from './config/database.js'
import { env } from './config/env.js'

async function bootstrap(): Promise<void> {
  await connectDatabase()
  app.listen(env.PORT, () => console.log(`Edvixa API running at http://localhost:${env.PORT}`))
}

bootstrap().catch((error) => {
  console.error('Failed to start API', error)
  process.exit(1)
})
