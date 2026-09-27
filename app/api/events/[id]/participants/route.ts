import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { saveParticipantSchema } from '@/server/events/schemas'
import { handle, readJson } from '@/server/http'

type Context = { params: Promise<{ id: string }> }

/** 参加者の回答を追加（id 指定時は更新） */
export function POST(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const input = saveParticipantSchema.parse(await readJson(request))
    const { events } = await getContainer()
    return NextResponse.json(await events.saveParticipant(id, input))
  })
}
