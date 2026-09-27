import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { MIGRATIONS_FOLDER } from './config'
import * as schema from './schema'

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>

export type DatabaseHandle = {
  driver: 'node-postgres' | 'pglite'
  db: Database
  migrate: () => Promise<void>
  close: () => Promise<void>
}

/** DATABASE_URL / PGLITE_DATA_DIR を参照する */
type Env = Record<string, string | undefined>

const options = { schema, casing: 'snake_case' } as const

/**
 * DATABASE_URL があれば node-postgres で接続する（Docker の PostgreSQL / PGlite サーバー / Neon を同じコードで扱う）。
 * 未設定ならプロセス内の PGlite を使う（テストや設定なしの起動用）。
 */
export async function createDatabase(env: Env): Promise<DatabaseHandle> {
  if (env.DATABASE_URL) {
    const [{ Pool }, { drizzle }, { migrate }] = await Promise.all([
      import('pg'),
      import('drizzle-orm/node-postgres'),
      import('drizzle-orm/node-postgres/migrator'),
    ])
    const pool = new Pool({ connectionString: env.DATABASE_URL })
    const db = drizzle({ client: pool, ...options })
    return {
      driver: 'node-postgres',
      db,
      migrate: () => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER }),
      close: () => pool.end(),
    }
  }

  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
    import('drizzle-orm/pglite/migrator'),
  ])
  const client = new PGlite(env.PGLITE_DATA_DIR || 'memory://')
  const db = drizzle({ client, ...options })
  return {
    driver: 'pglite',
    db,
    migrate: () => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER }),
    close: () => client.close(),
  }
}
