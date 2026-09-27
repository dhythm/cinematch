import type { Answer, EventSummary, EventView, ScheduleEvent, TimeSlot } from '@/lib/types'
import { DomainError } from '@/server/domain/errors'
import { buildCandidates, findBestCandidate, isWithinScheduleWindow, tallyCandidate } from '@/server/domain/schedule'
import type { MovieCatalog } from '@/server/movies/movie-catalog'
import type { EventRepository } from './event-repository'

export type CreateEventInput = {
  movieId: string
  title: string
  organizer?: string
  memo?: string
  deadline?: string
  dates: string[]
  slots: TimeSlot[]
}

export type SaveParticipantInput = {
  id?: string
  name: string
  comment?: string
  answers: Record<string, Answer>
}

export type UpdateEventInput = {
  title?: string
  /** null で値を消す */
  organizer?: string | null
  memo?: string | null
  deadline?: string | null
}

export type ReserveInput = {
  theater: string
  showtime?: string
  note?: string
  reservedBy?: string
}

type Dependencies = {
  repository: EventRepository
  catalog: MovieCatalog
  generateId: () => string
  now: () => Date
}

export type EventService = ReturnType<typeof createEventService>

function toView(event: ScheduleEvent): EventView {
  return {
    ...event,
    tallies: Object.fromEntries(event.candidates.map((c) => [c.id, tallyCandidate(c.id, event.participants)])),
    best: findBestCandidate(event.candidates, event.participants),
  }
}

function assertOpen(event: ScheduleEvent) {
  if (event.decidedCandidateId) throw new DomainError('conflict', 'event is already decided')
}

export function createEventService({ repository, catalog, generateId, now }: Dependencies) {
  async function require(id: string) {
    const event = await repository.findById(id)
    if (!event) throw new DomainError('not_found', `event ${id} not found`)
    return event
  }

  async function reload(id: string) {
    return toView(await require(id))
  }

  return {
    async create(input: CreateEventInput) {
      const movie = await catalog.get(input.movieId)
      if (!movie) throw new DomainError('not_found', `movie ${input.movieId} not found`)
      const outside = input.dates.filter((date) => !isWithinScheduleWindow(movie.releaseDate, date))
      if (outside.length > 0) throw new DomainError('invalid', `dates out of schedule window: ${outside.join(', ')}`)
      const candidates = buildCandidates(input.dates, input.slots)
      if (candidates.length === 0) throw new DomainError('invalid', 'at least one candidate is required')

      const event: ScheduleEvent = {
        id: generateId(),
        movie,
        title: input.title,
        organizer: input.organizer,
        memo: input.memo,
        deadline: input.deadline,
        candidates,
        participants: [],
        createdAt: now().toISOString(),
      }
      await repository.insert(event)
      return toView(event)
    },

    async get(id: string) {
      const event = await repository.findById(id)
      return event && toView(event)
    },

    async listSummaries(ids: string[]): Promise<EventSummary[]> {
      const events = await repository.findByIds(ids)
      return events.map((event) => ({
        id: event.id,
        title: event.title,
        poster: event.movie.poster,
        respondentCount: event.participants.length,
        decidedCandidate: event.candidates.find((c) => c.id === event.decidedCandidateId),
        reserved: event.reservation !== undefined,
      }))
    },

    async updateDetails(eventId: string, input: UpdateEventInput) {
      await require(eventId)
      await repository.updateDetails(eventId, input)
      return reload(eventId)
    },

    async delete(eventId: string) {
      await require(eventId)
      await repository.delete(eventId)
    },

    async saveParticipant(eventId: string, input: SaveParticipantInput) {
      const event = await require(eventId)
      assertOpen(event)
      if (input.id && !event.participants.some((p) => p.id === input.id)) {
        throw new DomainError('not_found', `participant ${input.id} not found`)
      }
      const candidateIds = new Set(event.candidates.map((c) => c.id))
      await repository.saveParticipant(eventId, {
        id: input.id ?? generateId(),
        name: input.name,
        comment: input.comment,
        answers: Object.fromEntries(Object.entries(input.answers).filter(([id]) => candidateIds.has(id))),
      })
      return reload(eventId)
    },

    async deleteParticipant(eventId: string, participantId: string) {
      const event = await require(eventId)
      assertOpen(event)
      if (!event.participants.some((p) => p.id === participantId)) {
        throw new DomainError('not_found', `participant ${participantId} not found`)
      }
      await repository.deleteParticipant(eventId, participantId)
      return reload(eventId)
    },

    async decide(eventId: string, candidateId: string) {
      const event = await require(eventId)
      if (!event.candidates.some((c) => c.id === candidateId)) {
        throw new DomainError('invalid', `candidate ${candidateId} not found`)
      }
      if (event.reservation && event.decidedCandidateId !== candidateId) {
        throw new DomainError('conflict', 'cancel the reservation before changing the decided candidate')
      }
      await repository.setDecision(eventId, candidateId)
      return reload(eventId)
    },

    async reopen(eventId: string) {
      await require(eventId)
      await repository.setReservation(eventId, undefined)
      await repository.setDecision(eventId, undefined)
      return reload(eventId)
    },

    async reserve(eventId: string, input: ReserveInput) {
      const event = await require(eventId)
      if (!event.decidedCandidateId) throw new DomainError('conflict', 'decide a candidate before reserving')
      await repository.setReservation(eventId, { ...input, reservedAt: now().toISOString() })
      return reload(eventId)
    },

    async cancelReservation(eventId: string) {
      await require(eventId)
      await repository.setReservation(eventId, undefined)
      return reload(eventId)
    },
  }
}
