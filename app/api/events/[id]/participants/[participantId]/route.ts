import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handle } from '@/server/http'

type Context = { params: Promise<{ id: string; participantId: string }> }

export function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id, participantId } = await params
    const { events } = await getContainer()
    return NextResponse.json(await events.deleteParticipant(id, participantId))
  })
}
