import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SiteFooter } from './site-footer'

// vitest の globals を使っていないので、RTL の自動クリーンアップは自分で登録する
afterEach(cleanup)

describe('SiteFooter', () => {
  it('TMDB の公式ロゴを TMDB へのリンクとして表示する（利用規約の要件）', () => {
    render(<SiteFooter />)

    const logo = screen.getByAltText('TMDB')
    expect(logo.getAttribute('src')).toBe('/tmdb-logo.svg')
    expect(logo.closest('a')?.getAttribute('href')).toBe('https://www.themoviedb.org/')
  })

  it('TMDB の免責文を表示する（利用規約の要件）', () => {
    render(<SiteFooter />)

    expect(screen.getByText('This product uses the TMDB API but is not endorsed or certified by TMDB.')).toBeTruthy()
  })

  it('問い合わせ先として GitHub と X のリンクを表示する', () => {
    render(<SiteFooter />)

    expect(screen.getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe(
      'https://github.com/dhythm/cinematchan',
    )
    expect(screen.getByRole('link', { name: 'X (@dhythm_dev)' }).getAttribute('href')).toBe('https://x.com/dhythm_dev')
  })
})
