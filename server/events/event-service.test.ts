import { beforeEach, describe, expect, it } from 'vitest'
import { seedDatabase } from '@/server/db/seed'
import { freshTestDatabase } from '@/server/db/testing'
import { createDatabaseMovieProvider } from '@/server/movies/database-provider'
import { createMovieCatalog } from '@/server/movies/movie-catalog'
import { DomainError } from '../domain/errors'
import { createDrizzleEventRepository } from './drizzle-event-repository'
import { createEventService } from './event-service'

const today = () => '2026-09-27'
// シードの 'itetsuku' は today + 12 日 = 2026-10-09 公開
const RELEASE = '2026-10-09'

async function setup() {
  const db = await freshTestDatabase()
  await seedDatabase(db, { today })
  let seq = 0
  return createEventService({
    repository: createDrizzleEventRepository(db),
    catalog: createMovieCatalog({ providers: [createDatabaseMovieProvider(db)], today }),
    generateId: () => `id${++seq}`,
    now: () => new Date('2026-09-28T09:00:00Z'),
  })
}

const createInput = {
  movieId: 'itetsuku',
  title: '観る会',
  organizer: 'はるか',
  dates: [RELEASE, '2026-10-10'],
  slots: ['noon' as const, 'late' as const],
}

describe('EventService', () => {
  let service: Awaited<ReturnType<typeof setup>>

  beforeEach(async () => {
    service = await setup()
  })

  describe('create', () => {
    it('候補を生成し、作品情報を添えて返す', async () => {
      const event = await service.create(createInput)

      expect(event).toMatchObject({ id: 'id1', title: '観る会', organizer: 'はるか', participants: [] })
      expect(event.movie.releaseDate).toBe(RELEASE)
      expect(event.candidates.map((c) => c.id)).toEqual([
        '2026-10-09_noon',
        '2026-10-09_late',
        '2026-10-10_noon',
        '2026-10-10_late',
      ])
      expect(event.best).toBeUndefined()
    })

    it('存在しない作品は not_found', async () => {
      await expect(service.create({ ...createInput, movieId: 'nope' })).rejects.toMatchObject({ code: 'not_found' })
    })

    it('公開日から2週間の範囲外の日付は invalid', async () => {
      await expect(service.create({ ...createInput, dates: ['2026-10-08'] })).rejects.toBeInstanceOf(DomainError)
      await expect(service.create({ ...createInput, dates: ['2026-10-23'] })).rejects.toMatchObject({ code: 'invalid' })
    })
  })

  describe('saveParticipant', () => {
    it('回答を追加すると集計とベスト候補が更新される', async () => {
      const { id } = await service.create(createInput)

      await service.saveParticipant(id, {
        name: 'A',
        answers: { '2026-10-09_noon': 'yes', '2026-10-10_late': 'maybe' },
      })
      const event = await service.saveParticipant(id, { name: 'B', answers: { '2026-10-09_noon': 'yes' } })

      expect(event.participants.map((p) => p.name)).toEqual(['A', 'B'])
      expect(event.tallies['2026-10-09_noon']).toEqual({ yes: 2, maybe: 0, no: 0, score: 4 })
      expect(event.best?.candidateId).toBe('2026-10-09_noon')
    })

    it('ID を指定すると既存の回答を更新する', async () => {
      const { id } = await service.create(createInput)
      const created = await service.saveParticipant(id, { name: 'A', answers: {} })
      const participantId = created.participants[0]?.id ?? ''

      const event = await service.saveParticipant(id, { id: participantId, name: 'A2', answers: {} })

      expect(event.participants).toEqual([{ id: participantId, name: 'A2', answers: {} }])
    })

    it('存在しない候補への回答は捨てる', async () => {
      const { id } = await service.create(createInput)

      const event = await service.saveParticipant(id, { name: 'A', answers: { unknown: 'yes' } })

      expect(event.participants[0]?.answers).toEqual({})
    })

    it('存在しない参加者 ID の更新は not_found', async () => {
      const { id } = await service.create(createInput)

      await expect(service.saveParticipant(id, { id: 'ghost', name: 'A', answers: {} })).rejects.toMatchObject({
        code: 'not_found',
      })
    })

    it('決定済みのイベントには回答できない', async () => {
      const { id } = await service.create(createInput)
      await service.decide(id, '2026-10-09_noon')

      await expect(service.saveParticipant(id, { name: 'A', answers: {} })).rejects.toMatchObject({ code: 'conflict' })
    })
  })

  describe('decide / reopen', () => {
    it('候補を決定し、再開で解除できる', async () => {
      const { id } = await service.create(createInput)

      expect((await service.decide(id, '2026-10-10_late')).decidedCandidateId).toBe('2026-10-10_late')
      expect((await service.reopen(id)).decidedCandidateId).toBeUndefined()
    })

    it('存在しない候補は決定できない', async () => {
      const { id } = await service.create(createInput)

      await expect(service.decide(id, 'nope')).rejects.toMatchObject({ code: 'invalid' })
    })
  })

  describe('get / listSummaries', () => {
    it('存在しないイベントは undefined', async () => {
      expect(await service.get('missing')).toBeUndefined()
    })

    it('指定 ID のサマリーを返す', async () => {
      const { id } = await service.create(createInput)
      await service.saveParticipant(id, { name: 'A', answers: {} })
      await service.decide(id, '2026-10-10_late')

      expect(await service.listSummaries([id, 'missing'])).toEqual([
        {
          id,
          title: '観る会',
          poster: '/posters/p1.png',
          respondentCount: 1,
          decidedCandidate: { id: '2026-10-10_late', date: '2026-10-10', slot: 'late' },
          reserved: false,
        },
      ])
    })
  })

  describe('updateDetails', () => {
    it('タイトル・メモなどを更新し、null で値を消せる', async () => {
      const { id } = await service.create({ ...createInput, memo: 'IMAX' })

      const event = await service.updateDetails(id, { title: '改題', memo: null })

      expect(event.title).toBe('改題')
      expect(event.memo).toBeUndefined()
      expect(event.organizer).toBe('はるか')
    })

    it('存在しないイベントは not_found', async () => {
      await expect(service.updateDetails('missing', { title: 'x' })).rejects.toMatchObject({ code: 'not_found' })
    })
  })

  describe('delete', () => {
    it('イベントを削除する', async () => {
      const { id } = await service.create(createInput)

      await service.delete(id)

      expect(await service.get(id)).toBeUndefined()
      await expect(service.delete(id)).rejects.toMatchObject({ code: 'not_found' })
    })
  })

  describe('deleteParticipant', () => {
    it('回答を削除すると集計も更新される', async () => {
      const { id } = await service.create(createInput)
      const answered = await service.saveParticipant(id, { name: 'A', answers: { '2026-10-09_noon': 'yes' } })
      const participantId = answered.participants[0]?.id ?? ''

      const event = await service.deleteParticipant(id, participantId)

      expect(event.participants).toEqual([])
      expect(event.tallies['2026-10-09_noon']).toEqual({ yes: 0, maybe: 0, no: 0, score: 0 })
      expect(event.best).toBeUndefined()
    })

    it('存在しない回答は not_found、決定済みなら conflict', async () => {
      const { id } = await service.create(createInput)
      const answered = await service.saveParticipant(id, { name: 'A', answers: {} })
      await expect(service.deleteParticipant(id, 'ghost')).rejects.toMatchObject({ code: 'not_found' })

      await service.decide(id, '2026-10-09_noon')
      await expect(service.deleteParticipant(id, answered.participants[0]?.id ?? '')).rejects.toMatchObject({
        code: 'conflict',
      })
    })
  })

  describe('reserve / cancelReservation', () => {
    const reservation = { theater: 'TOHOシネマズ新宿', showtime: '12:30', note: 'J列 4席', reservedBy: 'はるか' }

    it('日程が決まっていないと予約できない', async () => {
      const { id } = await service.create(createInput)

      await expect(service.reserve(id, reservation)).rejects.toMatchObject({ code: 'conflict' })
    })

    it('決定済みなら予約を記録し、取り消せる', async () => {
      const { id } = await service.create(createInput)
      await service.decide(id, '2026-10-09_noon')

      const reserved = await service.reserve(id, reservation)
      expect(reserved.reservation).toEqual({ ...reservation, reservedAt: '2026-09-28T09:00:00.000Z' })
      expect((await service.listSummaries([id]))[0]?.reserved).toBe(true)

      const cancelled = await service.cancelReservation(id)
      expect(cancelled.reservation).toBeUndefined()
      expect(cancelled.decidedCandidateId).toBe('2026-10-09_noon')
    })

    it('調整を再開すると予約も解除される', async () => {
      const { id } = await service.create(createInput)
      await service.decide(id, '2026-10-09_noon')
      await service.reserve(id, reservation)

      const reopened = await service.reopen(id)

      expect(reopened.reservation).toBeUndefined()
    })

    it('予約済みのまま別の回には変更できない', async () => {
      const { id } = await service.create(createInput)
      await service.decide(id, '2026-10-09_noon')
      await service.reserve(id, reservation)

      await expect(service.decide(id, '2026-10-10_late')).rejects.toMatchObject({ code: 'conflict' })
    })
  })
})
