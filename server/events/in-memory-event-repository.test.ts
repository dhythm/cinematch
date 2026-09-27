import { describeEventRepositoryContract } from './event-repository.contract'
import { createInMemoryEventRepository } from './in-memory-event-repository'

describeEventRepositoryContract('InMemoryEventRepository', async () => createInMemoryEventRepository())
