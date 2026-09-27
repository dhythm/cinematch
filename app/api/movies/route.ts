import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handle } from '@/server/http'

export const dynamic = 'force-dynamic'

export function GET() {
  return handle(async () => {
    const { catalog } = await getContainer()
    return NextResponse.json({ movies: await catalog.list() })
  })
}
