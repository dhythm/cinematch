import type { Answer, EventSummary, EventView, TimeSlot } from '@/lib/types'
import { DomainError } from '@/server/domain/errors'
import { generateOrganizerKey, hashOrganizerKey, verifyOrganizerKey } from '@/server/domain/organizer-key'
import { buildCandidates, findBestCandidate, isWithinScheduleWindow, tallyCandidate } from '@/server/domain/schedule'
import type { MovieCatalog } from '@/server/movies/movie-catalog'
import type { EventRepository, StoredEvent } from './event-repository'

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

/**
 * 閲覧者ごとのビューを作る。幹事キーのハッシュは外に出さず、
 * 正しい幹事キーを持つ閲覧者にだけ isOrganizer とキー（幹事用 URL の表示用）を返す。
 */
function toView({ organizerKeyHash, ...event }: StoredEvent, organizerKey?: string): EventView {
  const isOrganizer = verifyOrganizerKey(organizerKey, organizerKeyHash)
  return {
    ...event,
    tallies: Object.fromEntries(event.candidates.map((c) => [c.id, tallyCandidate(c.id, event.participants)])),
    best: findBestCandidate(event.candidates, event.participants),
    isOrganizer,
    ...(isOrganizer && { organizerKey }),
  }
}

function assertOpen(event: StoredEvent) {
  if (event.decidedCandidateId) throw new DomainError('conflict', 'event is already decided')
}

/**
 * 権限: 回答の追加・編集・削除は URL を知っていれば誰でもできる（調整さんと同じ）。
 * イベントの編集・削除、日程の決定・再開、予約は幹事キーを持つ人だけ。
 */
export function createEventService({ repository, catalog, generateId, now }: Dependencies) {
  async function require(id: string) {
    const event = await repository.findById(id)
    if (!event) throw new DomainError('not_found', `event ${id} not found`)
    return event
  }

  async function requireAsOrganizer(id: string, organizerKey: string | undefined) {
    const event = await require(id)
    if (!verifyOrganizerKey(organizerKey, event.organizerKeyHash)) {
      throw new DomainError('forbidden', 'only the organizer can do this')
    }
    return event
  }

  async function reload(id: string, organizerKey: string | undefined) {
    return toView(await require(id), organizerKey)
  }

  return {
    /** 作成者は幹事になる。返り値の organizerKey はこのときだけ平文で得られる */
    async create(input: CreateEventInput) {
      const movie = await catalog.get(input.movieId)
      if (!movie) throw new DomainError('not_found', `movie ${input.movieId} not found`)
      const outside = input.dates.filter((date) => !isWithinScheduleWindow(movie.releaseDate, date))
      if (outside.length > 0) throw new DomainError('invalid', `dates out of schedule window: ${outside.join(', ')}`)
      const candidates = buildCandidates(input.dates, input.slots)
      if (candidates.length === 0) throw new DomainError('invalid', 'at least one candidate is required')

      const organizerKey = generateOrganizerKey()
      const event: StoredEvent = {
        id: generateId(),
        movie,
        title: input.title,
        organizer: input.organizer,
        memo: input.memo,
        deadline: input.deadline,
        candidates,
        participants: [],
        organizerKeyHash: hashOrganizerKey(organizerKey),
        createdAt: now().toISOString(),
      }
      await repository.insert(event)
      return toView(event, organizerKey)
    },

    async get(id: string, organizerKey?: string) {
      const event = await repository.findById(id)
      return event && toView(event, organizerKey)
    },

    async isOrganizer(id: string, organizerKey: string) {
      const event = await repository.findById(id)
      return verifyOrganizerKey(organizerKey, event?.organizerKeyHash)
    },

    async listSummaries(ids: string[], organizerKeyOf: (eventId: string) => string | undefined = () => undefined) {
      const events = await repository.findByIds(ids)
      return events.map(
        (event): EventSummary => ({
          id: event.id,
          title: event.title,
          poster: event.movie.poster,
          respondentCount: event.participants.length,
          decidedCandidate: event.candidates.find((c) => c.id === event.decidedCandidateId),
          reserved: event.reservation !== undefined,
          isOrganizer: verifyOrganizerKey(organizerKeyOf(event.id), event.organizerKeyHash),
        }),
      )
    },

    async saveParticipant(eventId: string, input: SaveParticipantInput, organizerKey?: string) {
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
      return reload(eventId, organizerKey)
    },

    async deleteParticipant(eventId: string, participantId: string, organizerKey?: string) {
      const event = await require(eventId)
      assertOpen(event)
      if (!event.participants.some((p) => p.id === participantId)) {
        throw new DomainError('not_found', `participant ${participantId} not found`)
      }
      await repository.deleteParticipant(eventId, participantId)
      return reload(eventId, organizerKey)
    },

    async updateDetails(eventId: string, input: UpdateEventInput, organizerKey?: string) {
      await requireAsOrganizer(eventId, organizerKey)
      await repository.updateDetails(eventId, input)
      return reload(eventId, organizerKey)
    },

    async delete(eventId: string, organizerKey?: string) {
      await requireAsOrganizer(eventId, organizerKey)
      await repository.delete(eventId)
    },

    async decide(eventId: string, candidateId: string, organizerKey?: string) {
      const event = await requireAsOrganizer(eventId, organizerKey)
      if (!event.candidates.some((c) => c.id === candidateId)) {
        throw new DomainError('invalid', `candidate ${candidateId} not found`)
      }
      if (event.reservation && event.decidedCandidateId !== candidateId) {
        throw new DomainError('conflict', 'cancel the reservation before changing the decided candidate')
      }
      await repository.setDecision(eventId, candidateId)
      return reload(eventId, organizerKey)
    },

    async reopen(eventId: string, organizerKey?: string) {
      await requireAsOrganizer(eventId, organizerKey)
      await repository.setReservation(eventId, undefined)
      await repository.setDecision(eventId, undefined)
      return reload(eventId, organizerKey)
    },

    async reserve(eventId: string, input: ReserveInput, organizerKey?: string) {
      const event = await requireAsOrganizer(eventId, organizerKey)
      if (!event.decidedCandidateId) throw new DomainError('conflict', 'decide a candidate before reserving')
      await repository.setReservation(eventId, { ...input, reservedAt: now().toISOString() })
      return reload(eventId, organizerKey)
    },

    async cancelReservation(eventId: string, organizerKey?: string) {
      await requireAsOrganizer(eventId, organizerKey)
      await repository.setReservation(eventId, undefined)
      return reload(eventId, organizerKey)
    },
  }
}
