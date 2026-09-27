import { addDays } from '@/lib/date'
import type { Movie } from '@/lib/types'
import { SCHEDULE_WINDOW_DAYS } from '@/server/domain/schedule'

export type DateRange = { from: string; to: string }

export type MovieProvider = {
  name: string
  fetchMovies: (range: DateRange) => Promise<Movie[]>
}

/** 何日先に公開される作品まで一覧に出すか */
const LOOKAHEAD_DAYS = 60
// 読み先は DB（外部 API は movie-sync が取り込む）なので、取り込み結果がすぐ反映される短い TTL にする
const DEFAULT_TTL_MS = 60 * 1000

/** 一覧に出す公開日の範囲。取り込み（movie-sync）もこの範囲に合わせる */
export function catalogRange(today: string): DateRange {
  // 公開済みでも調整期間内の作品は選べるようにする
  return { from: addDays(today, -(SCHEDULE_WINDOW_DAYS - 1)), to: addDays(today, LOOKAHEAD_DAYS) }
}

type Options = {
  providers: MovieProvider[]
  today: () => string
  now?: () => number
  ttlMs?: number
  onError?: (providerName: string, error: unknown) => void
}

export type MovieCatalog = ReturnType<typeof createMovieCatalog>

export function createMovieCatalog({
  providers,
  today,
  now = Date.now,
  ttlMs = DEFAULT_TTL_MS,
  onError = (providerName, error) => console.error(`[movie-catalog] ${providerName} failed`, error),
}: Options) {
  let cache: { movies: Movie[]; fetchedAt: number; range: DateRange } | undefined

  async function refresh(range: DateRange) {
    const results = await Promise.allSettled(providers.map((provider) => provider.fetchMovies(range)))
    const movies = results.flatMap((result, i) => {
      if (result.status === 'fulfilled') return result.value
      onError(providers[i]?.name ?? String(i), result.reason)
      return []
    })
    return movies
      .filter((movie) => movie.releaseDate >= range.from && movie.releaseDate <= range.to)
      .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate) || a.title.localeCompare(b.title))
  }

  async function list() {
    const range = catalogRange(today())
    const fresh = cache && now() - cache.fetchedAt < ttlMs && cache.range.from === range.from
    if (!fresh) {
      cache = { movies: await refresh(range), fetchedAt: now(), range }
    }
    return cache?.movies ?? []
  }

  async function get(id: string) {
    return (await list()).find((movie) => movie.id === id)
  }

  return { list, get }
}
