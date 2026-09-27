import { randomBytes } from 'node:crypto'
import { todayInJapan } from '@/lib/date'
import { createDatabase } from './db/client'
import { seedDemoEvent } from './events/demo-seed'
import { createDrizzleEventRepository } from './events/drizzle-event-repository'
import { createEventService, type EventService } from './events/event-service'
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

async function createContainer(env: NodeJS.ProcessEnv): Promise<Container> {
  const catalog = createMovieCatalog({ providers: movieProviders(env), today })
  const database = await createDatabase(env)
  // PGlite（プロセス内）と開発時の DB は起動時に自動マイグレーション。本番は `pnpm db:migrate` を明示実行する
  if (database.driver === 'pglite' || env.NODE_ENV !== 'production') await database.migrate()
  const repository = createDrizzleEventRepository(database.db)
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
