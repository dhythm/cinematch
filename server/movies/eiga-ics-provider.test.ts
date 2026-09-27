import { describe, expect, it, vi } from 'vitest'
import { createEigaIcsProvider } from './eiga-ics-provider'

const ICS = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'UID:movie-101@eiga.com',
  'DTSTART;VALUE=DATE:20261002',
  'SUMMARY:夏雲のむこうがわ',
  'DESCRIPTION:海辺の町で過ごす最後の夏。',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:movie-999@eiga.com',
  'DTSTART;VALUE=DATE:20270101',
  'SUMMARY:範囲外',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

describe('createEigaIcsProvider', () => {
  it('ICS を取得し、範囲内の VEVENT を Movie に変換する', async () => {
    const fetch = vi.fn(async (_input: string | URL | Request) => new Response(ICS))
    const provider = createEigaIcsProvider({ url: 'https://example.com/release.ics', fetch })

    const movies = await provider.fetchMovies({ from: '2026-09-14', to: '2026-11-26' })

    expect(fetch).toHaveBeenCalledWith('https://example.com/release.ics', expect.anything())
    expect(movies).toEqual([
      {
        id: 'eiga-movie-101',
        title: '夏雲のむこうがわ',
        releaseDate: '2026-10-02',
        genres: [],
        poster: '/placeholder.svg',
        synopsis: '海辺の町で過ごす最後の夏。',
        source: 'eiga',
      },
    ])
  })
})
