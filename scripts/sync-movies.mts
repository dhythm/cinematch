/**
 * 外部 API（TMDB）を呼んで、公開予定作品を movies テーブルに同期する手動 / cron 用コマンド。
 *
 *   pnpm movies:sync
 *
 * 前提:
 *   - DB につながっていること（Docker: pnpm db:up / PGlite: pnpm db:pglite / 本番: DATABASE_URL）
 *   - マイグレーションが適用済みであること（未適用なら pnpm db:migrate）
 *
 * 冪等（id で upsert・削除なし）なので何度実行してもよい。
 * DATABASE_URL 未設定時は PGlite サーバー（pnpm dev:pglite / db:pglite）に接続する。
 */
import nextEnv from '@next/env'
import { sql } from 'drizzle-orm'
import { todayInJapan } from '@/lib/date'
import { createDatabase } from '@/server/db/client'
import { PGLITE_SERVER_URL } from '@/server/db/config'
import { externalMovieProviders, syncExternalMovies } from '@/server/movies/movie-sync'

/** PostgreSQL のエラーコード: テーブルが存在しない */
const UNDEFINED_TABLE = '42P01'

/** drizzle は pg のエラーを DrizzleQueryError で包むので、cause を辿ってコードを探す */
function isUndefinedTable(error: unknown) {
  for (let current = error; current instanceof Error; current = current.cause) {
    if ('code' in current && current.code === UNDEFINED_TABLE) return true
  }
  return false
}

nextEnv.loadEnvConfig(process.cwd())

const providers = externalMovieProviders(process.env)
if (providers.length === 0) {
  console.error('取り込み元が設定されていません。.env.local に TMDB_API_TOKEN を設定してください')
  process.exit(1)
}

const url = process.env.DATABASE_URL || PGLITE_SERVER_URL
const host = new URL(url).host
const database = await createDatabase({ DATABASE_URL: url })
try {
  // 外部 API を叩く前に、DB につながっていることを確かめる
  try {
    await database.db.execute(sql`select 1`)
  } catch (error) {
    console.error(
      `DB (${host}) に接続できません。Docker なら pnpm db:up、PGlite なら pnpm db:pglite で起動してください`,
    )
    throw error
  }

  const { saved, failures } = await syncExternalMovies({
    db: database.db,
    env: process.env,
    today: () => todayInJapan(),
    providers,
  })
  for (const { provider, error } of failures) console.error(`${provider} の取得に失敗しました`, error)
  console.log(`synced ${saved} movies to ${host}`)
  // 一部でも取得に失敗したら cron 側で気付けるように異常終了する
  if (failures.length > 0) process.exitCode = 1
} catch (error) {
  if (isUndefinedTable(error)) {
    console.error(`movies テーブルがありません。pnpm db:migrate でマイグレーションを適用してください（${host}）`)
  } else {
    console.error(error)
  }
  process.exitCode = 1
} finally {
  await database.close()
}
