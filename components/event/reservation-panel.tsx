'use client'

import { Ticket, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Reservation } from '@/lib/types'
import type { ReserveInput } from '@/server/events/event-service'

type Props = {
  reservation?: Reservation
  defaultReservedBy?: string
  pending: boolean
  onReserve: (input: ReserveInput) => void
  onCancel: () => void
}

export function ReservationPanel({ reservation, defaultReservedBy, pending, onReserve, onCancel }: Props) {
  const [theater, setTheater] = useState('')
  const [showtime, setShowtime] = useState('')
  const [reservedBy, setReservedBy] = useState(defaultReservedBy ?? '')
  const [note, setNote] = useState('')

  if (reservation) {
    return (
      <section
        aria-labelledby="reservation-title"
        className="flex flex-col gap-3 rounded-2xl border-2 border-primary bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
            <Ticket className="size-3.5" aria-hidden />
            予約済み
          </p>
          <h2 id="reservation-title" className="text-lg font-black">
            {[reservation.theater, reservation.showtime].filter(Boolean).join(' ')}
          </h2>
          {(reservation.note || reservation.reservedBy) && (
            <p className="text-sm text-muted-foreground">
              {[reservation.note, reservation.reservedBy && `予約: ${reservation.reservedBy}`]
                .filter(Boolean)
                .join(' ・ ')}
            </p>
          )}
        </div>
        <Button type="button" variant="ghost" className="h-10" onClick={onCancel} disabled={pending}>
          <X aria-hidden />
          予約を取り消す
        </Button>
      </section>
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!theater.trim()) return
    onReserve({
      theater: theater.trim(),
      showtime: showtime || undefined,
      reservedBy: reservedBy.trim() || undefined,
      note: note.trim() || undefined,
    })
  }

  return (
    <section aria-labelledby="reserve-title" className="flex flex-col gap-3">
      <h2 id="reserve-title" className="text-lg font-black">
        予約を記録
      </h2>
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 sm:p-5"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="reservation-theater">劇場</Label>
          <Input
            id="reservation-theater"
            value={theater}
            onChange={(e) => setTheater(e.target.value)}
            placeholder="例：TOHOシネマズ新宿"
            required
            maxLength={100}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reservation-showtime">上映開始</Label>
          <Input
            id="reservation-showtime"
            type="time"
            value={showtime}
            onChange={(e) => setShowtime(e.target.value)}
            className="h-11 font-mono"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reservation-by">予約した人</Label>
          <Input
            id="reservation-by"
            value={reservedBy}
            onChange={(e) => setReservedBy(e.target.value)}
            maxLength={20}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reservation-note">メモ</Label>
          <Input
            id="reservation-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例：J列 4席"
            maxLength={200}
            className="h-11"
          />
        </div>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" className="h-11 px-8 font-bold" disabled={!theater.trim() || pending}>
            予約済みにする
          </Button>
        </div>
      </form>
    </section>
  )
}
