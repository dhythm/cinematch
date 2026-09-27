import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { DomainError } from '@/server/domain/errors'
import { handle } from '@/server/http'

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
