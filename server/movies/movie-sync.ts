import type { Movie } from '@/lib/types'
import type { Database } from '@/server/db/client'
import { catalogRange, type DateRange, type MovieProvider } from './movie-catalog'
import { upsertMovies } from './movie-store'
import { createTmdbProvider } from './tmdb-provider'

type ProviderFailure = { provider: string; error: unknown }

export type SyncResult = {
  /** 実際に取りに行ったプロバイダ名。空なら取り込み元が設定されていない（TMDB_API_TOKEN の設定漏れ） */
  providers: string[]
  /** DB に upsert した件数 */
  saved: number
  /** 取得に失敗したプロバイダ。呼び出し側がログや終了コードに使う */
  failures: ProviderFailure[]
}

type Options = {
  db: Database
  providers: MovieProvider[]
  range: DateRange
}

/**
 * 外部プロバイダ（TMDB など）から作品を取得し、movies テーブルに保存する。
 * プロバイダ単位で失敗を切り離すので、1 つが落ちても残りは保存される。
 * 冪等なので、シード時・cron ジョブから何度実行してもよい。
 */
export async function syncMovies({ db, providers, range }: Options): Promise<SyncResult> {
  const results = await Promise.allSettled(providers.map((provider) => provider.fetchMovies(range)))
  const failures: ProviderFailure[] = []
  const fetched: Movie[] = results.flatMap((result, i) => {
    if (result.status === 'fulfilled') return result.value
    failures.push({ provider: providers[i]?.name ?? String(i), error: result.reason })
    return []
  })
  // プロバイダが範囲外を返すことがある（TMDB の discover は日本以外の公開日で絞ることがある）
  const inRange = fetched.filter((movie) => movie.releaseDate >= range.from && movie.releaseDate <= range.to)
  return { providers: providers.map((provider) => provider.name), saved: await upsertMovies(db, inRange), failures }
}

/** TMDB_API_TOKEN を参照する */
type Env = Record<string, string | undefined>

/** DB に取り込む外部データソース。トークンが設定されていないソースは使わない */
export function externalMovieProviders(env: Env): MovieProvider[] {
  return env.TMDB_API_TOKEN ? [createTmdbProvider({ token: env.TMDB_API_TOKEN })] : []
}

type SyncExternalOptions = {
  db: Database
  env: Env
  today: () => string
  /** 省略時は env から組み立てる（テスト用の差し替え口） */
  providers?: MovieProvider[]
}

/** 環境変数で有効になっている外部ソースを、カタログと同じ公開日範囲で取り込む */
export function syncExternalMovies({ db, env, today, providers }: SyncExternalOptions): Promise<SyncResult> {
  return syncMovies({ db, providers: providers ?? externalMovieProviders(env), range: catalogRange(today()) })
}
