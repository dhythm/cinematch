'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { MovieTicket } from '@/components/shared/movie-ticket'
import { eventQuery } from '@/lib/api/queries'
import { formatJaDate } from '@/lib/date'
import { rememberEvent } from '@/lib/my-events'
import { EventBoard } from './event-board'

export function EventScreen({ id }: { id: string }) {
  const { data: event } = useQuery(eventQuery(id))

  useEffect(() => {
    rememberEvent(id)
  }, [id])

  if (!event) return null

  return (
    <>
      <MovieTicket movie={event.movie}>
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
      <EventBoard event={event} />
    </>
  )
}
