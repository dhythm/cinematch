import { type NextRequest, NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { createEventSchema } from '@/server/events/schemas'
import { handle, readJson } from '@/server/http'
import { organizerKeyFrom, setOrganizerCookie } from '@/server/organizer-cookie'

const MAX_IDS = 50

export function GET(request: NextRequest) {
  return handle(async () => {
    const ids = (request.nextUrl.searchParams.get('ids') ?? '').split(',').filter(Boolean).slice(0, MAX_IDS)
    const { events } = await getContainer()
    const summaries = await events.listSummaries(ids, (eventId) => organizerKeyFrom(request, eventId))
    return NextResponse.json({ events: summaries })
  })
}

/** 作成者を幹事にする: 幹事キーをクッキーに保存する */
export function POST(request: NextRequest) {
  return handle(async () => {
    const input = createEventSchema.parse(await readJson(request))
    const { events } = await getContainer()
    const event = await events.create(input)
    const response = NextResponse.json(event, { status: 201 })
    if (event.organizerKey) setOrganizerCookie(response, event.id, event.organizerKey)
    return response
  })
}
