import { addDays } from '@/lib/date'
import type { Movie, ScheduleEvent } from '@/lib/types'
import { buildCandidates } from '@/server/domain/schedule'
import type { EventRepository } from './event-repository'

const DEMO_EVENT_ID = 'demo'

/** 開発・E2E 用のサンプルイベント。/e/demo で確認できる */
export async function seedDemoEvent(repository: EventRepository, movie: Movie) {
  if (await repository.findById(DEMO_EVENT_ID)) return
  const day = (offset: number) => addDays(movie.releaseDate, offset)
  const candidates = [
    ...buildCandidates([day(0), day(7)], ['late']),
    ...buildCandidates([day(1), day(2), day(8)], ['noon', 'evening']),
  ].sort((a, b) => a.id.localeCompare(b.id))
  const answersFor = (pattern: string) =>
    Object.fromEntries(
      candidates.flatMap((c, i) => {
        const answer = ({ o: 'yes', '^': 'maybe', x: 'no' } as const)[pattern[i] ?? '-']
        return answer ? [[c.id, answer]] : []
      }),
    )

  const event: ScheduleEvent = {
    id: DEMO_EVENT_ID,
    movie,
    title: `『${movie.title}』IMAXで観る会`,
    organizer: 'はるか',
    memo: 'IMAXレーザーで観たいので、席が取れそうな回を優先したいです。決まったら私がまとめて予約します！',
    deadline: day(-4),
    candidates,
    participants: [
      { id: 'demo-p1', name: 'はるか', comment: '初週末がいいな〜', answers: answersFor('^oooxoxo^') },
      { id: 'demo-p2', name: 'けんと', answers: answersFor('oxo^oxoox') },
      { id: 'demo-p3', name: 'みお', comment: '土曜の夜は遅くても大丈夫', answers: answersFor('x^oooo^^o') },
    ],
    createdAt: new Date().toISOString(),
  }
  await repository.insert(event)
}
