import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { DomainError } from '@/server/domain/errors'
import { updateEventSchema } from '@/server/events/schemas'
import { handle, readJson } from '@/server/http'

type Context = { params: Promise<{ id: string }> }

export function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const { events } = await getContainer()
    const event = await events.get(id)
    if (!event) throw new DomainError('not_found', `event ${id} not found`)
    return NextResponse.json(event)
  })
}

export function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const input = updateEventSchema.parse(await readJson(request))
    const { events } = await getContainer()
    return NextResponse.json(await events.updateDetails(id, input))
  })
}

export function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const { events } = await getContainer()
    await events.delete(id)
    return new Response(null, { status: 204 })
  })
}
