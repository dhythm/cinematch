import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { reserveSchema } from '@/server/events/schemas'
import { handle, readJson } from '@/server/http'

type Context = { params: Promise<{ id: string }> }

/** 決定した回の予約を記録（上書き） */
export function PUT(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const input = reserveSchema.parse(await readJson(request))
    const { events } = await getContainer()
    return NextResponse.json(await events.reserve(id, input))
  })
}

export function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const { events } = await getContainer()
    return NextResponse.json(await events.cancelReservation(id))
  })
}
