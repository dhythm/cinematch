'use client'

import { useQuery } from '@tanstack/react-query'
import { MovieTicket } from '@/components/shared/movie-ticket'
import { moviesQuery } from '@/lib/api/queries'
import { CreateEventForm } from './create-event-form'

export function NewEventScreen({ movieId }: { movieId?: string }) {
  const { data: movies, isPending } = useQuery(moviesQuery())
  const movie = movies?.find((m) => m.id === movieId)

  if (isPending) return <p className="text-sm text-muted-foreground">読み込み中…</p>
  if (!movie) {
    return (
      <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        作品が見つかりませんでした
      </p>
    )
  }

  return (
    <>
      <MovieTicket movie={movie}>
        <p className="line-clamp-2 text-sm leading-relaxed text-primary-foreground/75">{movie.synopsis}</p>
      </MovieTicket>
      <CreateEventForm movie={movie} />
    </>
  )
}
