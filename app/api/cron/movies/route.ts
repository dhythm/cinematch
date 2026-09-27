import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handle } from '@/server/http'

export const dynamic = 'force-dynamic'
/** TMDB への数十リクエストがあるので既定の 10 秒では足りない（Vercel の上限に合わせる） */
export const maxDuration = 60

/**
 * TMDB の公開予定作品を movies テーブルに取り込む。
 * 実行間隔は vercel.json の crons で指定する（schedule は UTC なので 18:00 = JST 03:00）。
 * vercel.json はコメントを書けず、crons の項目も path / schedule しか受け付けないのでここに書いておく。
 */

/**
 * Vercel Cron は CRON_SECRET を Bearer トークンとして送ってくる。
 * 未設定のまま本番に出ると誰でも TMDB への取り込みを走らせられるので、その場合は一律で拒否する。
 */
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export function GET(request: Request) {
  return handle(async () => {
    if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { syncMovies } = await getContainer()
    const { saved, failures } = await syncMovies()
    for (const { provider, error } of failures) console.error(`[cron] ${provider} failed`, error)
    // 一部でも取れていなければ Vercel のダッシュボードで失敗として見えるようにする
    if (failures.length > 0) {
      return NextResponse.json({ saved, failed: failures.map((f) => f.provider) }, { status: 500 })
    }
    return NextResponse.json({ saved })
  })
}
