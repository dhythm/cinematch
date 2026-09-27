import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ShareBar } from './share-bar'

describe('ShareBar', () => {
  it('表示中のサイトのオリジンで共有 URL を組み立てる', () => {
    render(<ShareBar path="/e/abc123" label="共有URL" />)

    expect(screen.getByText(`${window.location.origin}/e/abc123`)).toBeTruthy()
  })
})
