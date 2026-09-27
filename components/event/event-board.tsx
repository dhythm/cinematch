'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  useCancelReservation,
  useDecide,
  useDeleteEvent,
  useDeleteParticipant,
  useReopen,
  useReserve,
  useSaveParticipant,
  useUpdateEvent,
} from '@/lib/api/queries'
import type { EventView } from '@/lib/types'
import type { SaveParticipantInput } from '@/server/events/event-service'
import { AnswerForm } from './answer-form'
import { AnswerTable } from './answer-table'
import { DecisionPanel } from './decision-panel'
import { EventSettings } from './event-settings'
import { ReservationPanel } from './reservation-panel'
import { ShareBar } from './share-bar'

const showError = (error: Error) => toast.error(error.message)

export function EventBoard({ event }: { event: EventView }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const saveParticipant = useSaveParticipant(event.id)
  const decide = useDecide(event.id)
  const reopen = useReopen(event.id)
  const deleteParticipant = useDeleteParticipant(event.id)
  const reserve = useReserve(event.id)
  const cancelReservation = useCancelReservation(event.id)
  const updateEvent = useUpdateEvent(event.id)
  const deleteEvent = useDeleteEvent(event.id)
  const router = useRouter()

  const editing = event.participants.find((p) => p.id === editingId)
  const best = event.best && {
    ...event.best,
    candidate: event.candidates.find((c) => c.id === event.best?.candidateId),
  }

  function handleSave(input: SaveParticipantInput) {
    saveParticipant.mutate(input, {
      onSuccess: () => {
        toast.success(editing ? `${input.name}さんの回答を更新しました` : `${input.name}さんの回答を追加しました`)
        setEditingId(null)
        document.getElementById('answers')?.scrollIntoView({ behavior: 'smooth' })
      },
      onError: showError,
    })
  }

  function handleDecide(candidateId: string) {
    decide.mutate(candidateId, {
      onSuccess: () => toast.success('日程を決定しました', { description: 'メンバーに共有して予約へ進みましょう' }),
      onError: showError,
    })
  }

  function handleDeleteParticipant(participant: { id: string; name: string }) {
    if (!window.confirm(`${participant.name}さんの回答を削除しますか？`)) return
    deleteParticipant.mutate(participant.id, {
      onSuccess: () => {
        toast.success(`${participant.name}さんの回答を削除しました`)
        setEditingId(null)
      },
      onError: showError,
    })
  }

  function handleEdit(id: string) {
    setEditingId(id)
    document.getElementById('answer-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col gap-8">
      {event.memo && (
        <p className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed">
          <span className="mr-2 font-bold">幹事メモ</span>
          {event.memo}
        </p>
      )}

      <ShareBar path={`/e/${event.id}`} label="共有URL" />

      {event.isOrganizer && event.organizerKey && (
        <section aria-labelledby="organizer-url-title" className="flex flex-col gap-2">
          <h2 id="organizer-url-title" className="flex items-center gap-2 text-sm font-bold">
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">幹事</span>
            幹事用URL
            <span className="text-xs font-normal text-muted-foreground">他の人には共有しない</span>
          </h2>
          <ShareBar
            path={`/e/${event.id}/organizer?key=${encodeURIComponent(event.organizerKey)}`}
            label="幹事用URL"
            secret
          />
        </section>
      )}

      <DecisionPanel
        movie={event.movie}
        candidates={event.candidates}
        best={best?.candidate && { ...best, candidate: best.candidate }}
        total={event.participants.length}
        decidedId={event.decidedCandidateId}
        pending={decide.isPending || reopen.isPending}
        onDecide={event.isOrganizer ? handleDecide : undefined}
        onReopen={event.isOrganizer ? () => reopen.mutate(undefined, { onError: showError }) : undefined}
      />

      {event.decidedCandidateId && (
        <ReservationPanel
          reservation={event.reservation}
          defaultReservedBy={event.organizer}
          pending={reserve.isPending || cancelReservation.isPending}
          onReserve={
            event.isOrganizer
              ? (input) =>
                  reserve.mutate(input, { onSuccess: () => toast.success('予約を記録しました'), onError: showError })
              : undefined
          }
          onCancel={event.isOrganizer ? () => cancelReservation.mutate(undefined, { onError: showError }) : undefined}
        />
      )}

      <AnswerTable
        candidates={event.candidates}
        participants={event.participants}
        tallies={event.tallies}
        bestId={event.best?.candidateId}
        decidedId={event.decidedCandidateId}
        onEdit={handleEdit}
        onDecide={event.isOrganizer ? handleDecide : undefined}
      />

      {!event.decidedCandidateId && (
        <AnswerForm
          key={editingId ?? `new-${event.participants.length}`}
          candidates={event.candidates}
          initial={editing}
          pending={saveParticipant.isPending || deleteParticipant.isPending}
          onSave={handleSave}
          onCancel={editing ? () => setEditingId(null) : undefined}
          onDelete={editing ? () => handleDeleteParticipant(editing) : undefined}
        />
      )}

      {event.isOrganizer && (
        <EventSettings
          key={`${event.title}|${event.organizer}|${event.deadline}|${event.memo}`}
          event={event}
          pending={updateEvent.isPending || deleteEvent.isPending}
          onSave={(input) =>
            updateEvent.mutate(input, { onSuccess: () => toast.success('イベントを更新しました'), onError: showError })
          }
          onDelete={() =>
            deleteEvent.mutate(undefined, {
              onSuccess: () => {
                toast.success('イベントを削除しました')
                router.push('/')
              },
              onError: showError,
            })
          }
        />
      )}
    </div>
  )
}
