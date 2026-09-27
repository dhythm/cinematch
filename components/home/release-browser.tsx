'use client'

import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { moviesQuery } from '@/lib/api/queries'
import { formatJaDate } from '@/lib/date'
import type { Movie } from '@/lib/types'
import { MovieCard } from './movie-card'

const NO_MOVIES: Movie[] = []

export function ReleaseBrowser() {
  const { data: movies = NO_MOVIES, isPending, isError } = useQuery(moviesQuery())
  const [query, setQuery] = useState('')

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = movies.filter((m) => {
      if (!q) return true
      return (
        m.title.toLowerCase().includes(q) ||
        m.originalTitle?.toLowerCase().includes(q) ||
        m.genres.some((g) => g.includes(q))
      )
    })
    const map = new Map<string, Movie[]>()
    for (const m of filtered.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))) {
      map.set(m.releaseDate, [...(map.get(m.releaseDate) ?? []), m])
    }
    return [...map.entries()]
  }, [movies, query])

  return (
    <section id="releases" aria-labelledby="releases-title" className="flex scroll-mt-20 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="releases-title" className="text-2xl font-black tracking-tight">
          公開予定の映画
        </h2>
        <p className="text-sm text-muted-foreground">{'作品を選んで「日程を調整する」から候補日を作成できます'}</p>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <label htmlFor="movie-search" className="sr-only">
          作品名・ジャンルで検索
        </label>
        <Input
          id="movie-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="作品名・ジャンルで検索"
          className="h-11 bg-card pl-9"
        />
      </div>

      {isPending ? (
        <p className="py-12 text-center text-sm text-muted-foreground">読み込み中…</p>
      ) : isError ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-destructive">
          作品一覧を取得できませんでした
        </p>
      ) : grouped.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          該当する作品が見つかりませんでした
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {grouped.map(([date, list]) => (
            <div key={date} className="flex flex-col gap-4">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
                <time dateTime={date}>{formatJaDate(date)}</time>
                <span className="text-muted-foreground">公開</span>
                <span className="h-px flex-1 bg-border" aria-hidden />
              </h3>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((movie) => (
                  <li key={movie.id}>
                    <MovieCard movie={movie} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
