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

type TmdbPage = { page: number; total_pages: number; results: { id: number }[] }

type TmdbReleaseDate = { release_date: string; type: number }

type TmdbMovieDetails = {
  id: number
  title: string
  original_title: string
  overview: string
  poster_path: string | null
  runtime: number | null
  genres: { id: number }[]
  release_dates: { results: { iso_3166_1: string; release_dates: TmdbReleaseDate[] }[] }
}

/** release_dates の type: 3 = 劇場公開, 2 = 限定公開 */
const THEATRICAL = 3
const LIMITED = 2
const DETAIL_CONCURRENCY = 8

/** 日本の劇場公開日（無ければ限定公開日）を YYYY-MM-DD で返す */
function japaneseReleaseDate(details: TmdbMovieDetails) {
  const dates = details.release_dates.results.find((r) => r.iso_3166_1 === 'JP')?.release_dates ?? []
  const pick = (type: number) =>
    dates
      .filter((d) => d.type === type)
      .map((d) => d.release_date.slice(0, 10))
      .sort()[0]
  return pick(THEATRICAL) ?? pick(LIMITED)
}

function toMovie(details: TmdbMovieDetails, releaseDate: string): Movie {
  return {
    id: `tmdb-${details.id}`,
    title: details.title,
    originalTitle: details.original_title !== details.title ? details.original_title : undefined,
    releaseDate,
    runtime: details.runtime || undefined,
    genres: details.genres.flatMap(({ id }) => GENRES[id] ?? []),
    poster: details.poster_path ? `${IMAGE_BASE}${details.poster_path}` : '/placeholder.svg',
    synopsis: details.overview,
    source: 'tmdb',
  }
}

/** 同時実行数を制限して map する（TMDB のレート制限対策） */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index] as T)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

type Options = { token: string; fetch?: typeof globalThis.fetch }

export function createTmdbProvider({ token, fetch = globalThis.fetch }: Options): MovieProvider {
  async function get<T>(url: URL): Promise<T> {
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' } })
    if (!response.ok) throw new Error(`TMDB request failed: ${response.status} ${url.pathname}`)
    return (await response.json()) as T
  }

  function fetchDetails(id: number) {
    const url = new URL(`${API_BASE}/movie/${id}`)
    url.search = new URLSearchParams({ language: 'ja-JP', append_to_response: 'release_dates' }).toString()
    return get<TmdbMovieDetails>(url)
  }

  function fetchPage(range: DateRange, page: number) {
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
    return get<TmdbPage>(url)
  }

  return {
    name: 'tmdb',
    async fetchMovies(range) {
      const first = await fetchPage(range, 1)
      const rest = await Promise.all(
        Array.from({ length: Math.min(first.total_pages, MAX_PAGES) - 1 }, (_, i) => fetchPage(range, i + 2)),
      )
      // discover の release_date は日本以外の公開日のことがあるので、作品詳細の release_dates で日本の公開日を取り直す
      const ids = [...new Set([first, ...rest].flatMap((page) => page.results.map((m) => m.id)))]
      const movies = await mapWithConcurrency(ids, DETAIL_CONCURRENCY, async (id) => {
        const details = await fetchDetails(id)
        const releaseDate = japaneseReleaseDate(details)
        return releaseDate ? toMovie(details, releaseDate) : undefined
      })
      return movies.filter((movie): movie is Movie => movie !== undefined)
    },
  }
}
