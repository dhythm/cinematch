/**
 * PGlite に SQL を投げて結果を表示する、エージェント／開発者の確認用 CLI。
 *
 *   pnpm db:pglite "select id, title from events"
 *   PGLITE_DATA_DIR=memory:// pnpm db:pglite   # 空のインメモリ DB でスキーマだけ確認
 *
 * PGLITE_DATA_DIR 未指定時は dev サーバー（DATA_STORE=pglite）と同じ .pglite を開く。
 * PGlite は単一プロセス専用なので、dev サーバーを止めてから実行すること。
 */
import { PGlite } from '@electric-sql/pglite'
import { EVENT_SCHEMA_SQL } from '../server/events/pglite-schema.ts'

const sql = process.argv.slice(2).join(' ').trim()
const dataDir = process.env.PGLITE_DATA_DIR || '.pglite'

const db = new PGlite(dataDir)
await db.exec(EVENT_SCHEMA_SQL)

if (!sql) {
  const { rows } = await db.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
  )
  console.log(`PGlite (${dataDir}) tables: ${rows.map((r) => r.table_name).join(', ')}`)
  console.log('usage: pnpm db:pglite "<SQL>"')
} else {
  for (const result of await db.exec(sql)) {
    if (result.fields.length > 0) console.table(result.rows)
    else console.log(`OK (${result.affectedRows ?? 0} rows affected)`)
  }
}
await db.close()
