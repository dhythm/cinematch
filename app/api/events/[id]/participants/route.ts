import { type NextRequest, NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { saveParticipantSchema } from '@/server/events/schemas'
import { handle, readJson } from '@/server/http'
import { organizerKeyFrom } from '@/server/organizer-cookie'

type Context = { params: Promise<{ id: string }> }

/** 参加者の回答を追加（id 指定時は更新）。誰でもできる */
export function POST(request: NextRequest, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const input = saveParticipantSchema.parse(await readJson(request))
    const { events } = await getContainer()
    return NextResponse.json(await events.saveParticipant(id, input, organizerKeyFrom(request, id)))
  })
}
