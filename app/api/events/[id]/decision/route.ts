import { type NextRequest, NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { decideSchema } from '@/server/events/schemas'
import { handle, readJson } from '@/server/http'
import { organizerKeyFrom } from '@/server/organizer-cookie'

type Context = { params: Promise<{ id: string }> }

export function PUT(request: NextRequest, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const { candidateId } = decideSchema.parse(await readJson(request))
    const { events } = await getContainer()
    return NextResponse.json(await events.decide(id, candidateId, organizerKeyFrom(request, id)))
  })
}

export function DELETE(request: NextRequest, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const { events } = await getContainer()
    return NextResponse.json(await events.reopen(id, organizerKeyFrom(request, id)))
  })
}
