import { and, asc, eq, inArray } from 'drizzle-orm'
import type { Reservation } from '@/lib/types'
import type { Database } from '@/server/db/client'
import { candidates, events, participants, reservations } from '@/server/db/schema'
import type { EventRepository, StoredEvent } from './event-repository'

type EventRow = Awaited<ReturnType<ReturnType<typeof createFinder>>>[number]

function createFinder(db: Database) {
  return (ids: string[]) =>
    db.query.events.findMany({
      where: inArray(events.id, ids),
      with: {
        candidates: { orderBy: asc(candidates.position) },
        participants: { orderBy: asc(participants.position) },
        reservation: true,
      },
    })
}

function toReservation(row: NonNullable<EventRow['reservation']>): Reservation {
  return {
    theater: row.theater,
    showtime: row.showtime ?? undefined,
    note: row.note ?? undefined,
    reservedBy: row.reservedBy ?? undefined,
    reservedAt: row.reservedAt.toISOString(),
  }
}

function toStoredEvent(row: EventRow): StoredEvent {
  return {
    id: row.id,
    movie: row.movie,
    title: row.title,
    organizer: row.organizer ?? undefined,
    memo: row.memo ?? undefined,
    deadline: row.deadline ?? undefined,
    decidedCandidateId: row.decidedCandidateId ?? undefined,
    organizerKeyHash: row.organizerKeyHash ?? undefined,
    reservation: row.reservation ? toReservation(row.reservation) : undefined,
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
    return (await find(ids)).map(toStoredEvent)
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
          organizerKeyHash: event.organizerKeyHash,
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
    async updateDetails(eventId, update) {
      const values = Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined))
      if (Object.keys(values).length === 0) return
      await db.update(events).set(values).where(eq(events.id, eventId))
    },
    async delete(eventId) {
      // 候補・回答・予約は外部キーの ON DELETE CASCADE で消える
      await db.delete(events).where(eq(events.id, eventId))
    },
    async deleteParticipant(eventId, participantId) {
      await db.delete(participants).where(and(eq(participants.eventId, eventId), eq(participants.id, participantId)))
    },
    async setReservation(eventId, reservation) {
      if (!reservation) {
        await db.delete(reservations).where(eq(reservations.eventId, eventId))
        return
      }
      const values = {
        theater: reservation.theater,
        showtime: reservation.showtime ?? null,
        note: reservation.note ?? null,
        reservedBy: reservation.reservedBy ?? null,
        reservedAt: new Date(reservation.reservedAt),
      }
      await db
        .insert(reservations)
        .values({ eventId, ...values })
        .onConflictDoUpdate({ target: reservations.eventId, set: values })
    },
    async setDecision(eventId, candidateId) {
      await db
        .update(events)
        .set({ decidedCandidateId: candidateId ?? null })
        .where(eq(events.id, eventId))
    },
  }
}
