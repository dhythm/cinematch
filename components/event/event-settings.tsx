'use client'

import { Settings, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { EventView } from '@/lib/types'
import type { UpdateEventInput } from '@/server/events/event-service'

type Props = {
  event: EventView
  pending: boolean
  onSave: (input: UpdateEventInput) => void
  onDelete: () => void
}

export function EventSettings({ event, pending, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(event.title)
  const [organizer, setOrganizer] = useState(event.organizer ?? '')
  const [deadline, setDeadline] = useState(event.deadline ?? '')
  const [memo, setMemo] = useState(event.memo ?? '')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onSave({
      title: title.trim(),
      organizer: organizer.trim() || null,
      deadline: deadline || null,
      memo: memo.trim() || null,
    })
  }

  function handleDelete() {
    if (window.confirm(`「${event.title}」を削除しますか？`)) onDelete()
  }

  return (
    <details className="group rounded-2xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-bold">
        <Settings className="size-4 text-muted-foreground" aria-hidden />
        イベントを編集
      </summary>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-border p-4 sm:p-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="settings-title">イベント名</Label>
          <Input
            id="settings-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            className="h-11"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-organizer">幹事の名前</Label>
            <Input
              id="settings-organizer"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              maxLength={20}
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-deadline">回答締切</Label>
            <Input
              id="settings-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-11 font-mono"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="settings-memo">メモ</Label>
          <Textarea
            id="settings-memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={500}
            className="min-h-20"
          />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            <Trash2 aria-hidden />
            イベントを削除
          </Button>
          <Button type="submit" className="h-11 px-8 font-bold" disabled={!title.trim() || pending}>
            保存
          </Button>
        </div>
      </form>
    </details>
  )
}
