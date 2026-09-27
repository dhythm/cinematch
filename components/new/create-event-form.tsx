'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateEvent } from '@/lib/api/queries'
import { addDays, diffDays, formatMonthDay, isOffDay, SLOT_LABELS, SLOT_ORDER, weekday } from '@/lib/date'
import { rememberEvent } from '@/lib/my-events'
import type { Movie, TimeSlot } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CandidateCalendar } from './candidate-calendar'
import { SlotPicker } from './slot-picker'

const RANGE_OPTIONS = [
  { days: 7, label: '1週間' },
  { days: 14, label: '2週間' },
] as const

function defaultDates(release: string, days: number) {
  return Array.from({ length: days }, (_, i) => addDays(release, i)).filter((d, i) => i === 0 || isOffDay(d))
}

export function CreateEventForm({ movie }: { movie: Movie }) {
  const router = useRouter()
  const [rangeDays, setRangeDays] = useState<number>(14)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(defaultDates(movie.releaseDate, 14)))
  const [slots, setSlots] = useState<Set<TimeSlot>>(() => new Set<TimeSlot>(['noon', 'evening']))
  const [title, setTitle] = useState(`『${movie.title}』を観に行く会`)
  const [organizer, setOrganizer] = useState('')
  const [deadline, setDeadline] = useState(() => addDays(movie.releaseDate, -4))
  const [memo, setMemo] = useState('')
  const createEvent = useCreateEvent()

  const activeDates = useMemo(
    () =>
      [...selected]
        .filter((d) => {
          const diff = diffDays(movie.releaseDate, d)
          return diff >= 0 && diff < rangeDays
        })
        .sort(),
    [selected, movie.releaseDate, rangeDays],
  )

  const orderedSlots = SLOT_ORDER.filter((s) => slots.has(s))
  const candidateCount = activeDates.length * orderedSlots.length

  function toggleDate(iso: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(iso)) next.delete(iso)
      else next.add(iso)
      return next
    })
  }

  function toggleSlot(slot: TimeSlot) {
    setSlots((prev) => {
      const next = new Set(prev)
      if (next.has(slot)) next.delete(slot)
      else next.add(slot)
      return next
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (candidateCount === 0) {
      toast.error('候補日と時間帯を1つ以上選んでください')
      return
    }
    createEvent.mutate(
      {
        movieId: movie.id,
        title,
        organizer,
        memo,
        deadline: deadline || undefined,
        dates: activeDates,
        slots: orderedSlots,
      },
      {
        onSuccess: (event) => {
          rememberEvent(event.id)
          toast.success('イベントをつくりました', { description: 'URLを仲間に共有しましょう' })
          router.push(`/e/${event.id}`)
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      <fieldset className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <legend className="text-lg font-black">候補日</legend>
            <p className="text-sm text-muted-foreground">公開日からの期間を選び、行けそうな日をタップ</p>
          </div>
          <div role="radiogroup" aria-label="候補日の期間" className="inline-flex rounded-lg bg-muted p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                role="radio"
                aria-checked={rangeDays === opt.days}
                onClick={() => setRangeDays(opt.days)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors',
                  rangeDays === opt.days && 'bg-card text-foreground shadow-sm',
                )}
              >
                {`公開から${opt.label}`}
              </button>
            ))}
          </div>
        </div>

        <CandidateCalendar
          releaseDate={movie.releaseDate}
          rangeDays={rangeDays}
          selected={selected}
          onToggle={toggleDate}
        />

        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSelected(new Set(defaultDates(movie.releaseDate, rangeDays)))}
            className="rounded-full border border-border bg-card px-3 py-1.5 hover:border-primary"
          >
            公開日＋土日祝
          </button>
          <button
            type="button"
            onClick={() =>
              setSelected(new Set(Array.from({ length: rangeDays }, (_, i) => addDays(movie.releaseDate, i))))
            }
            className="rounded-full border border-border bg-card px-3 py-1.5 hover:border-primary"
          >
            全日選択
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="rounded-full border border-border bg-card px-3 py-1.5 hover:border-primary"
          >
            クリア
          </button>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <legend className="text-lg font-black">時間帯</legend>
          <p className="text-sm text-muted-foreground">選んだ日すべてに、以下の時間帯で候補を作ります</p>
        </div>
        <SlotPicker selected={slots} onToggle={toggleSlot} />
      </fieldset>

      <section
        aria-labelledby="preview-title"
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="flex items-baseline justify-between">
          <h2 id="preview-title" className="font-bold">
            候補プレビュー
          </h2>
          <p className="font-mono text-sm">
            <span className="text-2xl font-medium">{candidateCount}</span>
            <span className="text-muted-foreground"> 枠</span>
          </p>
        </div>
        {candidateCount === 0 ? (
          <p className="text-sm text-muted-foreground">日付と時間帯を選ぶとここに候補が並びます</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {activeDates.flatMap((d) =>
              orderedSlots.map((s) => (
                <li key={`${d}-${s}`} className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                  {`${formatMonthDay(d)}(${weekday(d)}) ${SLOT_LABELS[s].label}`}
                </li>
              )),
            )}
          </ul>
        )}
      </section>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-4 text-lg font-black">イベント情報</legend>
        <div className="flex flex-col gap-2">
          <Label htmlFor="event-title">イベント名</Label>
          <Input
            id="event-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="h-11 bg-card"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="organizer">幹事の名前</Label>
            <Input
              id="organizer"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              placeholder="例：はるか"
              maxLength={20}
              className="h-11 bg-card"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="deadline">回答締切</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-11 bg-card font-mono"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="memo">メモ（任意）</Label>
          <Textarea
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={500}
            placeholder="例：IMAXで観たい！決まったら幹事がまとめて予約します"
            className="min-h-24 bg-card"
          />
        </div>
      </fieldset>

      <div className="sticky bottom-4 z-20">
        <Button
          type="submit"
          disabled={createEvent.isPending || createEvent.isSuccess}
          className="h-12 w-full rounded-xl text-base font-bold shadow-lg"
        >
          {createEvent.isPending || createEvent.isSuccess ? '作成中…' : `${candidateCount}枠でイベントをつくる`}
        </Button>
      </div>
    </form>
  )
}
