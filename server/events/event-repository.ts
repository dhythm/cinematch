import type { Participant, ScheduleEvent } from '@/lib/types'

/** 永続化の境界。DB を導入するときはこのインターフェースの実装を差し替える */
export type EventRepository = {
  insert: (event: ScheduleEvent) => Promise<void>
  findById: (id: string) => Promise<ScheduleEvent | undefined>
  findByIds: (ids: string[]) => Promise<ScheduleEvent[]>
  saveParticipant: (eventId: string, participant: Participant) => Promise<void>
  setDecision: (eventId: string, candidateId: string | undefined) => Promise<void>
}
