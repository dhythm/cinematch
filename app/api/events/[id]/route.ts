import { type NextRequest, NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { DomainError } from '@/server/domain/errors'
import { updateEventSchema } from '@/server/events/schemas'
import { handle, readJson } from '@/server/http'
import { clearOrganizerCookie, organizerKeyFrom } from '@/server/organizer-cookie'

type Context = { params: Promise<{ id: string }> }

export function GET(request: NextRequest, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const { events } = await getContainer()
    const event = await events.get(id, organizerKeyFrom(request, id))
    if (!event) throw new DomainError('not_found', `event ${id} not found`)
    return NextResponse.json(event)
  })
}

export function PATCH(request: NextRequest, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const input = updateEventSchema.parse(await readJson(request))
    const { events } = await getContainer()
    return NextResponse.json(await events.updateDetails(id, input, organizerKeyFrom(request, id)))
  })
}

export function DELETE(request: NextRequest, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const { events } = await getContainer()
    await events.delete(id, organizerKeyFrom(request, id))
    const response = new NextResponse(null, { status: 204 })
    clearOrganizerCookie(response, id)
    return response
  })
}
