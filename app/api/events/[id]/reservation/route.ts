import { type NextRequest, NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { reserveSchema } from '@/server/events/schemas'
import { handle, readJson } from '@/server/http'
import { organizerKeyFrom } from '@/server/organizer-cookie'

type Context = { params: Promise<{ id: string }> }

/** 決定した回の予約を記録（上書き） */
export function PUT(request: NextRequest, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const input = reserveSchema.parse(await readJson(request))
    const { events } = await getContainer()
    return NextResponse.json(await events.reserve(id, input, organizerKeyFrom(request, id)))
  })
}

export function DELETE(request: NextRequest, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const { events } = await getContainer()
    return NextResponse.json(await events.cancelReservation(id, organizerKeyFrom(request, id)))
  })
}
