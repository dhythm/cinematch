import type { Participant, Reservation, ScheduleEvent } from '@/lib/types'

type EventDetailsUpdate = Partial<Pick<ScheduleEvent, 'title' | 'organizer' | 'memo' | 'deadline'>>

/** 永続化の境界。DB 実装を差し替えるときは event-repository.contract.ts を通すこと */
export type EventRepository = {
  insert: (event: ScheduleEvent) => Promise<void>
  findById: (id: string) => Promise<ScheduleEvent | undefined>
  findByIds: (ids: string[]) => Promise<ScheduleEvent[]>
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
