import { type NextRequest, NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { setOrganizerCookie } from '@/server/organizer-cookie'

type Context = { params: Promise<{ id: string }> }

/**
 * 幹事用 URL（/e/:id/organizer?key=...）。キーが正しければ幹事クッキーを設定する。
 * どちらの場合もキーを含まない /e/:id へリダイレクトし、履歴や Referer にキーを残さない。
 */
export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params
  const key = request.nextUrl.searchParams.get('key') ?? ''
  const response = NextResponse.redirect(new URL(`/e/${encodeURIComponent(id)}`, request.url), 303)
  response.headers.set('referrer-policy', 'no-referrer')
  response.headers.set('cache-control', 'no-store')

  const { events } = await getContainer()
  if (key && (await events.isOrganizer(id, key))) setOrganizerCookie(response, id, key)
  return response
}
