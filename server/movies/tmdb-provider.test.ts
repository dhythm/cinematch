import { describe, expect, it, vi } from 'vitest'
import { createTmdbProvider } from './tmdb-provider'

const discoverBody = {
  page: 1,
  total_pages: 1,
  results: [{ id: 123 }, { id: 456 }, { id: 789 }],
}

const details: Record<number, unknown> = {
  // 日本では海外より遅れて劇場公開（type 3）。限定公開（type 2）より劇場公開を優先する
  123: {
    id: 123,
    title: '凍てつく海のアストロノート',
    original_title: 'Frozen Tide',
    overview: '氷の海に取り残された宇宙飛行士。',
    poster_path: '/abc.jpg',
    runtime: 142,
    genres: [{ id: 878 }, { id: 12 }, { id: 99999 }],
    release_date: '2026-07-01',
    release_dates: {
      results: [
        { iso_3166_1: 'US', release_dates: [{ release_date: '2026-07-01T00:00:00.000Z', type: 3 }] },
        {
          iso_3166_1: 'JP',
          release_dates: [
            { release_date: '2026-10-02T00:00:00.000Z', type: 2 },
            { release_date: '2026-10-09T00:00:00.000Z', type: 3 },
          ],
        },
      ],
    },
  },
  // 日本の劇場公開情報が無い作品は除外
  456: {
    id: 456,
    title: '日本未公開',
    original_title: 'Not in Japan',
    overview: '',
    poster_path: null,
    runtime: 0,
    genres: [],
    release_date: '2026-10-10',
    release_dates: {
      results: [{ iso_3166_1: 'US', release_dates: [{ release_date: '2026-10-10T00:00:00.000Z', type: 3 }] }],
    },
  },
  // 限定公開のみ・上映時間不明
  789: {
    id: 789,
    title: '限定公開作品',
    original_title: '限定公開作品',
    overview: '',
    poster_path: null,
    runtime: 0,
    genres: [],
    release_date: '2026-10-16',
    release_dates: {
      results: [{ iso_3166_1: 'JP', release_dates: [{ release_date: '2026-10-16T00:00:00.000Z', type: 2 }] }],
    },
  },
}

function fakeFetch() {
  return vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = new URL(String(input))
    if (url.pathname === '/3/discover/movie') return Response.json(discoverBody)
    const id = Number(url.pathname.split('/').at(-1))
    return details[id] ? Response.json(details[id]) : new Response('not found', { status: 404 })
  })
}

const range = { from: '2026-09-14', to: '2026-11-26' }

describe('createTmdbProvider', () => {
  it('discover API を日本の公開日レンジで呼び出す', async () => {
    const fetch = fakeFetch()

    await createTmdbProvider({ token: 'secret', fetch }).fetchMovies(range)

    const [input, init] = fetch.mock.calls[0] ?? []
    const url = new URL(String(input))
    expect(url.pathname).toBe('/3/discover/movie')
    expect(url.searchParams.get('region')).toBe('JP')
    expect(url.searchParams.get('language')).toBe('ja-JP')
    expect(url.searchParams.get('release_date.gte')).toBe('2026-09-14')
    expect(url.searchParams.get('release_date.lte')).toBe('2026-11-26')
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer secret')
  })

  it('作品詳細から日本の公開日（劇場公開を優先）と上映時間を取り、日本公開の無い作品は除外する', async () => {
    const fetch = fakeFetch()

    const movies = await createTmdbProvider({ token: 'secret', fetch }).fetchMovies(range)

    const detailUrl = new URL(String(fetch.mock.calls.find(([input]) => String(input).includes('/movie/123'))?.[0]))
    expect(detailUrl.searchParams.get('append_to_response')).toBe('release_dates')
    expect(movies).toEqual([
      {
        id: 'tmdb-123',
        title: '凍てつく海のアストロノート',
        originalTitle: 'Frozen Tide',
        releaseDate: '2026-10-09',
        runtime: 142,
        genres: ['SF', 'アドベンチャー'],
        poster: 'https://image.tmdb.org/t/p/w500/abc.jpg',
        synopsis: '氷の海に取り残された宇宙飛行士。',
        source: 'tmdb',
      },
      {
        id: 'tmdb-789',
        title: '限定公開作品',
        releaseDate: '2026-10-16',
        genres: [],
        poster: '/placeholder.svg',
        synopsis: '',
        source: 'tmdb',
      },
    ])
  })

  it('HTTP エラー時は例外を投げる', async () => {
    const fetch = vi.fn(async () => new Response('unauthorized', { status: 401 }))

    await expect(createTmdbProvider({ token: 'bad', fetch }).fetchMovies(range)).rejects.toThrow(/401/)
  })
})
