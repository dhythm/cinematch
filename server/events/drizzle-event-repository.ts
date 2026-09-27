import { asc, eq, inArray } from 'drizzle-orm'
import type { ScheduleEvent } from '@/lib/types'
import type { Database } from '@/server/db/client'
import { candidates, events, participants } from '@/server/db/schema'
import type { EventRepository } from './event-repository'

type EventRow = Awaited<ReturnType<ReturnType<typeof createFinder>>>[number]

function createFinder(db: Database) {
  return (ids: string[]) =>
    db.query.events.findMany({
      where: inArray(events.id, ids),
      with: {
        candidates: { orderBy: asc(candidates.position) },
        participants: { orderBy: asc(participants.position) },
      },
    })
}

function toScheduleEvent(row: EventRow): ScheduleEvent {
  return {
    id: row.id,
    movie: row.movie,
    title: row.title,
    organizer: row.organizer ?? undefined,
    memo: row.memo ?? undefined,
    deadline: row.deadline ?? undefined,
    decidedCandidateId: row.decidedCandidateId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    candidates: row.candidates.map(({ id, date, slot }) => ({ id, date, slot })),
    participants: row.participants.map(({ id, name, comment, answers }) => ({
      id,
      name,
      comment: comment ?? undefined,
      answers,
    })),
  }
}

export function createDrizzleEventRepository(db: Database): EventRepository {
  const find = createFinder(db)

  async function load(ids: string[]) {
    if (ids.length === 0) return []
    return (await find(ids)).map(toScheduleEvent)
  }

  return {
    async insert(event) {
      await db.transaction(async (tx) => {
        await tx.insert(events).values({
          id: event.id,
          movie: event.movie,
          title: event.title,
          organizer: event.organizer,
          memo: event.memo,
          deadline: event.deadline,
          decidedCandidateId: event.decidedCandidateId,
          createdAt: new Date(event.createdAt),
        })
        if (event.candidates.length > 0) {
          await tx
            .insert(candidates)
            .values(event.candidates.map((candidate, position) => ({ ...candidate, eventId: event.id, position })))
        }
        if (event.participants.length > 0) {
          await tx.insert(participants).values(event.participants.map((p) => ({ ...p, eventId: event.id })))
        }
      })
    },
    async findById(id) {
      return (await load([id]))[0]
    },
    findByIds: load,
    async saveParticipant(eventId, participant) {
      const values = { name: participant.name, comment: participant.comment ?? null, answers: participant.answers }
      await db
        .insert(participants)
        .values({ eventId, id: participant.id, ...values })
        .onConflictDoUpdate({ target: [participants.eventId, participants.id], set: values })
    },
    async setDecision(eventId, candidateId) {
      await db
        .update(events)
        .set({ decidedCandidateId: candidateId ?? null })
        .where(eq(events.id, eventId))
    },
  }
}
