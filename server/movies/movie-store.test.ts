import { beforeEach, describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/types'
import type { Database } from '@/server/db/client'
import { movies } from '@/server/db/schema'
import { freshTestDatabase } from '@/server/db/testing'
import { upsertMovies } from './movie-store'

function movie(overrides: Partial<Movie> & { id: string }): Movie {
  return {
    title: 'タイトル',
    releaseDate: '2026-10-01',
    genres: ['SF'],
    poster: '/p.png',
    synopsis: 'あらすじ',
    source: 'tmdb',
    ...overrides,
  }
}

describe('upsertMovies', () => {
  let db: Database

  beforeEach(async () => {
    db = await freshTestDatabase()
  })

  it('作品を保存し、保存した件数を返す', async () => {
    const saved = await upsertMovies(db, [movie({ id: 'a' }), movie({ id: 'b', title: 'B' })])

    expect(saved).toBe(2)
    const rows = await db.select().from(movies)
    expect(rows.map((row) => row.id).sort()).toEqual(['a', 'b'])
  })

  it('任意項目が未設定なら null で保存する', async () => {
    await upsertMovies(db, [movie({ id: 'a' })])

    const [row] = await db.select().from(movies)
    expect(row?.originalTitle).toBeNull()
    expect(row?.runtime).toBeNull()
    expect(row?.distributor).toBeNull()
  })

  it('同じ ID は重複させず、内容を更新する', async () => {
    await upsertMovies(db, [movie({ id: 'a', title: '旧題', runtime: 100 })])
    await upsertMovies(db, [movie({ id: 'a', title: '新題', releaseDate: '2026-11-01', runtime: undefined })])

    const rows = await db.select().from(movies)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ title: '新題', releaseDate: '2026-11-01', runtime: null })
  })

  it('空配列なら何もせず 0 を返す', async () => {
    expect(await upsertMovies(db, [])).toBe(0)
    expect(await db.select().from(movies)).toEqual([])
  })
})
