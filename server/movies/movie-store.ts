import { sql } from 'drizzle-orm'
import type { Movie } from '@/lib/types'
import type { Database } from '@/server/db/client'
import { movies } from '@/server/db/schema'

/** 衝突時に上書きするカラム（id 以外すべて）。値は INSERT 側の行を参照する */
const OVERWRITE_ON_CONFLICT = {
  title: sql`excluded.title`,
  originalTitle: sql`excluded.original_title`,
  releaseDate: sql`excluded.release_date`,
  runtime: sql`excluded.runtime`,
  genres: sql`excluded.genres`,
  poster: sql`excluded.poster`,
  distributor: sql`excluded.distributor`,
  synopsis: sql`excluded.synopsis`,
  source: sql`excluded.source`,
}

function toRow(movie: Movie) {
  return {
    ...movie,
    originalTitle: movie.originalTitle ?? null,
    runtime: movie.runtime ?? null,
    distributor: movie.distributor ?? null,
  }
}

/**
 * movies テーブルに作品を upsert する（id が主キー）。削除はしないので過去の作品は残る。
 * 同じ id が複数含まれる場合は ON CONFLICT が同一文中で衝突するため、後ろの要素を優先して重複を除く。
 */
export async function upsertMovies(db: Database, list: Movie[]): Promise<number> {
  const unique = [...new Map(list.map((movie) => [movie.id, movie])).values()]
  if (unique.length === 0) return 0
  await db
    .insert(movies)
    .values(unique.map(toRow))
    .onConflictDoUpdate({ target: movies.id, set: OVERWRITE_ON_CONFLICT })
  return unique.length
}
