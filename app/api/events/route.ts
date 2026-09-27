import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { createEventSchema } from '@/server/events/schemas'
import { handle, readJson } from '@/server/http'

const MAX_IDS = 50

export function GET(request: Request) {
  return handle(async () => {
    const ids = (new URL(request.url).searchParams.get('ids') ?? '').split(',').filter(Boolean).slice(0, MAX_IDS)
    const { events } = await getContainer()
    return NextResponse.json({ events: await events.listSummaries(ids) })
  })
}

export function POST(request: Request) {
  return handle(async () => {
    const input = createEventSchema.parse(await readJson(request))
    const { events } = await getContainer()
    return NextResponse.json(await events.create(input), { status: 201 })
  })
}
