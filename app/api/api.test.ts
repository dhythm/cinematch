import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { EventSummary, EventView, Movie } from '@/lib/types'
import { getContainer } from '@/server/container'
import * as decision from './events/[id]/decision/route'
import * as participantById from './events/[id]/participants/[participantId]/route'
import * as participants from './events/[id]/participants/route'
import * as reservation from './events/[id]/reservation/route'
import * as eventById from './events/[id]/route'
import * as events from './events/route'
import * as movies from './movies/route'

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const participantCtx = (id: string, participantId: string) => ({ params: Promise.resolve({ id, participantId }) })
const json = (method: string, body: unknown) =>
  new Request('http://test/api', {
    method,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })

// PGlite（WASM）の起動・マイグレーション・シードは重いので、ファイル内で 1 つのコンテナを共有する。
// 各テストは自分で作ったイベントだけを操作する（共有のデモイベントは書き換えない）
beforeAll(async () => {
  vi.useFakeTimers({ now: new Date('2026-09-27T00:00:00+09:00'), toFake: ['Date'] })
  vi.stubEnv('DATABASE_URL', '')
  delete (globalThis as { __cinematchContainer?: unknown }).__cinematchContainer
  await getContainer()
})

afterAll(() => {
  delete (globalThis as { __cinematchContainer?: unknown }).__cinematchContainer
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

async function createEvent() {
  const response = await events.POST(
    json('POST', { movieId: 'itetsuku', title: '観る会', dates: ['2026-10-09'], slots: ['noon', 'late'] }),
  )
  return (await response.json()) as EventView
}

describe('API', () => {
  it('GET /api/movies は調整可能な作品を返す', async () => {
    const response = await movies.GET()
    const body = (await response.json()) as { movies: Movie[] }

    expect(response.status).toBe(200)
    expect(body.movies[0]).toMatchObject({ id: 'natsugumo', releaseDate: '2026-10-02' })
  })

  it('イベント作成 → 回答 → 決定 → サマリー取得の一連の流れ', async () => {
    const created = await events.POST(
      json('POST', { movieId: 'itetsuku', title: '観る会', dates: ['2026-10-09', '2026-10-10'], slots: ['noon'] }),
    )
    expect(created.status).toBe(201)
    const { id } = (await created.json()) as EventView

    const answered = await participants.POST(
      json('POST', { name: 'はるか', answers: { '2026-10-10_noon': 'yes' } }),
      ctx(id),
    )
    expect(((await answered.json()) as EventView).best?.candidateId).toBe('2026-10-10_noon')

    const decided = await decision.PUT(json('PUT', { candidateId: '2026-10-10_noon' }), ctx(id))
    expect(((await decided.json()) as EventView).decidedCandidateId).toBe('2026-10-10_noon')

    const fetched = await eventById.GET(new Request('http://test'), ctx(id))
    expect(((await fetched.json()) as EventView).participants).toHaveLength(1)

    const list = await events.GET(new Request(`http://test/api/events?ids=${id},missing`))
    const summaries = ((await list.json()) as { events: EventSummary[] }).events
    expect(summaries.map((s) => s.id)).toEqual([id])

    const reopened = await decision.DELETE(new Request('http://test'), ctx(id))
    expect(((await reopened.json()) as EventView).decidedCandidateId).toBeUndefined()
  })

  it('開発時はデモイベントが用意されている', async () => {
    const response = await eventById.GET(new Request('http://test'), ctx('demo'))

    expect(response.status).toBe(200)
  })

  it('入力が不正なら 400', async () => {
    const response = await events.POST(json('POST', { movieId: 'itetsuku', title: '', dates: [], slots: [] }))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'invalid' } })
  })

  it('JSON でないボディは 400', async () => {
    const response = await events.POST(new Request('http://test', { method: 'POST', body: 'oops' }))

    expect(response.status).toBe(400)
  })

  it('存在しないイベントは 404', async () => {
    const response = await eventById.GET(new Request('http://test'), ctx('missing'))

    expect(response.status).toBe(404)
  })

  it('決定済みイベントへの回答は 409', async () => {
    const { id } = await createEvent()
    await decision.PUT(json('PUT', { candidateId: '2026-10-09_noon' }), ctx(id))

    const response = await participants.POST(json('POST', { name: 'x', answers: {} }), ctx(id))

    expect(response.status).toBe(409)
  })
})

describe('API: 更新・削除・予約', () => {
  it('PATCH でイベント情報を更新し、空文字で値を消せる', async () => {
    const { id } = await createEvent()

    const response = await eventById.PATCH(json('PATCH', { title: '改題', memo: '' }), ctx(id))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ title: '改題' })
  })

  it('DELETE でイベントを削除する', async () => {
    const { id } = await createEvent()

    expect((await eventById.DELETE(new Request('http://test'), ctx(id))).status).toBe(204)
    expect((await eventById.GET(new Request('http://test'), ctx(id))).status).toBe(404)
  })

  it('DELETE で回答を削除する', async () => {
    const { id } = await createEvent()
    const answered = (await (
      await participants.POST(json('POST', { name: 'A', answers: {} }), ctx(id))
    ).json()) as EventView
    const participantId = answered.participants[0]?.id ?? ''

    const response = await participantById.DELETE(new Request('http://test'), participantCtx(id, participantId))

    expect(((await response.json()) as EventView).participants).toEqual([])
  })

  it('決定後に予約を登録・取り消しできる', async () => {
    const { id } = await createEvent()
    await decision.PUT(json('PUT', { candidateId: '2026-10-09_noon' }), ctx(id))

    const reserved = await reservation.PUT(json('PUT', { theater: 'TOHO新宿', showtime: '12:30' }), ctx(id))
    expect(reserved.status).toBe(200)
    expect(((await reserved.json()) as EventView).reservation).toMatchObject({ theater: 'TOHO新宿', showtime: '12:30' })

    const cancelled = await reservation.DELETE(new Request('http://test'), ctx(id))
    expect(((await cancelled.json()) as EventView).reservation).toBeUndefined()
  })

  it('未決定のイベントの予約は 409、不正な時刻は 400', async () => {
    const { id } = await createEvent()

    expect((await reservation.PUT(json('PUT', { theater: 'TOHO' }), ctx(id))).status).toBe(409)
    expect((await reservation.PUT(json('PUT', { theater: 'TOHO', showtime: '25:00' }), ctx(id))).status).toBe(400)
  })
})
