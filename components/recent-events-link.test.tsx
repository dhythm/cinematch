import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMyEventIds } from '@/lib/my-events'
import { RecentEventsLink } from './recent-events-link'

vi.mock('@/lib/my-events', () => ({ useMyEventIds: vi.fn() }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('RecentEventsLink', () => {
  it('履歴があればリンクを出す', () => {
    vi.mocked(useMyEventIds).mockReturnValue(['abc'])

    render(<RecentEventsLink />)

    expect(screen.getByRole('link', { name: '最近のイベント' }).getAttribute('href')).toBe('/#my-events')
  })

  it('履歴が無ければ出さない（押しても何も無い状態をつくらない）', () => {
    vi.mocked(useMyEventIds).mockReturnValue([])

    const { container } = render(<RecentEventsLink />)

    expect(container.innerHTML).toBe('')
  })
})
