import { and, eq, isNull } from 'drizzle-orm'
import { addDays } from '@/lib/date'
import type { Movie } from '@/lib/types'
import { hashOrganizerKey } from '@/server/domain/organizer-key'
import { buildCandidates } from '@/server/domain/schedule'
import { createDrizzleEventRepository } from '@/server/events/drizzle-event-repository'
import type { StoredEvent } from '@/server/events/event-repository'
import type { Database } from './client'
import { events, movies } from './schema'

type SeedMovie = Omit<Movie, 'releaseDate'> & { releaseOffsetDays: number }

/** 開発用のダミー映画。公開日はシード実行日（今日）からの相対日数で決まる */
const SEED_MOVIES: SeedMovie[] = [
  {
    id: 'natsugumo',
    title: '夏雲のむこうがわ',
    releaseOffsetDays: 5,
    runtime: 118,
    genres: ['アニメ', '青春'],
    poster: '/posters/p2.png',
    distributor: '東邦アニメーション',
    synopsis: '海辺の町で過ごす最後の夏。屋上で交わした約束が、ふたりの未来を静かに変えていく。',
    source: 'seed',
  },
  {
    id: 'itetsuku',
    title: '凍てつく海のアストロノート',
    originalTitle: 'Frozen Tide',
    releaseOffsetDays: 12,
    runtime: 142,
    genres: ['SF', 'アドベンチャー'],
    poster: '/posters/p1.png',
    distributor: 'ワーナー配給',
    synopsis: '環を持つ惑星の氷の海に取り残された宇宙飛行士。帰還までの残り時間はわずか72時間。',
    source: 'seed',
  },
  {
    id: 'last-highway',
    title: 'ラスト・ハイウェイ',
    originalTitle: 'Last Highway',
    releaseOffsetDays: 12,
    runtime: 115,
    genres: ['アクション'],
    poster: '/posters/p6.png',
    distributor: 'ソニー配給',
    synopsis: '砂漠を貫く一本道。追う者と追われる者、止まった方が負けのデスレースが始まる。',
    source: 'seed',
  },
  {
    id: 'amayo',
    title: '雨夜のディテクティブ',
    releaseOffsetDays: 19,
    runtime: 126,
    genres: ['サスペンス', 'ミステリー'],
    poster: '/posters/p3.png',
    distributor: '松竹映画',
    synopsis: 'ネオンが滲む新宿の路地裏。雨の夜にだけ現れる依頼人を、ひとりの探偵が追う。',
    source: 'seed',
  },
  {
    id: 'levia',
    title: '深海獣レヴィア',
    releaseOffsetDays: 26,
    runtime: 131,
    genres: ['怪獣', 'パニック'],
    poster: '/posters/p4.png',
    distributor: '東邦',
    synopsis: '東京湾に突如現れた巨大生物。首都機能が麻痺する中、人類最後の作戦が動き出す。',
    source: 'seed',
  },
  {
    id: 'chochin',
    title: 'ちょうちん森のコン',
    releaseOffsetDays: 33,
    runtime: 98,
    genres: ['ファミリー', 'ファンタジー'],
    poster: '/posters/p5.png',
    distributor: 'ギャガ配給',
    synopsis: '灯りのともる不思議な森で、迷子の少女と小さなキツネが出会う、ひと夏の冒険。',
    source: 'seed',
  },
]

export const DEMO_EVENT_ID = 'demo'
/** 開発用デモの幹事キー。/e/demo/organizer?key=demo-organizer-key で幹事として開ける（シードは本番では実行しない） */
export const DEMO_ORGANIZER_KEY = 'demo-organizer-key'

function demoEvent(movie: Movie): StoredEvent {
  const day = (offset: number) => addDays(movie.releaseDate, offset)
  const candidates = [
    ...buildCandidates([day(0), day(7)], ['late']),
    ...buildCandidates([day(1), day(2), day(8)], ['noon', 'evening']),
  ].sort((a, b) => a.id.localeCompare(b.id))
  // 候補順に o=○ ^=△ x=× -=未回答
  const answersFor = (pattern: string) =>
    Object.fromEntries(
      candidates.flatMap((c, i) => {
        const answer = ({ o: 'yes', '^': 'maybe', x: 'no' } as const)[pattern[i] ?? '-']
        return answer ? [[c.id, answer]] : []
      }),
    )
  return {
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
    organizerKeyHash: hashOrganizerKey(DEMO_ORGANIZER_KEY),
    createdAt: new Date().toISOString(),
  }
}

/**
 * 開発用データを投入する（冪等）。
 * - ダミー映画: 毎回 upsert し、公開日を「今日」基準に更新する
 * - デモイベント (/e/demo): 無いときだけ作る（触って増えた回答は残す）。幹事キーが無ければ付与する
 */
export async function seedDatabase(db: Database, { today }: { today: () => string }) {
  const base = today()
  const seedMovies: Movie[] = SEED_MOVIES.map(({ releaseOffsetDays, ...movie }) => ({
    ...movie,
    releaseDate: addDays(base, releaseOffsetDays),
  }))
  await db.transaction(async (tx) => {
    for (const movie of seedMovies) {
      const values = { ...movie, originalTitle: movie.originalTitle ?? null, runtime: movie.runtime ?? null }
      await tx.insert(movies).values(values).onConflictDoUpdate({ target: movies.id, set: values })
    }
  })

  const repository = createDrizzleEventRepository(db)
  const [demoMovie] = seedMovies
  if (demoMovie && !(await repository.findById(DEMO_EVENT_ID))) {
    await repository.insert(demoEvent(demoMovie))
  }
  await db
    .update(events)
    .set({ organizerKeyHash: hashOrganizerKey(DEMO_ORGANIZER_KEY) })
    .where(and(eq(events.id, DEMO_EVENT_ID), isNull(events.organizerKeyHash)))
}
