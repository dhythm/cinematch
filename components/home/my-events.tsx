import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, Users } from 'lucide-react'
import { MY_EVENTS } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import type { Movie } from '@/lib/types'

export function MyEvents({ events, movies }: { events: typeof MY_EVENTS; movies: Movie[] }) {
  return (
    <section id="my-events" aria-labelledby="my-events-title" className="flex scroll-mt-20 flex-col gap-4">
      <h2 id="my-events-title" className="text-2xl font-black tracking-tight">
        マイ調整
      </h2>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {events.map((event, i) => {
          const movie = movies.find((m) => m.id === event.movieId)
          const decided = event.status === 'decided'
          return (
            <li key={`${event.id}-${i}`}>
              <Link href={`/e/${event.id}`} className="flex items-center gap-4 p-3 transition-colors hover:bg-muted/60">
                <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-muted">
                  {movie && <Image src={movie.poster || '/placeholder.svg'} alt="" fill sizes="44px" className="object-cover" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate font-bold">{event.title}</p>
                  <p className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" aria-hidden />
                      {`${event.respondents}人回答`}
                    </span>
                    {decided && <span className="font-mono">{event.decidedLabel}</span>}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold',
                    decided ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground',
                  )}
                >
                  {decided ? '決定' : '調整中'}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
