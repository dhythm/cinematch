import { PGlite } from '@electric-sql/pglite'
import { describeEventRepositoryContract } from './event-repository.contract'
import { createPgliteEventRepository } from './pglite-event-repository'

describeEventRepositoryContract('PgliteEventRepository', async () => createPgliteEventRepository(new PGlite()))
