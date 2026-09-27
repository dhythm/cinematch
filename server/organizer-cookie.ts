import type { NextRequest, NextResponse } from 'next/server'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/** 幹事キーはイベントごとのクッキーに入れる（HttpOnly なので JavaScript からは読めない） */
function organizerCookieName(eventId: string) {
  return `organizer_${eventId}`
}

type CookieReader = { get: (name: string) => { value: string } | undefined }

export function readOrganizerKey(cookies: CookieReader, eventId: string) {
  return cookies.get(organizerCookieName(eventId))?.value
}

export function organizerKeyFrom(request: NextRequest, eventId: string) {
  return readOrganizerKey(request.cookies, eventId)
}

export function setOrganizerCookie(response: NextResponse, eventId: string, organizerKey: string) {
  response.cookies.set(organizerCookieName(eventId), organizerKey, {
    httpOnly: true,
    sameSite: 'lax',
    // ローカル（http://localhost）でも動くよう、本番だけ Secure にする
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  })
}

export function clearOrganizerCookie(response: NextResponse, eventId: string) {
  response.cookies.delete(organizerCookieName(eventId))
}
