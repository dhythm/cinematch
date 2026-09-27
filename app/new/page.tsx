import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { CreateEventForm } from '@/components/new/create-event-form'
import { MovieTicket } from '@/components/shared/movie-ticket'
import { MOVIES, getMovie } from '@/lib/mock-data'

export const metadata: Metadata = {
  title: '日程調整をつくる | しねまっち',
}

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ movie?: string }>
}) {
  const { movie: movieId } = await searchParams
  const movie = getMovie(movieId) ?? MOVIES[1]

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 pt-6 pb-20">
      <Link href="/#releases" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden />
        作品を選び直す
      </Link>
      <MovieTicket movie={movie}>
        <p className="line-clamp-2 text-sm leading-relaxed text-primary-foreground/75">{movie.synopsis}</p>
      </MovieTicket>
      <CreateEventForm movie={movie} />
    </main>
  )
}
