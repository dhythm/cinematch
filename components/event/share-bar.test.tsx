import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from '@/lib/clipboard'
import { ShareBar } from './share-bar'

// vi.mock は import より先に巻き上げられるので、上の import はモックを受け取る
vi.mock('@/lib/clipboard', () => ({ copyText: vi.fn() }))

// vitest の globals を使っていないので、RTL の自動クリーンアップは自分で登録する
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function clickCopy() {
  screen.getByRole('button', { name: 'URLをコピー' }).click()
}

describe('ShareBar', () => {
  it('表示中のサイトのオリジンで共有 URL を組み立てる', () => {
    render(<ShareBar path="/e/abc123" label="共有URL" />)

    expect(screen.getByText(`${window.location.origin}/e/abc123`)).toBeTruthy()
  })

  it('コピーできたら「コピーしました」に変わる', async () => {
    vi.mocked(copyText).mockResolvedValue(true)
    render(<ShareBar path="/e/abc123" label="共有URL" />)

    clickCopy()
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'コピーしました' })).toBeTruthy())
    expect(copyText).toHaveBeenCalledWith(`${window.location.origin}/e/abc123`)
  })

  it('コピーできなかったら成功と表示しない（シークレットモードなどで無言の失敗にしない）', async () => {
    vi.mocked(copyText).mockResolvedValue(false)
    render(<ShareBar path="/e/abc123" label="共有URL" />)

    clickCopy()
    await vi.waitFor(() => expect(copyText).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'コピーしました' })).toBeNull()
    expect(screen.getByRole('button', { name: 'URLをコピー' })).toBeTruthy()
  })

  it('コピーできなかったら手動で選べるよう URL を選択状態にする', async () => {
    vi.mocked(copyText).mockResolvedValue(false)
    render(<ShareBar path="/e/abc123" label="共有URL" />)

    clickCopy()
    await vi.waitFor(() => expect(window.getSelection()?.toString()).toBe(`${window.location.origin}/e/abc123`))
  })
})
