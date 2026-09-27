import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError, apiFetch } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('JSON ボディを送り、レスポンスを返す', async () => {
    const fetch = vi.fn(async (_input: string, _init?: RequestInit) => Response.json({ ok: true }))
    vi.stubGlobal('fetch', fetch)

    await expect(apiFetch('/api/x', { method: 'POST', json: { a: 1 } })).resolves.toEqual({ ok: true })
    const [, init] = fetch.mock.calls[0] ?? []
    expect(init?.body).toBe('{"a":1}')
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json')
  })

  it('204 は undefined を返す', async () => {
    vi.stubGlobal('fetch', async () => new Response(null, { status: 204 }))

    await expect(apiFetch('/api/x', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('エラーレスポンスは ApiRequestError（ステータスとコード付き）にする', async () => {
    vi.stubGlobal('fetch', async () =>
      Response.json({ error: { code: 'not_found', message: 'event x not found' } }, { status: 404 }),
    )

    const error = await apiFetch('/api/x').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error).toMatchObject({ status: 404, code: 'not_found', message: 'event x not found' })
  })
})
