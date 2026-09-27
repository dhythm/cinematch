import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase, type DatabaseHandle } from './client'
import { candidates, events, participants } from './schema'

let handle: DatabaseHandle | undefined

afterEach(async () => {
  await handle?.close()
  handle = undefined
})

describe('createDatabase', () => {
  it('DATABASE_URL 未設定ならプロセス内 PGlite を使い、マイグレーションでテーブルを作る', async () => {
    handle = await createDatabase({})
    expect(handle.driver).toBe('pglite')

    await handle.migrate()

    for (const table of [events, candidates, participants]) {
      await expect(handle.db.select().from(table)).resolves.toEqual([])
    }
  })

  it('DATABASE_URL があれば node-postgres で接続する（接続は遅延）', async () => {
    handle = await createDatabase({ DATABASE_URL: 'postgresql://user:pass@127.0.0.1:1/db' })

    expect(handle.driver).toBe('node-postgres')
  })
})
