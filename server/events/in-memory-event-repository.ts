import type { ScheduleEvent } from '@/lib/types'
import type { EventRepository } from './event-repository'

/** DB 導入前のプロセス内ストア。呼び出し側と参照を共有しないよう常に複製して出し入れする */
export function createInMemoryEventRepository(): EventRepository {
  const events = new Map<string, ScheduleEvent>()

  function update(eventId: string, apply: (event: ScheduleEvent) => ScheduleEvent) {
    const event = events.get(eventId)
    if (event) events.set(eventId, apply(event))
  }

  return {
    async insert(event) {
      events.set(event.id, structuredClone(event))
    },
    async findById(id) {
      const event = events.get(id)
      return event && structuredClone(event)
    },
    async findByIds(ids) {
      return ids.flatMap((id) => {
        const event = events.get(id)
        return event ? [structuredClone(event)] : []
      })
    },
    async saveParticipant(eventId, participant) {
      update(eventId, (event) => {
        const exists = event.participants.some((p) => p.id === participant.id)
        const participants = exists
          ? event.participants.map((p) => (p.id === participant.id ? structuredClone(participant) : p))
          : [...event.participants, structuredClone(participant)]
        return { ...event, participants }
      })
    },
    async setDecision(eventId, candidateId) {
      update(eventId, (event) => ({ ...event, decidedCandidateId: candidateId }))
    },
  }
}
