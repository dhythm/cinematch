import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMyEventIds } from '@/lib/my-events'
import type { EventSummary } from '@/lib/types'
import { MyEvents } from './my-events'

vi.mock('@/lib/my-events', () => ({ useMyEventIds: vi.fn() }))
vi.mock('@/lib/api/queries', () => ({ eventSummariesQuery: vi.fn(() => ({ queryKey: ['stub'], queryFn: stubFetch })) }))

let summaries: EventSummary[] = []
const stubFetch = async () => summaries

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  summaries = []
})

const event = (overrides: Partial<EventSummary> = {}): EventSummary => ({
  id: 'abc',
  title: '『夏雲のむこうがわ』を観に行く会',
  poster: '/posters/p2.png',
  respondentCount: 3,
  reserved: false,
  isOrganizer: true,
  ...overrides,
})

describe('MyEvents', () => {
  it('履歴が無ければ何も描画しない（別の端末で「消えた」と見せないため）', () => {
    vi.mocked(useMyEventIds).mockReturnValue([])

    const { container } = render(<MyEvents />, { wrapper })

    expect(container.innerHTML).toBe('')
  })

  it('履歴があれば一覧を出し、このブラウザだけの保存であることを明記する', async () => {
    vi.mocked(useMyEventIds).mockReturnValue(['abc'])
    summaries = [event()]

    render(<MyEvents />, { wrapper })

    expect(await screen.findByRole('link', { name: /夏雲のむこうがわ/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '最近ひらいたイベント' })).toBeTruthy()
    expect(screen.getByText(/このブラウザに保存/)).toBeTruthy()
  })

  it('ID はあるが取得結果が空なら描画しない（削除されたイベントなど）', async () => {
    vi.mocked(useMyEventIds).mockReturnValue(['gone'])
    summaries = []

    const { container } = render(<MyEvents />, { wrapper })

    await vi.waitFor(() => expect(container.innerHTML).toBe(''))
  })
})
