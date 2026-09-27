import { randomBytes } from 'node:crypto'
import { todayInJapan } from '@/lib/date'
import { createDatabase, type Database } from './db/client'
import { seedDatabase } from './db/seed'
import { createDrizzleEventRepository } from './events/drizzle-event-repository'
import { createEventService, type EventService } from './events/event-service'
import { createDatabaseMovieProvider } from './movies/database-provider'
import { createMovieCatalog, type MovieCatalog } from './movies/movie-catalog'
import { syncExternalMovies } from './movies/movie-sync'

export type Container = {
  catalog: MovieCatalog
  events: EventService
}

const today = () => todayInJapan()

/**
 * 実データの取り込みを起動時に一度だけ走らせる。
 * TMDB への数十リクエストで起動を待たせたくないので待ち受けず、結果はログに出すだけにする。
 */
function syncInBackground(env: NodeJS.ProcessEnv, db: Database) {
  void syncExternalMovies({ db, env, today })
    .then(({ saved, failures }) => {
      for (const { provider, error } of failures) console.error(`[movie-sync] ${provider} failed`, error)
      if (saved > 0) console.log(`[movie-sync] saved ${saved} movies`)
    })
    .catch((error) => console.error('[movie-sync] failed', error))
}

async function createContainer(env: NodeJS.ProcessEnv): Promise<Container> {
  const database = await createDatabase(env)
  // PGlite（プロセス内）と開発時の DB は起動時に自動マイグレーション。本番は `pnpm db:migrate` を明示実行する
  if (database.driver === 'pglite' || env.NODE_ENV !== 'production') await database.migrate()
  // 開発時はダミー映画とデモイベントを投入する（冪等）。本番や他環境では `pnpm db:seed`
  const seeding = env.NODE_ENV !== 'production' && env.SEED !== 'false'
  if (seeding) await seedDatabase(database.db, { today })
  // カタログは DB だけを読む。外部ソース（TMDB）は movie-sync が DB に取り込む
  const catalog = createMovieCatalog({ providers: [createDatabaseMovieProvider(database.db)], today })
  // シードするときはダミー映画だけで完結させ、外部 API は呼ばない。
  // シードしないとき（SEED=false）は実データを取り込む。本番はコールドスタートのたびに TMDB を叩かないよう cron に任せる
  if (!seeding && env.NODE_ENV !== 'production') syncInBackground(env, database.db)
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
