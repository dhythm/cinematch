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
  const repository = createDrizzleEventRepository(db)
  const service = createEventService({
    repository,
    catalog: createMovieCatalog({ providers: [createDatabaseMovieProvider(db)], today }),
    generateId: () => `id${++seq}`,
    now: () => new Date('2026-09-28T09:00:00Z'),
  })
  return { service, repository }
}

const createInput = {
  movieId: 'itetsuku',
  title: '観る会',
  organizer: 'はるか',
  dates: [RELEASE, '2026-10-10'],
  slots: ['noon' as const, 'late' as const],
}

const reservation = { theater: 'TOHOシネマズ新宿', showtime: '12:30', note: 'J列 4席', reservedBy: 'はるか' }

describe('EventService', () => {
  let service: Awaited<ReturnType<typeof setup>>['service']
  let repository: Awaited<ReturnType<typeof setup>>['repository']
  /** 幹事として作成したイベント */
  let id: string
  let key: string

  beforeEach(async () => {
    ;({ service, repository } = await setup())
    const created = await service.create(createInput)
    id = created.id
    key = created.organizerKey ?? ''
  })

  describe('create', () => {
    it('候補を生成し、作品情報と幹事キーを添えて返す', async () => {
      const event = await service.create(createInput)

      expect(event).toMatchObject({ title: '観る会', organizer: 'はるか', participants: [], isOrganizer: true })
      expect(event.organizerKey).toMatch(/^[\w-]{43}$/)
      expect(event.movie.releaseDate).toBe(RELEASE)
      expect(event.candidates.map((c) => c.id)).toEqual([
        '2026-10-09_noon',
        '2026-10-09_late',
        '2026-10-10_noon',
        '2026-10-10_late',
      ])
      expect(event.best).toBeUndefined()
      expect(event).not.toHaveProperty('organizerKeyHash')
    })

    it('存在しない作品は not_found', async () => {
      await expect(service.create({ ...createInput, movieId: 'nope' })).rejects.toMatchObject({ code: 'not_found' })
    })

    it('公開日から2週間の範囲外の日付は invalid', async () => {
      await expect(service.create({ ...createInput, dates: ['2026-10-08'] })).rejects.toBeInstanceOf(DomainError)
      await expect(service.create({ ...createInput, dates: ['2026-10-23'] })).rejects.toMatchObject({ code: 'invalid' })
    })
  })

  describe('get', () => {
    it('幹事キーが正しければ幹事として見え、キーも返す', async () => {
      expect(await service.get(id, key)).toMatchObject({ isOrganizer: true, organizerKey: key })
    })

    it('キーが無い・違う場合は参加者として見え、キーは返さない', async () => {
      const asGuest = await service.get(id)
      const withWrongKey = await service.get(id, 'wrong')

      expect(asGuest?.isOrganizer).toBe(false)
      expect(asGuest).not.toHaveProperty('organizerKey')
      expect(withWrongKey?.isOrganizer).toBe(false)
    })

    it('存在しないイベントは undefined', async () => {
      expect(await service.get('missing')).toBeUndefined()
    })
  })

  describe('isOrganizer', () => {
    it('幹事キーを検証する', async () => {
      expect(await service.isOrganizer(id, key)).toBe(true)
      expect(await service.isOrganizer(id, 'wrong')).toBe(false)
      expect(await service.isOrganizer('missing', key)).toBe(false)
    })
  })

  describe('saveParticipant（誰でも回答できる）', () => {
    it('回答を追加すると集計とベスト候補が更新される', async () => {
      await service.saveParticipant(id, {
        name: 'A',
        answers: { '2026-10-09_noon': 'yes', '2026-10-10_late': 'maybe' },
      })
      const event = await service.saveParticipant(id, { name: 'B', answers: { '2026-10-09_noon': 'yes' } })

      expect(event.participants.map((p) => p.name)).toEqual(['A', 'B'])
      expect(event.tallies['2026-10-09_noon']).toEqual({ yes: 2, maybe: 0, no: 0, score: 4 })
      expect(event.best?.candidateId).toBe('2026-10-09_noon')
      expect(event.isOrganizer).toBe(false)
    })

    it('幹事キー付きなら幹事のビューを返す', async () => {
      const event = await service.saveParticipant(id, { name: 'はるか', answers: {} }, key)

      expect(event.isOrganizer).toBe(true)
    })

    it('ID を指定すると既存の回答を更新する', async () => {
      const created = await service.saveParticipant(id, { name: 'A', answers: {} })
      const participantId = created.participants[0]?.id ?? ''

      const event = await service.saveParticipant(id, { id: participantId, name: 'A2', answers: {} })

      expect(event.participants).toEqual([{ id: participantId, name: 'A2', answers: {} }])
    })

    it('存在しない候補への回答は捨てる', async () => {
      const event = await service.saveParticipant(id, { name: 'A', answers: { unknown: 'yes' } })

      expect(event.participants[0]?.answers).toEqual({})
    })

    it('存在しない参加者 ID の更新は not_found', async () => {
      await expect(service.saveParticipant(id, { id: 'ghost', name: 'A', answers: {} })).rejects.toMatchObject({
        code: 'not_found',
      })
    })

    it('決定済みのイベントには回答できない', async () => {
      await service.decide(id, '2026-10-09_noon', key)

      await expect(service.saveParticipant(id, { name: 'A', answers: {} })).rejects.toMatchObject({ code: 'conflict' })
    })
  })

  describe('deleteParticipant（誰でも削除できる）', () => {
    it('回答を削除すると集計も更新される', async () => {
      const answered = await service.saveParticipant(id, { name: 'A', answers: { '2026-10-09_noon': 'yes' } })
      const participantId = answered.participants[0]?.id ?? ''

      const event = await service.deleteParticipant(id, participantId)

      expect(event.participants).toEqual([])
      expect(event.tallies['2026-10-09_noon']).toEqual({ yes: 0, maybe: 0, no: 0, score: 0 })
      expect(event.best).toBeUndefined()
    })

    it('存在しない回答は not_found、決定済みなら conflict', async () => {
      const answered = await service.saveParticipant(id, { name: 'A', answers: {} })
      await expect(service.deleteParticipant(id, 'ghost')).rejects.toMatchObject({ code: 'not_found' })

      await service.decide(id, '2026-10-09_noon', key)
      await expect(service.deleteParticipant(id, answered.participants[0]?.id ?? '')).rejects.toMatchObject({
        code: 'conflict',
      })
    })
  })

  describe('幹事だけができる操作', () => {
    it.each([
      ['updateDetails', (k?: string) => service.updateDetails(id, { title: 'x' }, k)],
      ['delete', (k?: string) => service.delete(id, k)],
      ['decide', (k?: string) => service.decide(id, '2026-10-09_noon', k)],
      ['reopen', (k?: string) => service.reopen(id, k)],
      ['cancelReservation', (k?: string) => service.cancelReservation(id, k)],
    ])('%s は幹事キーが無い・違うと forbidden', async (_name, run) => {
      await expect(run()).rejects.toMatchObject({ code: 'forbidden' })
      await expect(run('wrong')).rejects.toMatchObject({ code: 'forbidden' })
    })

    it('reserve は幹事キーが無いと forbidden', async () => {
      await service.decide(id, '2026-10-09_noon', key)

      await expect(service.reserve(id, reservation)).rejects.toMatchObject({ code: 'forbidden' })
    })

    it('幹事キーのハッシュが無い旧データは誰も幹事操作できない', async () => {
      const stored = await repository.findById(id)
      if (!stored) throw new Error('setup failed')
      await repository.insert({ ...stored, id: 'legacy', organizerKeyHash: undefined })

      await expect(service.decide('legacy', '2026-10-09_noon', key)).rejects.toMatchObject({ code: 'forbidden' })
      expect((await service.get('legacy', key))?.isOrganizer).toBe(false)
    })
  })

  describe('updateDetails', () => {
    it('タイトル・メモなどを更新し、null で値を消せる', async () => {
      await service.updateDetails(id, { memo: 'IMAX' }, key)

      const event = await service.updateDetails(id, { title: '改題', memo: null }, key)

      expect(event.title).toBe('改題')
      expect(event.memo).toBeUndefined()
      expect(event.organizer).toBe('はるか')
      expect(event.isOrganizer).toBe(true)
    })

    it('存在しないイベントは not_found', async () => {
      await expect(service.updateDetails('missing', { title: 'x' }, key)).rejects.toMatchObject({ code: 'not_found' })
    })
  })

  describe('delete', () => {
    it('イベントを削除する', async () => {
      await service.delete(id, key)

      expect(await service.get(id)).toBeUndefined()
      await expect(service.delete(id, key)).rejects.toMatchObject({ code: 'not_found' })
    })
  })

  describe('decide / reopen', () => {
    it('候補を決定し、再開で解除できる', async () => {
      expect((await service.decide(id, '2026-10-10_late', key)).decidedCandidateId).toBe('2026-10-10_late')
      expect((await service.reopen(id, key)).decidedCandidateId).toBeUndefined()
    })

    it('存在しない候補は決定できない', async () => {
      await expect(service.decide(id, 'nope', key)).rejects.toMatchObject({ code: 'invalid' })
    })
  })

  describe('reserve / cancelReservation', () => {
    it('日程が決まっていないと予約できない', async () => {
      await expect(service.reserve(id, reservation, key)).rejects.toMatchObject({ code: 'conflict' })
    })

    it('決定済みなら予約を記録し、取り消せる', async () => {
      await service.decide(id, '2026-10-09_noon', key)

      const reserved = await service.reserve(id, reservation, key)
      expect(reserved.reservation).toEqual({ ...reservation, reservedAt: '2026-09-28T09:00:00.000Z' })

      const cancelled = await service.cancelReservation(id, key)
      expect(cancelled.reservation).toBeUndefined()
      expect(cancelled.decidedCandidateId).toBe('2026-10-09_noon')
    })

    it('調整を再開すると予約も解除される', async () => {
      await service.decide(id, '2026-10-09_noon', key)
      await service.reserve(id, reservation, key)

      expect((await service.reopen(id, key)).reservation).toBeUndefined()
    })

    it('予約済みのまま別の回には変更できない', async () => {
      await service.decide(id, '2026-10-09_noon', key)
      await service.reserve(id, reservation, key)

      await expect(service.decide(id, '2026-10-10_late', key)).rejects.toMatchObject({ code: 'conflict' })
    })
  })

  describe('listSummaries', () => {
    it('指定 ID のサマリーを返し、幹事かどうかも示す', async () => {
      const other = await service.create({ ...createInput, title: '別の会' })
      await service.saveParticipant(id, { name: 'A', answers: {} })
      await service.decide(id, '2026-10-10_late', key)
      await service.reserve(id, reservation, key)

      const summaries = await service.listSummaries([id, other.id, 'missing'], (eventId) =>
        eventId === id ? key : undefined,
      )

      expect(summaries).toEqual([
        {
          id,
          title: '観る会',
          poster: '/posters/p1.png',
          respondentCount: 1,
          decidedCandidate: { id: '2026-10-10_late', date: '2026-10-10', slot: 'late' },
          reserved: true,
          isOrganizer: true,
        },
        {
          id: other.id,
          title: '別の会',
          poster: '/posters/p1.png',
          respondentCount: 0,
          decidedCandidate: undefined,
          reserved: false,
          isOrganizer: false,
        },
      ])
    })
  })
})
