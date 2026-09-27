/**
 * DATABASE_URL の DB に SQL を実行して結果を表示する（Docker / PGlite サーバー / Neon 共通）。
 *
 *   pnpm db:query "select id, title from events"
 *
 * DATABASE_URL 未設定時は PGlite サーバー（pnpm dev:pglite / db:pglite）に接続する。
 * PGlite サーバーは複数接続に対応しているので、dev サーバー稼働中でも実行できる。
 */
import nextEnv from '@next/env'
import pg from 'pg'
import { PGLITE_SERVER_URL } from '../server/db/config.ts'

nextEnv.loadEnvConfig(process.cwd())

const sql = process.argv.slice(2).join(' ').trim()
if (!sql) {
  console.error('usage: pnpm db:query "<SQL>"')
  process.exit(1)
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL || PGLITE_SERVER_URL })
await client.connect()
try {
  const result = await client.query(sql)
  for (const r of Array.isArray(result) ? result : [result]) {
    if (r.fields.length > 0) {
      // jsonb などのオブジェクトは [Object] と表示されてしまうので文字列化する
      console.table(
        r.rows.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              key,
              value !== null && typeof value === 'object' && !(value instanceof Date) ? JSON.stringify(value) : value,
            ]),
          ),
        ),
      )
    } else {
      console.log(`${r.command} ${r.rowCount ?? 0}`)
    }
  }
} finally {
  await client.end()
}
