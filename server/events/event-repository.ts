import type { Participant, Reservation, ScheduleEvent } from '@/lib/types'

type EventDetailsUpdate = Partial<Pick<ScheduleEvent, 'title' | 'organizer' | 'memo' | 'deadline'>>

/** 保存形式のイベント。幹事キーのハッシュはサーバー内だけで扱い、クライアントには返さない */
export type StoredEvent = ScheduleEvent & { organizerKeyHash?: string }

/** 永続化の境界。DB 実装を差し替えるときは event-repository.contract.ts を通すこと */
export type EventRepository = {
  insert: (event: StoredEvent) => Promise<void>
  findById: (id: string) => Promise<StoredEvent | undefined>
  findByIds: (ids: string[]) => Promise<StoredEvent[]>
  /** undefined のキーは変更しない。値を消すときは null を渡す */
  updateDetails: (
    eventId: string,
    update: { [K in keyof EventDetailsUpdate]: EventDetailsUpdate[K] | null },
  ) => Promise<void>
  delete: (eventId: string) => Promise<void>
  saveParticipant: (eventId: string, participant: Participant) => Promise<void>
  deleteParticipant: (eventId: string, participantId: string) => Promise<void>
  setDecision: (eventId: string, candidateId: string | undefined) => Promise<void>
  setReservation: (eventId: string, reservation: Reservation | undefined) => Promise<void>
}
