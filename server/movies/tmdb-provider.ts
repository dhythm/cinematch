import type { Movie } from '@/lib/types'
import type { DateRange, MovieProvider } from './movie-catalog'

const API_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const MAX_PAGES = 3

/** https://developer.themoviedb.org/reference/genre-movie-list */
const GENRES: Record<number, string> = {
  28: 'アクション',
  12: 'アドベンチャー',
  16: 'アニメ',
  35: 'コメディ',
  80: '犯罪',
  99: 'ドキュメンタリー',
  18: 'ドラマ',
  10751: 'ファミリー',
  14: 'ファンタジー',
  36: '歴史',
  27: 'ホラー',
  10402: '音楽',
  9648: 'ミステリー',
  10749: 'ロマンス',
  878: 'SF',
  10770: 'TV映画',
  53: 'スリラー',
  10752: '戦争',
  37: '西部劇',
}

type TmdbMovie = {
  id: number
  title: string
  original_title: string
  release_date: string
  poster_path: string | null
  overview: string
  genre_ids: number[]
}

type TmdbPage = { page: number; total_pages: number; results: TmdbMovie[] }

function toMovie(movie: TmdbMovie): Movie {
  return {
    id: `tmdb-${movie.id}`,
    title: movie.title,
    originalTitle: movie.original_title !== movie.title ? movie.original_title : undefined,
    releaseDate: movie.release_date,
    genres: movie.genre_ids.flatMap((id) => GENRES[id] ?? []),
    poster: movie.poster_path ? `${IMAGE_BASE}${movie.poster_path}` : '/placeholder.svg',
    synopsis: movie.overview,
    source: 'tmdb',
  }
}

type Options = { token: string; fetch?: typeof globalThis.fetch }

export function createTmdbProvider({ token, fetch = globalThis.fetch }: Options): MovieProvider {
  async function fetchPage(range: DateRange, page: number): Promise<TmdbPage> {
    const url = new URL(`${API_BASE}/discover/movie`)
    url.search = new URLSearchParams({
      region: 'JP',
      language: 'ja-JP',
      // 2: 限定公開, 3: 劇場公開
      with_release_type: '2|3',
      'release_date.gte': range.from,
      'release_date.lte': range.to,
      sort_by: 'popularity.desc',
      page: String(page),
    }).toString()
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' } })
    if (!response.ok) throw new Error(`TMDB request failed: ${response.status}`)
    return (await response.json()) as TmdbPage
  }

  return {
    name: 'tmdb',
    async fetchMovies(range) {
      const first = await fetchPage(range, 1)
      const rest = await Promise.all(
        Array.from({ length: Math.min(first.total_pages, MAX_PAGES) - 1 }, (_, i) => fetchPage(range, i + 2)),
      )
      return [first, ...rest].flatMap((page) => page.results.filter((m) => m.release_date).map(toMovie))
    },
  }
}
