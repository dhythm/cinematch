import { describe, expect, it, vi } from 'vitest'
import { createTmdbProvider } from './tmdb-provider'

const responseBody = {
  page: 1,
  total_pages: 1,
  results: [
    {
      id: 123,
      title: '凍てつく海のアストロノート',
      original_title: 'Frozen Tide',
      release_date: '2026-10-09',
      poster_path: '/abc.jpg',
      overview: '氷の海に取り残された宇宙飛行士。',
      genre_ids: [878, 12, 99999],
    },
    {
      id: 456,
      title: '日付なし',
      original_title: '日付なし',
      release_date: '',
      poster_path: null,
      overview: '',
      genre_ids: [],
    },
  ],
}

function fakeFetch() {
  return vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => Response.json(responseBody))
}

describe('createTmdbProvider', () => {
  it('discover API を日本の公開日レンジで呼び出す', async () => {
    const fetch = fakeFetch()
    const provider = createTmdbProvider({ token: 'secret', fetch })

    await provider.fetchMovies({ from: '2026-09-14', to: '2026-11-26' })

    const [input, init] = fetch.mock.calls[0] ?? []
    const url = new URL(String(input))
    expect(url.pathname).toBe('/3/discover/movie')
    expect(url.searchParams.get('region')).toBe('JP')
    expect(url.searchParams.get('language')).toBe('ja-JP')
    expect(url.searchParams.get('release_date.gte')).toBe('2026-09-14')
    expect(url.searchParams.get('release_date.lte')).toBe('2026-11-26')
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer secret')
  })

  it('TMDB のレスポンスを Movie に変換し、公開日のない作品は除外する', async () => {
    const provider = createTmdbProvider({ token: 'secret', fetch: fakeFetch() })

    const movies = await provider.fetchMovies({ from: '2026-09-14', to: '2026-11-26' })

    expect(movies).toEqual([
      {
        id: 'tmdb-123',
        title: '凍てつく海のアストロノート',
        originalTitle: 'Frozen Tide',
        releaseDate: '2026-10-09',
        genres: ['SF', 'アドベンチャー'],
        poster: 'https://image.tmdb.org/t/p/w500/abc.jpg',
        synopsis: '氷の海に取り残された宇宙飛行士。',
        source: 'tmdb',
      },
    ])
  })

  it('HTTP エラー時は例外を投げる', async () => {
    const fetch = vi.fn(async () => new Response('unauthorized', { status: 401 }))
    const provider = createTmdbProvider({ token: 'bad', fetch })

    await expect(provider.fetchMovies({ from: '2026-09-14', to: '2026-11-26' })).rejects.toThrow(/401/)
  })
})
