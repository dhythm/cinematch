import { beforeEach, describe, expect, it } from 'vitest'
import type { ScheduleEvent } from '@/lib/types'
import type { EventRepository } from './event-repository'

function sampleEvent(overrides: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return {
    id: 'ev1',
    movie: {
      id: 'itetsuku',
      title: '凍てつく海のアストロノート',
      releaseDate: '2026-10-09',
      runtime: 142,
      genres: ['SF'],
      poster: '/posters/p1.png',
      synopsis: '',
      source: 'tmdb',
    },
    title: '観る会',
    organizer: 'はるか',
    memo: 'IMAX希望',
    deadline: '2026-10-05',
    candidates: [
      { id: '2026-10-09_noon', date: '2026-10-09', slot: 'noon' },
      { id: '2026-10-10_late', date: '2026-10-10', slot: 'late' },
    ],
    participants: [],
    createdAt: '2026-09-27T00:00:00.000Z',
    ...overrides,
  }
}

/** すべての EventRepository 実装が満たすべき振る舞い */
export function describeEventRepositoryContract(name: string, create: () => Promise<EventRepository>) {
  describe(`${name} (EventRepository contract)`, () => {
    let repository: EventRepository

    beforeEach(async () => {
      repository = await create()
    })

    it('保存したイベントを ID で取得できる', async () => {
      await repository.insert(sampleEvent())

      expect(await repository.findById('ev1')).toEqual(sampleEvent())
    })

    it('存在しない ID は undefined', async () => {
      expect(await repository.findById('missing')).toBeUndefined()
    })

    it('任意項目が未設定でも往復できる', async () => {
      const event = sampleEvent({ organizer: undefined, memo: undefined, deadline: undefined })
      await repository.insert(event)

      expect(await repository.findById('ev1')).toEqual(event)
    })

    it('複数 ID でまとめて取得でき、存在しないものは無視する', async () => {
      await repository.insert(sampleEvent({ id: 'a' }))
      await repository.insert(sampleEvent({ id: 'b' }))

      const events = await repository.findByIds(['b', 'missing', 'a'])

      expect(events.map((e) => e.id).sort()).toEqual(['a', 'b'])
    })

    it('参加者を追加し、同じ ID なら上書きする（回答順は維持）', async () => {
      await repository.insert(sampleEvent())
      await repository.saveParticipant('ev1', { id: 'p1', name: 'A', answers: { '2026-10-09_noon': 'yes' } })
      await repository.saveParticipant('ev1', { id: 'p2', name: 'B', answers: {} })
      await repository.saveParticipant('ev1', {
        id: 'p1',
        name: 'A2',
        comment: '変更',
        answers: { '2026-10-09_noon': 'no' },
      })

      const event = await repository.findById('ev1')
      expect(event?.participants).toEqual([
        { id: 'p1', name: 'A2', comment: '変更', answers: { '2026-10-09_noon': 'no' } },
        { id: 'p2', name: 'B', answers: {} },
      ])
    })

    it('決定した候補を設定・解除できる', async () => {
      await repository.insert(sampleEvent())

      await repository.setDecision('ev1', '2026-10-10_late')
      expect((await repository.findById('ev1'))?.decidedCandidateId).toBe('2026-10-10_late')

      await repository.setDecision('ev1', undefined)
      expect((await repository.findById('ev1'))?.decidedCandidateId).toBeUndefined()
    })

    it('イベント情報を部分更新でき、null で値を消せる', async () => {
      await repository.insert(sampleEvent())

      await repository.updateDetails('ev1', { title: '改題', memo: null })

      const event = await repository.findById('ev1')
      expect(event).toMatchObject({ title: '改題', organizer: 'はるか', deadline: '2026-10-05' })
      expect(event?.memo).toBeUndefined()
    })

    it('イベントを削除すると候補・回答・予約も消える', async () => {
      await repository.insert(sampleEvent())
      await repository.saveParticipant('ev1', { id: 'p1', name: 'A', answers: {} })
      await repository.setDecision('ev1', '2026-10-09_noon')
      await repository.setReservation('ev1', { theater: 'TOHO新宿', reservedAt: '2026-09-28T00:00:00.000Z' })

      await repository.delete('ev1')

      expect(await repository.findById('ev1')).toBeUndefined()
    })

    it('参加者を削除できる', async () => {
      await repository.insert(sampleEvent())
      await repository.saveParticipant('ev1', { id: 'p1', name: 'A', answers: {} })
      await repository.saveParticipant('ev1', { id: 'p2', name: 'B', answers: {} })

      await repository.deleteParticipant('ev1', 'p1')

      expect((await repository.findById('ev1'))?.participants.map((p) => p.id)).toEqual(['p2'])
    })

    it('予約を登録・上書き・解除できる', async () => {
      await repository.insert(sampleEvent())
      const reservation = {
        theater: 'TOHOシネマズ新宿',
        showtime: '18:30',
        note: 'J列',
        reservedBy: 'はるか',
        reservedAt: '2026-09-28T01:02:03.000Z',
      }

      await repository.setReservation('ev1', reservation)
      expect((await repository.findById('ev1'))?.reservation).toEqual(reservation)

      await repository.setReservation('ev1', { theater: '109シネマズ', reservedAt: '2026-09-29T00:00:00.000Z' })
      expect((await repository.findById('ev1'))?.reservation).toEqual({
        theater: '109シネマズ',
        reservedAt: '2026-09-29T00:00:00.000Z',
      })

      await repository.setReservation('ev1', undefined)
      expect((await repository.findById('ev1'))?.reservation).toBeUndefined()
    })

    it('取得したオブジェクトを変更しても保存内容に影響しない', async () => {
      await repository.insert(sampleEvent())
      const event = await repository.findById('ev1')
      event?.participants.push({ id: 'x', name: 'x', answers: {} })

      expect((await repository.findById('ev1'))?.participants).toEqual([])
    })
  })
}
