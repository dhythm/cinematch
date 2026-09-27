import type { PGlite } from '@electric-sql/pglite'
import type { Answer, Candidate, Movie, Participant, ScheduleEvent } from '@/lib/types'
import type { EventRepository } from './event-repository'
import { EVENT_SCHEMA_SQL } from './pglite-schema'

type EventRow = {
  id: string
  movie: Movie
  title: string
  organizer: string | null
  memo: string | null
  deadline: string | null
  decided_candidate_id: string | null
  created_at: string
}
type CandidateRow = Candidate & { event_id: string }
type ParticipantRow = {
  event_id: string
  id: string
  name: string
  comment: string | null
  answers: Record<string, Answer>
}

const optional = <T>(value: T | null) => value ?? undefined

/** エージェントの動作確認や DB 導入前の SQL 検証用に、PGlite（WASM 版 Postgres）で永続化する */
export async function createPgliteEventRepository(db: PGlite): Promise<EventRepository> {
  await db.exec(EVENT_SCHEMA_SQL)

  async function load(ids: string[]): Promise<ScheduleEvent[]> {
    if (ids.length === 0) return []
    const [events, candidates, participants] = await Promise.all([
      db.query<EventRow>(
        `select id, movie, title, organizer, memo, deadline::text, decided_candidate_id,
                to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
           from events where id = any($1)`,
        [ids],
      ),
      db.query<CandidateRow>(
        'select event_id, id, date::text, slot from candidates where event_id = any($1) order by position',
        [ids],
      ),
      db.query<ParticipantRow>(
        'select event_id, id, name, comment, answers from participants where event_id = any($1) order by position',
        [ids],
      ),
    ])
    return events.rows.map((row) => ({
      id: row.id,
      movie: row.movie,
      title: row.title,
      organizer: optional(row.organizer),
      memo: optional(row.memo),
      deadline: optional(row.deadline),
      decidedCandidateId: optional(row.decided_candidate_id),
      createdAt: row.created_at,
      candidates: candidates.rows
        .filter((c) => c.event_id === row.id)
        .map(({ id, date, slot }) => ({ id, date, slot })),
      participants: participants.rows
        .filter((p) => p.event_id === row.id)
        .map((p): Participant => ({ id: p.id, name: p.name, comment: optional(p.comment), answers: p.answers })),
    }))
  }

  return {
    async insert(event) {
      await db.transaction(async (tx) => {
        await tx.query(
          `insert into events (id, movie, title, organizer, memo, deadline, decided_candidate_id, created_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            event.id,
            event.movie,
            event.title,
            event.organizer ?? null,
            event.memo ?? null,
            event.deadline ?? null,
            event.decidedCandidateId ?? null,
            event.createdAt,
          ],
        )
        for (const [position, candidate] of event.candidates.entries()) {
          await tx.query('insert into candidates (event_id, id, date, slot, position) values ($1, $2, $3, $4, $5)', [
            event.id,
            candidate.id,
            candidate.date,
            candidate.slot,
            position,
          ])
        }
        for (const participant of event.participants) {
          await tx.query(
            'insert into participants (event_id, id, name, comment, answers) values ($1, $2, $3, $4, $5)',
            [event.id, participant.id, participant.name, participant.comment ?? null, participant.answers],
          )
        }
      })
    },
    async findById(id) {
      return (await load([id]))[0]
    },
    findByIds: load,
    async saveParticipant(eventId, participant) {
      await db.query(
        `insert into participants (event_id, id, name, comment, answers) values ($1, $2, $3, $4, $5)
         on conflict (event_id, id) do update set name = excluded.name, comment = excluded.comment, answers = excluded.answers`,
        [eventId, participant.id, participant.name, participant.comment ?? null, participant.answers],
      )
    },
    async setDecision(eventId, candidateId) {
      await db.query('update events set decided_candidate_id = $2 where id = $1', [eventId, candidateId ?? null])
    },
  }
}
