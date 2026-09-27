import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { NewEventScreen } from '@/components/new/new-event-screen'
import { movieKeys } from '@/lib/api/keys'
import { getContainer } from '@/server/container'

export const metadata: Metadata = {
  title: '日程調整をつくる | しねまっち',
}

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ movie?: string }> }) {
  const { movie: movieId } = await searchParams
  const { catalog } = await getContainer()
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({ queryKey: movieKeys.all, queryFn: () => catalog.list() })

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 pt-6 pb-20">
      <Link
        href="/#releases"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        作品を選び直す
      </Link>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <NewEventScreen movieId={movieId} />
      </HydrationBoundary>
    </main>
  )
}
