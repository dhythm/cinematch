import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Movie } from '@/lib/types'
import type { Database } from '@/server/db/client'
import { movies } from '@/server/db/schema'
import { freshTestDatabase } from '@/server/db/testing'
import type { MovieProvider } from './movie-catalog'
import { externalMovieProviders, syncExternalMovies, syncMovies } from './movie-sync'

const RANGE = { from: '2026-09-14', to: '2026-11-26' }

function movie(id: string, releaseDate: string): Movie {
  return { id, title: id, releaseDate, genres: [], poster: '/p.png', synopsis: '', source: 'tmdb' }
}

function provider(name: string, result: Movie[]): MovieProvider {
  return { name, fetchMovies: vi.fn(async () => result) }
}

describe('syncMovies', () => {
  let db: Database

  beforeEach(async () => {
    db = await freshTestDatabase()
  })

  it('プロバイダが返した作品を DB に保存する', async () => {
    const tmdb = provider('tmdb', [movie('b', '2026-10-09'), movie('a', '2026-09-14')])

    const result = await syncMovies({ db, providers: [tmdb], range: RANGE })

    expect(result).toEqual({ providers: ['tmdb'], saved: 2, failures: [] })
    expect(tmdb.fetchMovies).toHaveBeenCalledWith(RANGE)
    const rows = await db.select().from(movies)
    expect(rows.map((row) => row.id).sort()).toEqual(['a', 'b'])
  })

  it('範囲外の公開日は保存しない', async () => {
    await syncMovies({
      db,
      providers: [provider('tmdb', [movie('in', '2026-10-01'), movie('out', '2027-01-01')])],
      range: RANGE,
    })

    expect((await db.select().from(movies)).map((row) => row.id)).toEqual(['in'])
  })

  it('一部のプロバイダが失敗しても残りを保存し、失敗を報告する', async () => {
    const error = new Error('down')
    const broken: MovieProvider = { name: 'broken', fetchMovies: () => Promise.reject(error) }

    const result = await syncMovies({
      db,
      providers: [broken, provider('tmdb', [movie('a', '2026-10-01')])],
      range: RANGE,
    })

    expect(result).toEqual({ providers: ['broken', 'tmdb'], saved: 1, failures: [{ provider: 'broken', error }] })
    expect((await db.select().from(movies)).map((row) => row.id)).toEqual(['a'])
  })

  it('再実行しても重複せず、変更は反映する', async () => {
    await syncMovies({ db, providers: [provider('tmdb', [movie('a', '2026-10-01')])], range: RANGE })
    await syncMovies({ db, providers: [provider('tmdb', [movie('a', '2026-10-15')])], range: RANGE })

    const rows = await db.select().from(movies)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.releaseDate).toBe('2026-10-15')
  })

  it('プロバイダが無ければ DB に触らず、取り込み元が空だと分かるようにする', async () => {
    expect(await syncMovies({ db, providers: [], range: RANGE })).toEqual({ providers: [], saved: 0, failures: [] })
    expect(await db.select().from(movies)).toEqual([])
  })
})

describe('externalMovieProviders', () => {
  it('TMDB_API_TOKEN があれば TMDB を有効にする', () => {
    expect(externalMovieProviders({ TMDB_API_TOKEN: 'token' }).map((p) => p.name)).toEqual(['tmdb'])
  })

  it('トークンが無ければ外部ソースを使わない', () => {
    expect(externalMovieProviders({})).toEqual([])
    expect(externalMovieProviders({ TMDB_API_TOKEN: '' })).toEqual([])
  })
})

describe('syncExternalMovies', () => {
  let db: Database

  beforeEach(async () => {
    db = await freshTestDatabase()
  })

  it('外部ソースが無ければ何もしない', async () => {
    const result = await syncExternalMovies({ db, env: {}, today: () => '2026-09-27' })

    expect(result).toEqual({ providers: [], saved: 0, failures: [] })
    expect(await db.select().from(movies)).toEqual([])
  })

  it('「今日」基準のカタログ範囲で取り込む', async () => {
    const fetchMovies = vi.fn(async () => [movie('a', '2026-10-01')])
    const result = await syncExternalMovies({
      db,
      env: { TMDB_API_TOKEN: 'token' },
      today: () => '2026-09-27',
      providers: [{ name: 'fake', fetchMovies }],
    })

    expect(fetchMovies).toHaveBeenCalledWith({ from: '2026-09-14', to: '2026-11-26' })
    expect(result.saved).toBe(1)
  })
})
