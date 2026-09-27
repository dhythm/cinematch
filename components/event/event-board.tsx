'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useDecide, useReopen, useSaveParticipant } from '@/lib/api/queries'
import type { EventView } from '@/lib/types'
import type { SaveParticipantInput } from '@/server/events/event-service'
import { AnswerForm } from './answer-form'
import { AnswerTable } from './answer-table'
import { DecisionPanel } from './decision-panel'
import { ShareBar } from './share-bar'

const showError = (error: Error) => toast.error(error.message)

export function EventBoard({ event }: { event: EventView }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const saveParticipant = useSaveParticipant(event.id)
  const decide = useDecide(event.id)
  const reopen = useReopen(event.id)

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

      <ShareBar eventId={event.id} />

      <DecisionPanel
        movie={event.movie}
        candidates={event.candidates}
        best={best?.candidate && { ...best, candidate: best.candidate }}
        total={event.participants.length}
        decidedId={event.decidedCandidateId}
        pending={decide.isPending || reopen.isPending}
        onDecide={handleDecide}
        onReopen={() => reopen.mutate(undefined, { onError: showError })}
      />

      <AnswerTable
        candidates={event.candidates}
        participants={event.participants}
        tallies={event.tallies}
        bestId={event.best?.candidateId}
        decidedId={event.decidedCandidateId}
        onEdit={handleEdit}
        onDecide={handleDecide}
      />

      {!event.decidedCandidateId && (
        <AnswerForm
          key={editingId ?? `new-${event.participants.length}`}
          candidates={event.candidates}
          initial={editing}
          pending={saveParticipant.isPending}
          onSave={handleSave}
          onCancel={editing ? () => setEditingId(null) : undefined}
        />
      )}
    </div>
  )
}
