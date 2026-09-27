import type { Metadata } from 'next'
import { EventBoard } from '@/components/event/event-board'
import { MovieTicket } from '@/components/shared/movie-ticket'
import { DEMO_EVENT, MOVIES, getMovie } from '@/lib/mock-data'
import { formatJaDate } from '@/lib/date'

export const metadata: Metadata = {
  title: `${DEMO_EVENT.title} | しねまっち`,
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  await params
  const event = DEMO_EVENT
  const movie = getMovie(event.movieId) ?? MOVIES[0]

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 pt-6 pb-20">
      <MovieTicket movie={movie}>
        <div className="flex flex-col gap-1 border-t border-primary-foreground/15 pt-3">
          <p className="font-bold text-pretty">{event.title}</p>
          {event.deadline && (
            <p className="text-xs text-primary-foreground/70">
              {'回答締切 '}
              <span className="font-mono text-accent">{formatJaDate(event.deadline)}</span>
            </p>
          )}
        </div>
      </MovieTicket>
      <EventBoard event={event} movie={movie} />
    </main>
  )
}
