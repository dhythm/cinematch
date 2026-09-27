import { sql } from 'drizzle-orm'
import { createDatabase, type DatabaseHandle } from './client'

let handle: DatabaseHandle | undefined

/** テスト用: ファイル単位で 1 つの PGlite（メモリ）を使い回し、呼ぶたびに全テーブルを空にする */
export async function freshTestDatabase() {
  if (!handle) {
    handle = await createDatabase({})
    await handle.migrate()
  }
  await handle.db.execute(sql`truncate events, movies cascade`)
  return handle.db
}
