import { beforeEach, describe, expect, it } from 'vitest'
import { createDrizzleEventRepository } from '@/server/events/drizzle-event-repository'
import type { Database } from './client'
import { movies } from './schema'
import { DEMO_EVENT_ID, seedDatabase } from './seed'
import { freshTestDatabase } from './testing'

const today = () => '2026-09-27'

describe('seedDatabase', () => {
  let db: Database

  beforeEach(async () => {
    db = await freshTestDatabase()
  })

  it('ダミー映画を「今日」基準の公開日で投入し、デモイベントを作る', async () => {
    await seedDatabase(db, { today })

    const rows = await db.select().from(movies)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.find((m) => m.id === 'itetsuku')?.releaseDate).toBe('2026-10-09')

    const demo = await createDrizzleEventRepository(db).findById(DEMO_EVENT_ID)
    expect(demo?.participants.length).toBeGreaterThan(0)
  })

  it('何度実行しても重複せず、映画の公開日は最新の「今日」基準に更新される', async () => {
    await seedDatabase(db, { today })
    await seedDatabase(db, { today: () => '2026-10-01' })

    const rows = await db.select().from(movies)
    expect(rows.filter((m) => m.id === 'itetsuku')).toHaveLength(1)
    expect(rows.find((m) => m.id === 'itetsuku')?.releaseDate).toBe('2026-10-13')
  })

  it('既存のデモイベント（回答が増えたものなど）は上書きしない', async () => {
    await seedDatabase(db, { today })
    const repository = createDrizzleEventRepository(db)
    await repository.saveParticipant(DEMO_EVENT_ID, { id: 'added', name: '追加', answers: {} })

    await seedDatabase(db, { today })

    const demo = await repository.findById(DEMO_EVENT_ID)
    expect(demo?.participants.some((p) => p.id === 'added')).toBe(true)
  })
})
