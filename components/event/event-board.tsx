'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ShareBar } from './share-bar'
import { DecisionPanel } from './decision-panel'
import { AnswerTable } from './answer-table'
import { AnswerForm } from './answer-form'
import { findBestCandidate } from '@/lib/date'
import type { Movie, Participant, ScheduleEvent } from '@/lib/types'

export function EventBoard({ event, movie }: { event: ScheduleEvent; movie: Movie }) {
  const [participants, setParticipants] = useState<Participant[]>(event.participants)
  const [decidedId, setDecidedId] = useState<string | undefined>(event.decidedCandidateId)
  const [editingId, setEditingId] = useState<string | null>(null)

  const best = findBestCandidate(event.candidates, participants)
  const editing = participants.find((p) => p.id === editingId)

  function handleSave(participant: Participant) {
    setParticipants((prev) => {
      const exists = prev.some((p) => p.id === participant.id)
      return exists ? prev.map((p) => (p.id === participant.id ? participant : p)) : [...prev, participant]
    })
    toast.success(editing ? `${participant.name}さんの回答を更新しました` : `${participant.name}さんの回答を追加しました`)
    setEditingId(null)
    document.getElementById('answers')?.scrollIntoView({ behavior: 'smooth' })
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
        movie={movie}
        candidates={event.candidates}
        best={best}
        total={participants.length}
        decidedId={decidedId}
        onDecide={(id) => {
          setDecidedId(id)
          toast.success('日程を決定しました', { description: 'メンバーに共有して予約へ進みましょう' })
        }}
        onReopen={() => setDecidedId(undefined)}
      />

      <AnswerTable
        candidates={event.candidates}
        participants={participants}
        bestId={best?.candidate.id}
        decidedId={decidedId}
        onEdit={handleEdit}
        onDecide={setDecidedId}
      />

      {!decidedId && (
        <AnswerForm
          key={editingId ?? 'new'}
          candidates={event.candidates}
          initial={editing}
          onSave={handleSave}
          onCancel={editing ? () => setEditingId(null) : undefined}
        />
      )}
    </div>
  )
}
