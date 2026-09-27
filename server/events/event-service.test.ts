import { beforeEach, describe, expect, it } from 'vitest'
import { createDatabase } from '@/server/db/client'
import { createFixtureProvider } from '@/server/movies/fixtures'
import { createMovieCatalog } from '@/server/movies/movie-catalog'
import { DomainError } from '../domain/errors'
import { createDrizzleEventRepository } from './drizzle-event-repository'
import { createEventService } from './event-service'

const today = () => '2026-09-27'
// fixture 'itetsuku' は today + 12 日 = 2026-10-09 公開
const RELEASE = '2026-10-09'

async function setup() {
  const { db, migrate } = await createDatabase({})
  await migrate()
  let seq = 0
  return createEventService({
    repository: createDrizzleEventRepository(db),
    catalog: createMovieCatalog({ providers: [createFixtureProvider({ today })], today }),
    generateId: () => `id${++seq}`,
    now: () => new Date('2026-09-27T00:00:00Z'),
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
        },
      ])
    })
  })
})
