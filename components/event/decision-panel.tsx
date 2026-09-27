'use client'

import { CalendarPlus, ExternalLink, RotateCcw, Sparkles } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { SLOT_LABELS, formatJaDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { Candidate, Movie } from '@/lib/types'

type Best = { candidate: Candidate; yes: number; maybe: number; no: number } | undefined

type Props = {
  movie: Movie
  candidates: Candidate[]
  best: Best
  total: number
  decidedId?: string
  onDecide: (id: string) => void
  onReopen: () => void
}

function candidateLabel(c: Candidate) {
  return `${formatJaDate(c.date)} ${SLOT_LABELS[c.slot].label}`
}

export function DecisionPanel({ movie, candidates, best, total, decidedId, onDecide, onReopen }: Props) {
  const decided = candidates.find((c) => c.id === decidedId)

  if (decided) {
    return (
      <section aria-labelledby="decided-title" className="flex flex-col gap-4 rounded-2xl bg-accent p-5 text-accent-foreground">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-xs tracking-widest uppercase">Decided</p>
          <h2 id="decided-title" className="text-2xl font-black">
            {candidateLabel(decided)}
          </h2>
          <p className="font-mono text-sm">{`${SLOT_LABELS[decided.slot].time} ・ ${movie.runtime}分`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://eiga.com/search/${encodeURIComponent(movie.title)}/`}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants(), 'h-10')}
          >
            <ExternalLink aria-hidden />
            上映館を探して予約
          </a>
          <Button type="button" variant="outline" className="h-10 border-primary/30 bg-transparent">
            <CalendarPlus aria-hidden />
            カレンダーに追加
          </Button>
          <Button type="button" variant="ghost" className="h-10" onClick={onReopen}>
            <RotateCcw aria-hidden />
            調整を再開
          </Button>
        </div>
      </section>
    )
  }

  if (!best || total === 0) {
    return (
      <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
        まだ回答がありません。URLを共有して、みんなの都合を集めましょう。
      </p>
    )
  }

  return (
    <section aria-labelledby="best-title" className="flex flex-col gap-4 rounded-2xl border-2 border-primary bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <Sparkles className="size-3.5 text-accent-foreground" aria-hidden />
          {'いちばん集まりそうな回'}
        </p>
        <h2 id="best-title" className="text-xl font-black">
          {candidateLabel(best.candidate)}
        </h2>
        <p className="font-mono text-sm text-muted-foreground">
          {`○ ${best.yes}  △ ${best.maybe}  × ${best.no}`}
          <span className="ml-2 font-sans">{`（${total}人中）`}</span>
        </p>
      </div>
      <Button type="button" className="h-11 px-6 font-bold" onClick={() => onDecide(best.candidate.id)}>
        この回に決定する
      </Button>
    </section>
  )
}
