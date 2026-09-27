import type { Movie, ScheduleEvent } from './types'

export const MOVIES: Movie[] = [
  {
    id: 'natsugumo',
    title: '夏雲のむこうがわ',
    releaseDate: '2026-10-02',
    runtime: 118,
    genres: ['アニメ', '青春'],
    poster: '/posters/p2.png',
    distributor: '東邦アニメーション',
    synopsis: '海辺の町で過ごす最後の夏。屋上で交わした約束が、ふたりの未来を静かに変えていく。',
    source: 'eiga',
  },
  {
    id: 'itetsuku',
    title: '凍てつく海のアストロノート',
    originalTitle: 'Frozen Tide',
    releaseDate: '2026-10-09',
    runtime: 142,
    genres: ['SF', 'アドベンチャー'],
    poster: '/posters/p1.png',
    distributor: 'ワーナー配給',
    synopsis: '環を持つ惑星の氷の海に取り残された宇宙飛行士。帰還までの残り時間はわずか72時間。',
    source: 'tmdb',
  },
  {
    id: 'last-highway',
    title: 'ラスト・ハイウェイ',
    originalTitle: 'Last Highway',
    releaseDate: '2026-10-09',
    runtime: 115,
    genres: ['アクション'],
    poster: '/posters/p6.png',
    distributor: 'ソニー配給',
    synopsis: '砂漠を貫く一本道。追う者と追われる者、止まった方が負けのデスレースが始まる。',
    source: 'tmdb',
  },
  {
    id: 'amayo',
    title: '雨夜のディテクティブ',
    releaseDate: '2026-10-16',
    runtime: 126,
    genres: ['サスペンス', 'ミステリー'],
    poster: '/posters/p3.png',
    distributor: '松竹映画',
    synopsis: 'ネオンが滲む新宿の路地裏。雨の夜にだけ現れる依頼人を、ひとりの探偵が追う。',
    source: 'eiga',
  },
  {
    id: 'levia',
    title: '深海獣レヴィア',
    releaseDate: '2026-10-23',
    runtime: 131,
    genres: ['怪獣', 'パニック'],
    poster: '/posters/p4.png',
    distributor: '東邦',
    synopsis: '東京湾に突如現れた巨大生物。首都機能が麻痺する中、人類最後の作戦が動き出す。',
    source: 'eiga',
  },
  {
    id: 'chochin',
    title: 'ちょうちん森のコン',
    releaseDate: '2026-10-30',
    runtime: 98,
    genres: ['ファミリー', 'ファンタジー'],
    poster: '/posters/p5.png',
    distributor: 'ギャガ配給',
    synopsis: '灯りのともる不思議な森で、迷子の少女と小さなキツネが出会う、ひと夏の冒険。',
    source: 'eiga',
  },
]

export function getMovie(id: string | undefined) {
  return MOVIES.find((m) => m.id === id)
}

export const DEMO_EVENT: ScheduleEvent = {
  id: 'demo',
  movieId: 'itetsuku',
  title: '『凍てつく海のアストロノート』IMAXで観る会',
  memo: 'IMAXレーザーで観たいので、席が取れそうな回を優先したいです。決まったら私がまとめて予約します！',
  deadline: '2026-10-05',
  candidates: [
    { id: 'c1', date: '2026-10-09', slot: 'late' },
    { id: 'c2', date: '2026-10-10', slot: 'noon' },
    { id: 'c3', date: '2026-10-10', slot: 'evening' },
    { id: 'c4', date: '2026-10-11', slot: 'noon' },
    { id: 'c5', date: '2026-10-12', slot: 'noon' },
    { id: 'c6', date: '2026-10-16', slot: 'late' },
    { id: 'c7', date: '2026-10-17', slot: 'noon' },
    { id: 'c8', date: '2026-10-18', slot: 'evening' },
  ],
  participants: [
    {
      id: 'p1',
      name: 'はるか',
      comment: '初週末がいいな〜',
      answers: { c1: 'maybe', c2: 'yes', c3: 'yes', c4: 'yes', c5: 'no', c6: 'no', c7: 'yes', c8: 'maybe' },
    },
    {
      id: 'p2',
      name: 'けんと',
      answers: { c1: 'yes', c2: 'no', c3: 'yes', c4: 'maybe', c5: 'yes', c6: 'yes', c7: 'no', c8: 'no' },
    },
    {
      id: 'p3',
      name: 'みお',
      comment: '10日の夜は遅くても大丈夫',
      answers: { c1: 'no', c2: 'maybe', c3: 'yes', c4: 'yes', c5: 'yes', c6: 'maybe', c7: 'yes', c8: 'yes' },
    },
    {
      id: 'p4',
      name: 'たくみ',
      answers: { c1: 'no', c2: 'yes', c3: 'maybe', c4: 'no', c5: 'yes', c6: 'no', c7: 'maybe', c8: 'yes' },
    },
  ],
}

export const MY_EVENTS: Array<{
  id: string
  movieId: string
  title: string
  respondents: number
  status: 'open' | 'decided'
  decidedLabel?: string
}> = [
  {
    id: 'demo',
    movieId: 'itetsuku',
    title: '『凍てつく海のアストロノート』IMAXで観る会',
    respondents: 4,
    status: 'open',
  },
  {
    id: 'demo',
    movieId: 'natsugumo',
    title: '大学メンバーで『夏雲』',
    respondents: 6,
    status: 'decided',
    decidedLabel: '10月4日(日) 昼',
  },
]
