import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EventSummary, EventView, Movie } from '@/lib/types'
import * as decision from './events/[id]/decision/route'
import * as participants from './events/[id]/participants/route'
import * as eventById from './events/[id]/route'
import * as events from './events/route'
import * as movies from './movies/route'

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const json = (method: string, body: unknown) =>
  new Request('http://test/api', {
    method,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-09-27T00:00:00+09:00'), toFake: ['Date'] })
  vi.stubEnv('MOVIE_SOURCE', 'fixture')
  vi.stubEnv('DATA_STORE', 'memory')
  delete (globalThis as { __cinematchContainer?: unknown }).__cinematchContainer
  return () => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  }
})

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
    await decision.PUT(json('PUT', { candidateId: (await demoCandidateId()) ?? '' }), ctx('demo'))

    const response = await participants.POST(json('POST', { name: 'x', answers: {} }), ctx('demo'))

    expect(response.status).toBe(409)
  })
})

async function demoCandidateId() {
  const response = await eventById.GET(new Request('http://test'), ctx('demo'))
  return ((await response.json()) as EventView).candidates[0]?.id
}
