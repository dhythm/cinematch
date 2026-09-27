import { describe, expect, it } from 'vitest'
import { movies } from '@/server/db/schema'
import { freshTestDatabase } from '@/server/db/testing'
import { createDatabaseMovieProvider } from './database-provider'

describe('createDatabaseMovieProvider', () => {
  it('公開日が範囲内の映画を返す', async () => {
    const db = await freshTestDatabase()
    const base = { genres: ['SF'], poster: '/p.png', synopsis: 'あらすじ', source: 'eiga' as const }
    await db.insert(movies).values([
      { ...base, id: 'in', title: '範囲内', releaseDate: '2026-10-01', runtime: 120, distributor: '東邦' },
      { ...base, id: 'out', title: '範囲外', releaseDate: '2027-01-01' },
    ])

    const result = await createDatabaseMovieProvider(db).fetchMovies({ from: '2026-09-14', to: '2026-11-26' })

    expect(result).toEqual([
      {
        id: 'in',
        title: '範囲内',
        releaseDate: '2026-10-01',
        runtime: 120,
        genres: ['SF'],
        poster: '/p.png',
        distributor: '東邦',
        synopsis: 'あらすじ',
        source: 'eiga',
      },
    ])
  })
})
