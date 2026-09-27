import { freshTestDatabase } from '@/server/db/testing'
import { createDrizzleEventRepository } from './drizzle-event-repository'
import { describeEventRepositoryContract } from './event-repository.contract'

describeEventRepositoryContract('DrizzleEventRepository (PGlite)', async () =>
  createDrizzleEventRepository(await freshTestDatabase()),
)
