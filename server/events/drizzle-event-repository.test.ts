import { createDatabase } from '@/server/db/client'
import { createDrizzleEventRepository } from './drizzle-event-repository'
import { describeEventRepositoryContract } from './event-repository.contract'

describeEventRepositoryContract('DrizzleEventRepository (PGlite)', async () => {
  const { db, migrate } = await createDatabase({})
  await migrate()
  return createDrizzleEventRepository(db)
})
