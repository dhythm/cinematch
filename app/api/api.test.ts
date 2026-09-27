import { NextRequest } from 'next/server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { EventSummary, EventView, Movie } from '@/lib/types'
import { getContainer } from '@/server/container'
import * as organizerEntry from '../e/[id]/organizer/route'
import * as decision from './events/[id]/decision/route'
import * as participantById from './events/[id]/participants/[participantId]/route'
import * as participants from './events/[id]/participants/route'
import * as reservation from './events/[id]/reservation/route'
import * as eventById from './events/[id]/route'
import * as events from './events/route'
import * as movies from './movies/route'

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const participantCtx = (id: string, participantId: string) => ({ params: Promise.resolve({ id, participantId }) })

/** cookie: 送るクッキー（"name=value"）。幹事として操作するときに付ける */
function request(
  method: string,
  { body, cookie, url = 'http://test/api' }: { body?: unknown; cookie?: string; url?: string } = {},
) {
  const headers = new Headers()
  if (body !== undefined) headers.set('content-type', 'application/json')
  if (cookie) headers.set('cookie', cookie)
  return new NextRequest(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
}

// PGlite（WASM）の起動・マイグレーション・シードは重いので、ファイル内で 1 つのコンテナを共有する。
// 各テストは自分で作ったイベントだけを操作する（共有のデモイベントは書き換えない）
beforeAll(async () => {
  vi.useFakeTimers({ now: new Date('2026-09-27T00:00:00+09:00'), toFake: ['Date'] })
  vi.stubEnv('DATABASE_URL', '')
  delete (globalThis as { __cinematchanContainer?: unknown }).__cinematchanContainer
  await getContainer()
})

afterAll(() => {
  delete (globalThis as { __cinematchanContainer?: unknown }).__cinematchanContainer
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

/** 幹事としてイベントを作り、レスポンスの Set-Cookie（幹事クッキー）を返す */
async function createEvent() {
  const response = await events.POST(
    request('POST', { body: { movieId: 'itetsuku', title: '観る会', dates: ['2026-10-09'], slots: ['noon', 'late'] } }),
  )
  const event = (await response.json()) as EventView
  const setCookie = response.headers.get('set-cookie') ?? ''
  return { event, id: event.id, organizerCookie: setCookie.split(';')[0] ?? '', setCookie }
}

describe('API: 基本', () => {
  it('GET /api/movies は調整可能な作品を返す', async () => {
    const response = await movies.GET()
    const body = (await response.json()) as { movies: Movie[] }

    expect(response.status).toBe(200)
    expect(body.movies[0]).toMatchObject({ id: 'natsugumo', releaseDate: '2026-10-02' })
  })

  it('イベント作成 → 回答 → 決定 → サマリー取得の一連の流れ', async () => {
    const { id, organizerCookie } = await createEvent()

    const answered = await participants.POST(
      request('POST', { body: { name: 'はるか', answers: { '2026-10-09_late': 'yes' } } }),
      ctx(id),
    )
    expect(((await answered.json()) as EventView).best?.candidateId).toBe('2026-10-09_late')

    const decided = await decision.PUT(
      request('PUT', { body: { candidateId: '2026-10-09_late' }, cookie: organizerCookie }),
      ctx(id),
    )
    expect(((await decided.json()) as EventView).decidedCandidateId).toBe('2026-10-09_late')

    const list = await events.GET(request('GET', { url: `http://test/api/events?ids=${id},missing` }))
    const summaries = ((await list.json()) as { events: EventSummary[] }).events
    expect(summaries.map((s) => s.id)).toEqual([id])
  })

  it('開発時はデモイベントが用意されている', async () => {
    const response = await eventById.GET(request('GET'), ctx('demo'))

    expect(response.status).toBe(200)
  })

  it('入力が不正なら 400', async () => {
    const response = await events.POST(
      request('POST', { body: { movieId: 'itetsuku', title: '', dates: [], slots: [] } }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'invalid' } })
  })

  it('JSON でないボディは 400', async () => {
    const response = await events.POST(new NextRequest('http://test', { method: 'POST', body: 'oops' }))

    expect(response.status).toBe(400)
  })

  it('存在しないイベントは 404', async () => {
    expect((await eventById.GET(request('GET'), ctx('missing'))).status).toBe(404)
  })

  it('決定済みイベントへの回答は 409', async () => {
    const { id, organizerCookie } = await createEvent()
    await decision.PUT(request('PUT', { body: { candidateId: '2026-10-09_noon' }, cookie: organizerCookie }), ctx(id))

    const response = await participants.POST(request('POST', { body: { name: 'x', answers: {} } }), ctx(id))

    expect(response.status).toBe(409)
  })
})

describe('API: 幹事キー', () => {
  it('作成者には HttpOnly の幹事クッキーが設定され、幹事として扱われる', async () => {
    const { event, id, organizerCookie, setCookie } = await createEvent()

    expect(event.isOrganizer).toBe(true)
    expect(setCookie).toContain(`organizer_${id}=${event.organizerKey}`)
    expect(setCookie).toMatch(/HttpOnly/i)
    expect(setCookie).toMatch(/SameSite=lax/i)

    const asOrganizer = (await (
      await eventById.GET(request('GET', { cookie: organizerCookie }), ctx(id))
    ).json()) as EventView
    const asGuest = (await (await eventById.GET(request('GET'), ctx(id))).json()) as EventView
    expect(asOrganizer).toMatchObject({ isOrganizer: true, organizerKey: event.organizerKey })
    expect(asGuest.isOrganizer).toBe(false)
    expect(asGuest).not.toHaveProperty('organizerKey')
  })

  it('幹事クッキーが無いと幹事操作は 403', async () => {
    const { id, organizerCookie } = await createEvent()
    await decision.PUT(request('PUT', { body: { candidateId: '2026-10-09_noon' }, cookie: organizerCookie }), ctx(id))

    const responses = await Promise.all([
      eventById.PATCH(request('PATCH', { body: { title: 'x' } }), ctx(id)),
      eventById.DELETE(request('DELETE'), ctx(id)),
      decision.PUT(request('PUT', { body: { candidateId: '2026-10-09_late' } }), ctx(id)),
      decision.DELETE(request('DELETE'), ctx(id)),
      reservation.PUT(request('PUT', { body: { theater: 'TOHO' } }), ctx(id)),
      reservation.DELETE(request('DELETE'), ctx(id)),
    ])

    expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403, 403, 403])
  })

  it('別のイベントの幹事クッキーでは幹事になれない', async () => {
    const mine = await createEvent()
    const other = await createEvent()
    const forged = `organizer_${other.id}=${mine.event.organizerKey}`

    const response = await eventById.PATCH(request('PATCH', { body: { title: 'x' }, cookie: forged }), ctx(other.id))

    expect(response.status).toBe(403)
  })

  it('サマリーは幹事かどうかを示す', async () => {
    const mine = await createEvent()
    const other = await createEvent()

    const list = await events.GET(
      request('GET', { url: `http://test/api/events?ids=${mine.id},${other.id}`, cookie: mine.organizerCookie }),
    )
    const summaries = ((await list.json()) as { events: EventSummary[] }).events

    expect(Object.fromEntries(summaries.map((s) => [s.id, s.isOrganizer]))).toEqual({
      [mine.id]: true,
      [other.id]: false,
    })
  })

  it('幹事用 URL を開くとクッキーを設定し、キーを消した URL にリダイレクトする', async () => {
    const { event, id } = await createEvent()

    const response = await organizerEntry.GET(
      request('GET', { url: `http://test/e/${id}/organizer?key=${event.organizerKey}` }),
      ctx(id),
    )

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(`http://test/e/${id}`)
    expect(response.headers.get('set-cookie')).toContain(`organizer_${id}=${event.organizerKey}`)
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
  })

  it('幹事用 URL のキーが違えばクッキーを設定せずにイベントへ戻す', async () => {
    const { id } = await createEvent()

    const response = await organizerEntry.GET(
      request('GET', { url: `http://test/e/${id}/organizer?key=wrong` }),
      ctx(id),
    )

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(`http://test/e/${id}`)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('イベントを削除すると幹事クッキーも消す', async () => {
    const { id, organizerCookie } = await createEvent()

    const response = await eventById.DELETE(request('DELETE', { cookie: organizerCookie }), ctx(id))

    expect(response.status).toBe(204)
    expect(response.headers.get('set-cookie')).toMatch(new RegExp(`organizer_${id}=;`))
  })
})

describe('API: 更新・削除・予約（幹事）', () => {
  it('PATCH でイベント情報を更新し、空文字で値を消せる', async () => {
    const { id, organizerCookie } = await createEvent()

    const response = await eventById.PATCH(
      request('PATCH', { body: { title: '改題', memo: '' }, cookie: organizerCookie }),
      ctx(id),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ title: '改題', isOrganizer: true })
  })

  it('DELETE でイベントを削除する', async () => {
    const { id, organizerCookie } = await createEvent()

    expect((await eventById.DELETE(request('DELETE', { cookie: organizerCookie }), ctx(id))).status).toBe(204)
    expect((await eventById.GET(request('GET'), ctx(id))).status).toBe(404)
  })

  it('DELETE で回答を削除する（参加者でもできる）', async () => {
    const { id } = await createEvent()
    const answered = (await (
      await participants.POST(request('POST', { body: { name: 'A', answers: {} } }), ctx(id))
    ).json()) as EventView
    const participantId = answered.participants[0]?.id ?? ''

    const response = await participantById.DELETE(request('DELETE'), participantCtx(id, participantId))

    expect(((await response.json()) as EventView).participants).toEqual([])
  })

  it('決定後に予約を登録・取り消しできる', async () => {
    const { id, organizerCookie } = await createEvent()
    await decision.PUT(request('PUT', { body: { candidateId: '2026-10-09_noon' }, cookie: organizerCookie }), ctx(id))

    const reserved = await reservation.PUT(
      request('PUT', { body: { theater: 'TOHO新宿', showtime: '12:30' }, cookie: organizerCookie }),
      ctx(id),
    )
    expect(reserved.status).toBe(200)
    expect(((await reserved.json()) as EventView).reservation).toMatchObject({ theater: 'TOHO新宿', showtime: '12:30' })

    const cancelled = await reservation.DELETE(request('DELETE', { cookie: organizerCookie }), ctx(id))
    expect(((await cancelled.json()) as EventView).reservation).toBeUndefined()
  })

  it('未決定のイベントの予約は 409、不正な時刻は 400', async () => {
    const { id, organizerCookie } = await createEvent()

    const unDecided = await reservation.PUT(
      request('PUT', { body: { theater: 'TOHO' }, cookie: organizerCookie }),
      ctx(id),
    )
    const badTime = await reservation.PUT(
      request('PUT', { body: { theater: 'TOHO', showtime: '25:00' }, cookie: organizerCookie }),
      ctx(id),
    )

    expect(unDecided.status).toBe(409)
    expect(badTime.status).toBe(400)
  })
})
