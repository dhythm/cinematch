import { randomBytes } from 'node:crypto'
import { todayInJapan } from '@/lib/date'
import { createDatabase, type Database } from './db/client'
import { seedDatabase } from './db/seed'
import { createDrizzleEventRepository } from './events/drizzle-event-repository'
import { createEventService, type EventService } from './events/event-service'
import { createDatabaseMovieProvider } from './movies/database-provider'
import { createMovieCatalog, type MovieCatalog, type MovieProvider } from './movies/movie-catalog'
import { createTmdbProvider } from './movies/tmdb-provider'

export type Container = {
  catalog: MovieCatalog
  events: EventService
}

const today = () => todayInJapan()

function movieProviders(env: NodeJS.ProcessEnv, db: Database): MovieProvider[] {
  const providers = [createDatabaseMovieProvider(db)]
  if (env.TMDB_API_TOKEN) providers.push(createTmdbProvider({ token: env.TMDB_API_TOKEN }))
  return providers
}

async function createContainer(env: NodeJS.ProcessEnv): Promise<Container> {
  const database = await createDatabase(env)
  // PGlite（プロセス内）と開発時の DB は起動時に自動マイグレーション。本番は `pnpm db:migrate` を明示実行する
  if (database.driver === 'pglite' || env.NODE_ENV !== 'production') await database.migrate()
  // 開発時はダミー映画とデモイベントを投入する（冪等）。本番や他環境では `pnpm db:seed`
  if (env.NODE_ENV !== 'production' && env.SEED !== 'false') await seedDatabase(database.db, { today })
  const catalog = createMovieCatalog({ providers: movieProviders(env, database.db), today })
  const repository = createDrizzleEventRepository(database.db)
  const events = createEventService({
    repository,
    catalog,
    generateId: () => randomBytes(8).toString('base64url'),
    now: () => new Date(),
  })
  return { catalog, events }
}

// dev サーバーの HMR や Route Handler 間でインメモリ状態を共有するため globalThis に保持する
const globalForContainer = globalThis as typeof globalThis & { __cinematchanContainer?: Promise<Container> }

export function getContainer() {
  globalForContainer.__cinematchanContainer ??= createContainer(process.env)
  return globalForContainer.__cinematchanContainer
}
