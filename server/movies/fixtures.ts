import { addDays } from '@/lib/date'
import type { Movie } from '@/lib/types'
import type { MovieProvider } from './movie-catalog'

type FixtureMovie = Omit<Movie, 'releaseDate'> & { releaseOffsetDays: number }

/** 外部 API 未設定時・テスト時に使う作品。公開日は「今日」からの相対日数で決まる */
const FIXTURE_MOVIES: FixtureMovie[] = [
  {
    id: 'natsugumo',
    title: '夏雲のむこうがわ',
    releaseOffsetDays: 5,
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
    releaseOffsetDays: 12,
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
    releaseOffsetDays: 12,
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
    releaseOffsetDays: 19,
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
    releaseOffsetDays: 26,
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
    releaseOffsetDays: 33,
    runtime: 98,
    genres: ['ファミリー', 'ファンタジー'],
    poster: '/posters/p5.png',
    distributor: 'ギャガ配給',
    synopsis: '灯りのともる不思議な森で、迷子の少女と小さなキツネが出会う、ひと夏の冒険。',
    source: 'eiga',
  },
]

export function createFixtureProvider({ today }: { today: () => string }): MovieProvider {
  return {
    name: 'fixture',
    async fetchMovies() {
      const base = today()
      return FIXTURE_MOVIES.map(({ releaseOffsetDays, ...movie }) => ({
        ...movie,
        releaseDate: addDays(base, releaseOffsetDays),
      }))
    },
  }
}
