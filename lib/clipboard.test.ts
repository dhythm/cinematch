// lib/*.test.ts の既定は node 環境だが、navigator と document を触るので jsdom で動かす
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './clipboard'

function stubClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, 'clipboard', {
    value: writeText ? { writeText } : undefined,
    configurable: true,
  })
}

afterEach(() => {
  stubClipboard(undefined)
  vi.unstubAllGlobals()
})

describe('copyText', () => {
  it('Clipboard API で書き込めたら true', async () => {
    const writeText = vi.fn(async () => {})
    stubClipboard(writeText)

    expect(await copyText('https://example.test/e/abc')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('https://example.test/e/abc')
  })

  it('Clipboard API が拒否されたら execCommand にフォールバックする（プライベートブラウジングなど）', async () => {
    stubClipboard(vi.fn(async () => Promise.reject(new Error('denied'))))
    const execCommand = vi.fn(() => true)
    vi.stubGlobal('document', Object.assign(document, { execCommand }))

    expect(await copyText('https://example.test/e/abc')).toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
  })

  it('Clipboard API が無くても execCommand で書き込める（http などの非セキュアな文脈）', async () => {
    stubClipboard(undefined)
    const execCommand = vi.fn(() => true)
    vi.stubGlobal('document', Object.assign(document, { execCommand }))

    expect(await copyText('https://example.test/e/abc')).toBe(true)
  })

  it('どちらも使えなければ false（成功したと偽らない）', async () => {
    stubClipboard(vi.fn(async () => Promise.reject(new Error('denied'))))
    vi.stubGlobal(
      'document',
      Object.assign(document, {
        execCommand: vi.fn(() => {
          throw new Error('unsupported')
        }),
      }),
    )

    expect(await copyText('https://example.test/e/abc')).toBe(false)
  })

  it('フォールバックで作った要素は後に残さない', async () => {
    stubClipboard(undefined)
    vi.stubGlobal('document', Object.assign(document, { execCommand: vi.fn(() => true) }))

    await copyText('https://example.test/e/abc')

    expect(document.querySelectorAll('textarea')).toHaveLength(0)
  })
})
