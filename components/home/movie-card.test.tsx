import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/types'
import { MovieCard } from './movie-card'

function movie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 'tmdb-1',
    title: '夏雲のむこうがわ',
    releaseDate: '2026-10-02',
    runtime: 118,
    genres: ['アニメ', '青春'],
    poster: '/posters/p2.png',
    synopsis: 'あらすじ',
    source: 'tmdb',
    ...overrides,
  }
}

// vitest の globals を使っていないので、RTL の自動クリーンアップは自分で登録する
afterEach(cleanup)

describe('MovieCard', () => {
  it('作品全体が調整ページへのリンクになっている', () => {
    render(<MovieCard movie={movie()} />)

    const link = screen.getByRole('link', { name: /夏雲のむこうがわ/ })
    expect(link.getAttribute('href')).toBe('/new?movie=tmdb-1')
  })

  it('ポスター画像がリンクの中にある（画像クリックで遷移できる）', () => {
    render(<MovieCard movie={movie()} />)

    const poster = screen.getByAltText('夏雲のむこうがわのポスター')
    expect(screen.getByRole('link', { name: /夏雲のむこうがわ/ }).contains(poster)).toBe(true)
  })

  it('出典は画面下部のフッターにまとめるので、カードには出さない', () => {
    render(<MovieCard movie={movie()} />)

    expect(screen.queryByText('TMDB')).toBeNull()
  })
})
