import { and, asc, gte, lte } from 'drizzle-orm'
import type { Movie } from '@/lib/types'
import type { Database } from '@/server/db/client'
import { movies } from '@/server/db/schema'
import type { MovieProvider } from './movie-catalog'

/** movies テーブル（シードで投入したダミー映画など）から作品を読む */
export function createDatabaseMovieProvider(db: Database): MovieProvider {
  return {
    name: 'database',
    async fetchMovies(range) {
      const rows = await db
        .select()
        .from(movies)
        .where(and(gte(movies.releaseDate, range.from), lte(movies.releaseDate, range.to)))
        .orderBy(asc(movies.releaseDate))
      return rows.map(
        (row): Movie => ({
          id: row.id,
          title: row.title,
          originalTitle: row.originalTitle ?? undefined,
          releaseDate: row.releaseDate,
          runtime: row.runtime ?? undefined,
          genres: row.genres,
          poster: row.poster,
          distributor: row.distributor ?? undefined,
          synopsis: row.synopsis,
          source: row.source,
        }),
      )
    },
  }
}
