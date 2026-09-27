'use client'

import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { eventSummariesQuery } from '@/lib/api/queries'
import { formatJaDate, SLOT_LABELS } from '@/lib/date'
import { useMyEventIds } from '@/lib/my-events'
import { cn } from '@/lib/utils'

export function MyEvents() {
  const ids = useMyEventIds()
  const { data: events = [] } = useQuery(eventSummariesQuery(ids))

  // ログインが無く端末ごとに別の履歴になるので、空のときは何も出さない
  // （別の端末で「自分のイベントが消えた」と受け取られないようにする）
  if (events.length === 0) return null

  return (
    <section id="my-events" aria-labelledby="my-events-title" className="flex scroll-mt-20 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="my-events-title" className="text-2xl font-black tracking-tight">
          最近ひらいたイベント
        </h2>
        <p className="text-sm text-muted-foreground">このブラウザに保存しています。ほかの端末では表示されません</p>
      </div>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {events.map((event) => {
          const decided = event.decidedCandidate
          return (
            <li key={event.id}>
              <Link href={`/e/${event.id}`} className="flex items-center gap-4 p-3 transition-colors hover:bg-muted/60">
                <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-muted">
                  <Image src={event.poster || '/placeholder.svg'} alt="" fill sizes="44px" className="object-cover" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="flex items-center gap-2 font-bold">
                    <span className="truncate">{event.title}</span>
                    {event.isOrganizer && (
                      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">
                        幹事
                      </span>
                    )}
                  </p>
                  <p className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" aria-hidden />
                      {`${event.respondentCount}人回答`}
                    </span>
                    {decided && (
                      <span className="font-mono">{`${formatJaDate(decided.date)} ${SLOT_LABELS[decided.slot].label}`}</span>
                    )}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold',
                    decided ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground',
                  )}
                >
                  {decided ? '決定' : '日程きめ中'}
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
