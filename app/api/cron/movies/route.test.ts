import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Container } from '@/server/container'
import * as container from '@/server/container'
import { GET } from './route'

function request(authorization?: string) {
  const headers = new Headers()
  if (authorization) headers.set('authorization', authorization)
  return new NextRequest('http://test/api/cron/movies', { headers })
}

function stubContainer(syncMovies: Container['syncMovies']) {
  vi.spyOn(container, 'getContainer').mockResolvedValue({ syncMovies } as Container)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('GET /api/cron/movies', () => {
  it('CRON_SECRET が一致すれば取り込みを実行する', async () => {
    vi.stubEnv('CRON_SECRET', 'secret')
    const syncMovies = vi.fn(async () => ({ saved: 12, failures: [] }))
    stubContainer(syncMovies)

    const response = await GET(request('Bearer secret'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ saved: 12 })
    expect(syncMovies).toHaveBeenCalled()
  })

  it('CRON_SECRET が一致しなければ 401 で取り込まない', async () => {
    vi.stubEnv('CRON_SECRET', 'secret')
    const syncMovies = vi.fn(async () => ({ saved: 0, failures: [] }))
    stubContainer(syncMovies)

    const response = await GET(request('Bearer wrong'))

    expect(response.status).toBe(401)
    expect(syncMovies).not.toHaveBeenCalled()
  })

  it('Authorization ヘッダーが無ければ 401', async () => {
    vi.stubEnv('CRON_SECRET', 'secret')
    const syncMovies = vi.fn(async () => ({ saved: 0, failures: [] }))
    stubContainer(syncMovies)

    expect((await GET(request())).status).toBe(401)
    expect(syncMovies).not.toHaveBeenCalled()
  })

  it('本番で CRON_SECRET 未設定なら誰にも実行させない（誤って公開しないため）', async () => {
    vi.stubEnv('CRON_SECRET', '')
    vi.stubEnv('NODE_ENV', 'production')
    const syncMovies = vi.fn(async () => ({ saved: 0, failures: [] }))
    stubContainer(syncMovies)

    expect((await GET(request())).status).toBe(401)
    expect(syncMovies).not.toHaveBeenCalled()
  })

  it('取り込みに失敗したプロバイダがあれば 500 で知らせる（cron 側で気付けるように）', async () => {
    vi.stubEnv('CRON_SECRET', 'secret')
    stubContainer(async () => ({ saved: 3, failures: [{ provider: 'tmdb', error: new Error('down') }] }))

    const response = await GET(request('Bearer secret'))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ saved: 3, failed: ['tmdb'] })
  })
})
