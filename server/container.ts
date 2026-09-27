import { randomBytes } from 'node:crypto'
import { todayInJapan } from '@/lib/date'
import { seedDemoEvent } from './events/demo-seed'
import type { EventRepository } from './events/event-repository'
import { createEventService, type EventService } from './events/event-service'
import { createInMemoryEventRepository } from './events/in-memory-event-repository'
import { createEigaIcsProvider } from './movies/eiga-ics-provider'
import { createFixtureProvider } from './movies/fixtures'
import { createMovieCatalog, type MovieCatalog, type MovieProvider } from './movies/movie-catalog'
import { createTmdbProvider } from './movies/tmdb-provider'

export type Container = {
  catalog: MovieCatalog
  events: EventService
}

const today = () => todayInJapan()

function movieProviders(env: NodeJS.ProcessEnv): MovieProvider[] {
  if (env.MOVIE_SOURCE === 'fixture') return [createFixtureProvider({ today })]
  const providers: MovieProvider[] = []
  if (env.TMDB_API_TOKEN) providers.push(createTmdbProvider({ token: env.TMDB_API_TOKEN }))
  if (env.EIGA_ICS_URL) providers.push(createEigaIcsProvider({ url: env.EIGA_ICS_URL }))
  return providers.length > 0 ? providers : [createFixtureProvider({ today })]
}

async function eventRepository(env: NodeJS.ProcessEnv): Promise<EventRepository> {
  if (env.DATA_STORE !== 'pglite') return createInMemoryEventRepository()
  const [{ PGlite }, { createPgliteEventRepository }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('./events/pglite-event-repository'),
  ])
  return createPgliteEventRepository(new PGlite(env.PGLITE_DATA_DIR))
}

async function createContainer(env: NodeJS.ProcessEnv): Promise<Container> {
  const catalog = createMovieCatalog({ providers: movieProviders(env), today })
  const repository = await eventRepository(env)
  if (env.NODE_ENV !== 'production' && env.SEED_DEMO !== 'false') {
    const [movie] = await createFixtureProvider({ today }).fetchMovies({ from: today(), to: today() })
    if (movie) await seedDemoEvent(repository, movie)
  }
  const events = createEventService({
    repository,
    catalog,
    generateId: () => randomBytes(8).toString('base64url'),
    now: () => new Date(),
  })
  return { catalog, events }
}

// dev サーバーの HMR や Route Handler 間でインメモリ状態を共有するため globalThis に保持する
const globalForContainer = globalThis as typeof globalThis & { __cinematchContainer?: Promise<Container> }

export function getContainer() {
  globalForContainer.__cinematchContainer ??= createContainer(process.env)
  return globalForContainer.__cinematchContainer
}
