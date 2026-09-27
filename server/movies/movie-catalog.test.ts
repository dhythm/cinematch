import { describe, expect, it, vi } from 'vitest'
import type { Movie } from '@/lib/types'
import { createMovieCatalog, type MovieProvider } from './movie-catalog'

function movie(id: string, releaseDate: string): Movie {
  return { id, title: id, releaseDate, genres: [], poster: '', synopsis: '', source: 'tmdb' }
}

function provider(movies: Movie[]): MovieProvider & { fetchMovies: ReturnType<typeof vi.fn> } {
  return { name: 'fake', fetchMovies: vi.fn(async () => movies) }
}

describe('createMovieCatalog', () => {
  it('公開済み13日以内〜60日先の作品を公開日順で返す（調整可能な作品のみ）', async () => {
    const source = provider([movie('b', '2026-10-09'), movie('old', '2026-09-13'), movie('a', '2026-09-14')])
    const catalog = createMovieCatalog({ providers: [source], today: () => '2026-09-27' })

    const movies = await catalog.list()

    expect(movies.map((m) => m.id)).toEqual(['a', 'b'])
    expect(source.fetchMovies).toHaveBeenCalledWith({ from: '2026-09-14', to: '2026-11-26' })
  })

  it('TTL 内はプロバイダを再呼び出ししない', async () => {
    const source = provider([movie('a', '2026-10-01')])
    let now = 0
    const catalog = createMovieCatalog({ providers: [source], today: () => '2026-09-27', now: () => now, ttlMs: 1000 })

    await catalog.list()
    now = 999
    await catalog.list()
    expect(source.fetchMovies).toHaveBeenCalledTimes(1)

    now = 1000
    await catalog.list()
    expect(source.fetchMovies).toHaveBeenCalledTimes(2)
  })

  it('一部のプロバイダが失敗しても残りの結果を返す', async () => {
    const failing: MovieProvider = { name: 'broken', fetchMovies: async () => Promise.reject(new Error('down')) }
    const catalog = createMovieCatalog({
      providers: [failing, provider([movie('a', '2026-10-01')])],
      today: () => '2026-09-27',
      onError: () => {},
    })

    expect((await catalog.list()).map((m) => m.id)).toEqual(['a'])
  })

  it('ID で作品を取得できる', async () => {
    const catalog = createMovieCatalog({ providers: [provider([movie('a', '2026-10-01')])], today: () => '2026-09-27' })

    expect((await catalog.get('a'))?.id).toBe('a')
    expect(await catalog.get('missing')).toBeUndefined()
  })
})
