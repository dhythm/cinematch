'use client'

import { Pencil } from 'lucide-react'
import { ANSWER_SYMBOL, dayOfWeek, formatMonthDay, HOLIDAYS, SLOT_LABELS, weekday } from '@/lib/date'
import type { Answer, Candidate, CandidateTally, Participant } from '@/lib/types'
import { cn } from '@/lib/utils'

const ANSWER_STYLE: Record<Answer, string> = {
  yes: 'text-primary font-black',
  maybe: 'text-muted-foreground font-bold',
  no: 'text-destructive/70',
}

type Props = {
  candidates: Candidate[]
  participants: Participant[]
  tallies: Record<string, CandidateTally>
  bestId?: string
  decidedId?: string
  onEdit: (id: string) => void
  onDecide: (id: string) => void
}

export function AnswerTable({ candidates, participants, tallies, bestId, decidedId, onEdit, onDecide }: Props) {
  const highlightId = decidedId ?? bestId
  const comments = participants.filter((p) => p.comment)

  return (
    <section id="answers" aria-labelledby="answers-title" className="flex scroll-mt-20 flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="answers-title" className="text-lg font-black">
          回答状況
        </h2>
        <p className="text-sm text-muted-foreground">{`${participants.length}人が回答`}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-bold">
                日程
              </th>
              <th scope="col" className="px-2 py-2 text-center font-mono text-xs font-medium text-muted-foreground">
                {'○/△/×'}
              </th>
              {participants.map((p) => (
                <th key={p.id} scope="col" className="min-w-16 px-2 py-2 text-center font-bold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onEdit(p.id)}
                    disabled={!!decidedId}
                    className="group inline-flex items-center gap-1 rounded px-1 hover:bg-muted disabled:hover:bg-transparent"
                    aria-label={`${p.name}さんの回答を編集`}
                  >
                    {p.name}
                    {!decidedId && (
                      <Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100" aria-hidden />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const t = tallies[c.id] ?? { yes: 0, maybe: 0, no: 0 }
              const highlighted = c.id === highlightId
              const dow = dayOfWeek(c.date)
              const red = dow === 0 || c.date in HOLIDAYS
              return (
                <tr key={c.id} className={cn('border-b border-border last:border-b-0', highlighted && 'bg-accent/35')}>
                  <th
                    scope="row"
                    className={cn(
                      'sticky left-0 z-10 px-3 py-2.5 text-left font-medium whitespace-nowrap',
                      highlighted ? 'bg-accent' : 'bg-card',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onDecide(c.id)}
                      disabled={!!decidedId}
                      className="flex items-baseline gap-1.5 text-left disabled:cursor-default"
                      aria-label={`${formatMonthDay(c.date)} ${SLOT_LABELS[c.slot].label}に決定`}
                      title={decidedId ? undefined : 'クリックでこの回に決定'}
                    >
                      <span className="font-mono">{formatMonthDay(c.date)}</span>
                      <span
                        className={cn(
                          'text-xs',
                          red ? 'text-destructive' : dow === 6 ? 'text-primary' : 'text-muted-foreground',
                        )}
                      >
                        {`(${weekday(c.date)})`}
                      </span>
                      <span className="font-bold">{SLOT_LABELS[c.slot].label}</span>
                    </button>
                  </th>
                  <td className="px-2 py-2.5 text-center font-mono text-xs whitespace-nowrap">
                    <span className="font-medium text-primary">{t.yes}</span>
                    <span className="text-muted-foreground">{` / ${t.maybe} / ${t.no}`}</span>
                  </td>
                  {participants.map((p) => {
                    const a = p.answers[c.id]
                    return (
                      <td key={p.id} className={cn('px-2 py-2.5 text-center text-base', a && ANSWER_STYLE[a])}>
                        {a ? ANSWER_SYMBOL[a] : <span className="text-muted-foreground/40">-</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {comments.length > 0 && (
        <ul className="flex flex-col gap-2">
          {comments.map((p) => (
            <li key={p.id} className="flex gap-2 text-sm">
              <span className="shrink-0 font-bold">{p.name}</span>
              <span className="text-muted-foreground">{p.comment}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
