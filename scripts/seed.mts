/**
 * DATABASE_URL の DB にマイグレーションとシード（ダミー映画・デモイベント）を適用する。
 *
 *   pnpm db:seed            # 冪等。映画の公開日を今日基準に更新し、デモイベントが無ければ作る
 *   pnpm db:seed --reset    # イベント・映画を全削除してから投入し直す
 *   pnpm db:seed --no-sync  # TMDB からの取り込みを行わない
 *
 * TMDB_API_TOKEN があれば、シードに続けて TMDB の公開予定作品も取り込む（= pnpm movies:sync と同じ処理）。
 *
 * DATABASE_URL 未設定時は PGlite サーバー（pnpm dev:pglite / db:pglite）に接続する。
 */
import nextEnv from '@next/env'
import { sql } from 'drizzle-orm'
import { todayInJapan } from '@/lib/date'
import { createDatabase } from '@/server/db/client'
import { PGLITE_SERVER_URL } from '@/server/db/config'
import { seedDatabase } from '@/server/db/seed'
import { externalMovieProviders, syncExternalMovies } from '@/server/movies/movie-sync'

nextEnv.loadEnvConfig(process.cwd())

const url = process.env.DATABASE_URL || PGLITE_SERVER_URL
const reset = process.argv.includes('--reset')
const sync = !process.argv.includes('--no-sync')
const database = await createDatabase({ DATABASE_URL: url })
try {
  await database.migrate()
  if (reset) await database.db.execute(sql`truncate events, movies cascade`)
  await seedDatabase(database.db, { today: () => todayInJapan() })
  console.log(`seeded ${new URL(url).host}${reset ? ' (reset)' : ''}`)

  if (sync && externalMovieProviders(process.env).length > 0) {
    const { saved, failures } = await syncExternalMovies({
      db: database.db,
      env: process.env,
      today: () => todayInJapan(),
    })
    for (const { provider, error } of failures) console.error(`${provider} の取得に失敗しました`, error)
    console.log(`synced ${saved} movies`)
    if (failures.length > 0) process.exitCode = 1
  }
} finally {
  await database.close()
}
