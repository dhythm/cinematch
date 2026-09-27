import { type NextRequest, NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handle } from '@/server/http'
import { organizerKeyFrom } from '@/server/organizer-cookie'

type Context = { params: Promise<{ id: string; participantId: string }> }

export function DELETE(request: NextRequest, { params }: Context) {
  return handle(async () => {
    const { id, participantId } = await params
    const { events } = await getContainer()
    return NextResponse.json(await events.deleteParticipant(id, participantId, organizerKeyFrom(request, id)))
  })
}
