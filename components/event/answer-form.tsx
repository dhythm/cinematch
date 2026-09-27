'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ANSWER_SYMBOL, formatJaDate, SLOT_LABELS } from '@/lib/date'
import type { Answer, Candidate, Participant } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { SaveParticipantInput } from '@/server/events/event-service'

const OPTIONS: { value: Answer; label: string; active: string }[] = [
  { value: 'yes', label: '行ける', active: 'bg-primary text-primary-foreground border-primary' },
  { value: 'maybe', label: '微妙', active: 'bg-accent text-accent-foreground border-accent' },
  { value: 'no', label: '無理', active: 'bg-muted text-foreground border-foreground/30' },
]

type Props = {
  candidates: Candidate[]
  initial?: Participant
  pending?: boolean
  onSave: (input: SaveParticipantInput) => void
  onCancel?: () => void
  onDelete?: () => void
}

export function AnswerForm({ candidates, initial, pending = false, onSave, onCancel, onDelete }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [comment, setComment] = useState(initial?.comment ?? '')
  const [answers, setAnswers] = useState<Record<string, Answer>>(initial?.answers ?? {})

  const answeredCount = candidates.filter((c) => answers[c.id]).length

  function setAll(value: Answer) {
    setAnswers(Object.fromEntries(candidates.map((c) => [c.id, value])))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      id: initial?.id,
      name: name.trim(),
      comment: comment.trim() || undefined,
      answers,
    })
  }

  return (
    <section id="answer-form" aria-labelledby="answer-form-title" className="flex scroll-mt-20 flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 id="answer-form-title" className="text-lg font-black">
          {initial ? `${initial.name}さんの回答を編集` : '出欠を回答する'}
        </h2>
        <p className="font-mono text-sm text-muted-foreground">{`${answeredCount}/${candidates.length}`}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="participant-name">名前</Label>
          <Input
            id="participant-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：ゆうき"
            required
            maxLength={20}
            className="h-11"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" id="answers-label">
              候補ごとの都合
            </p>
            <div className="flex gap-1 text-xs">
              <span className="text-muted-foreground">まとめて:</span>
              {OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setAll(o.value)}
                  className="rounded px-1.5 font-bold hover:bg-muted"
                  aria-label={`すべて${o.label}にする`}
                >
                  {ANSWER_SYMBOL[o.value]}
                </button>
              ))}
            </div>
          </div>

          <ul
            className="flex flex-col divide-y divide-border rounded-xl border border-border"
            aria-labelledby="answers-label"
          >
            {candidates.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{formatJaDate(c.date)}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {`${SLOT_LABELS[c.slot].label} ${SLOT_LABELS[c.slot].time}`}
                  </span>
                </span>
                <div
                  role="radiogroup"
                  aria-label={`${formatJaDate(c.date)} ${SLOT_LABELS[c.slot].label}`}
                  className="flex gap-1"
                >
                  {OPTIONS.map((o) => {
                    const checked = answers[c.id] === o.value
                    return (
                      <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        aria-label={o.label}
                        onClick={() => setAnswers((prev) => ({ ...prev, [c.id]: o.value }))}
                        className={cn(
                          'flex size-10 items-center justify-center rounded-lg border border-border text-lg font-bold transition-colors',
                          checked ? o.active : 'text-muted-foreground hover:border-primary/50',
                        )}
                      >
                        {ANSWER_SYMBOL[o.value]}
                      </button>
                    )
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="participant-comment">コメント（任意）</Label>
          <Textarea
            id="participant-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="例：レイトショーなら平日でもOK"
            className="min-h-20"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={onDelete}
              disabled={pending}
              className="h-11 text-destructive sm:mr-auto"
            >
              回答を削除
            </Button>
          )}
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} className="h-11">
              キャンセル
            </Button>
          )}
          <Button type="submit" className="h-11 px-8 font-bold" disabled={!name.trim() || pending}>
            {initial ? '回答を更新' : '回答する'}
          </Button>
        </div>
      </form>
    </section>
  )
}
