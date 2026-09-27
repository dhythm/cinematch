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
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000

type Options = {
  providers: MovieProvider[]
  today: () => string
  now?: () => number
  ttlMs?: number
  onError?: (provider: MovieProvider, error: unknown) => void
}

export type MovieCatalog = ReturnType<typeof createMovieCatalog>

export function createMovieCatalog({
  providers,
  today,
  now = Date.now,
  ttlMs = DEFAULT_TTL_MS,
  onError = (provider, error) => console.error(`[movie-catalog] ${provider.name} failed`, error),
}: Options) {
  let cache: { movies: Movie[]; fetchedAt: number; range: DateRange } | undefined

  function currentRange(): DateRange {
    const base = today()
    // 公開済みでも調整期間内の作品は選べるようにする
    return { from: addDays(base, -(SCHEDULE_WINDOW_DAYS - 1)), to: addDays(base, LOOKAHEAD_DAYS) }
  }

  async function refresh(range: DateRange) {
    const results = await Promise.allSettled(providers.map((provider) => provider.fetchMovies(range)))
    const movies = results.flatMap((result, i) => {
      if (result.status === 'fulfilled') return result.value
      const provider = providers[i]
      if (provider) onError(provider, result.reason)
      return []
    })
    return movies
      .filter((movie) => movie.releaseDate >= range.from && movie.releaseDate <= range.to)
      .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate) || a.title.localeCompare(b.title))
  }

  async function list() {
    const range = currentRange()
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
