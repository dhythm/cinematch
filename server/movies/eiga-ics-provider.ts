import type { Movie } from '@/lib/types'
import { parseIcs } from './ics'
import type { MovieProvider } from './movie-catalog'

type Options = { url: string; fetch?: typeof globalThis.fetch }

/** 映画.com が配布する公開予定カレンダー（iCalendar）から作品を取り込む */
export function createEigaIcsProvider({ url, fetch = globalThis.fetch }: Options): MovieProvider {
  return {
    name: 'eiga',
    async fetchMovies(range) {
      const response = await fetch(url, { headers: { accept: 'text/calendar' } })
      if (!response.ok) throw new Error(`eiga.com ICS request failed: ${response.status}`)
      return parseIcs(await response.text())
        .filter((event) => event.startDate >= range.from && event.startDate <= range.to)
        .map(
          (event): Movie => ({
            id: `eiga-${event.uid.split('@')[0]?.replace(/[^\w-]/g, '')}`,
            title: event.summary,
            releaseDate: event.startDate,
            genres: [],
            poster: '/placeholder.svg',
            synopsis: event.description ?? '',
            source: 'eiga',
          }),
        )
    },
  }
}
