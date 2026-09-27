/**
 * DATABASE_URL の DB にマイグレーションとシード（ダミー映画・デモイベント）を適用する。
 *
 *   pnpm db:seed            # 冪等。映画の公開日を今日基準に更新し、デモイベントが無ければ作る
 *   pnpm db:seed --reset    # イベント・映画を全削除してから投入し直す
 *
 * DATABASE_URL 未設定時は PGlite サーバー（pnpm dev:pglite / db:pglite）に接続する。
 */
import nextEnv from '@next/env'
import { sql } from 'drizzle-orm'
import { todayInJapan } from '@/lib/date'
import { createDatabase } from '@/server/db/client'
import { PGLITE_SERVER_URL } from '@/server/db/config'
import { seedDatabase } from '@/server/db/seed'

nextEnv.loadEnvConfig(process.cwd())

const url = process.env.DATABASE_URL || PGLITE_SERVER_URL
const reset = process.argv.includes('--reset')
const database = await createDatabase({ DATABASE_URL: url })
try {
  await database.migrate()
  if (reset) await database.db.execute(sql`truncate events, movies cascade`)
  await seedDatabase(database.db, { today: () => todayInJapan() })
  console.log(`seeded ${new URL(url).host}${reset ? ' (reset)' : ''}`)
} finally {
  await database.close()
}
