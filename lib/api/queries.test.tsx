import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EventView } from '@/lib/types'
import { eventKeys } from './keys'
import { useSaveParticipant } from './queries'

afterEach(() => {
  vi.unstubAllGlobals()
})

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useSaveParticipant', () => {
  it('サーバーが返した集計済みイベントでキャッシュを置き換える', async () => {
    const updated = { id: 'ev1', participants: [{ id: 'p1', name: 'A', answers: {} }] } as unknown as EventView
    const fetch = vi.fn(async (_input: string, _init?: RequestInit) => Response.json(updated))
    vi.stubGlobal('fetch', fetch)
    const client = new QueryClient()

    const { result } = renderHook(() => useSaveParticipant('ev1'), { wrapper: wrapper(client) })
    result.current.mutate({ name: 'A', answers: {} })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/events/ev1/participants')
    expect(client.getQueryData(eventKeys.detail('ev1'))).toEqual(updated)
  })
})
