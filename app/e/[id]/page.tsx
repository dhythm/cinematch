import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { EventScreen } from '@/components/event/event-screen'
import { eventKeys } from '@/lib/api/keys'
import { getContainer } from '@/server/container'
import { readOrganizerKey } from '@/server/organizer-cookie'

type Props = { params: Promise<{ id: string }> }

const loadEvent = cache(async (id: string) => {
  const { events } = await getContainer()
  return events.get(id, readOrganizerKey(await cookies(), id))
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await loadEvent((await params).id)
  return { title: event ? `${event.title} | しねまっちゃん` : 'しねまっちゃん' }
}

export default async function EventPage({ params }: Props) {
  const { id } = await params
  const event = await loadEvent(id)
  if (!event) notFound()
  const queryClient = new QueryClient()
  queryClient.setQueryData(eventKeys.detail(id), event)

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 pt-6 pb-20">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EventScreen id={id} />
      </HydrationBoundary>
    </main>
  )
}
