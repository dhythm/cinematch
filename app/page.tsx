import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { HomeHero } from '@/components/home/home-hero'
import { MyEvents } from '@/components/home/my-events'
import { ReleaseBrowser } from '@/components/home/release-browser'
import { movieKeys } from '@/lib/api/keys'
import { getContainer } from '@/server/container'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { catalog } = await getContainer()
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({ queryKey: movieKeys.all, queryFn: () => catalog.list() })

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-14 px-4 pt-8 pb-20 md:pt-12">
      <HomeHero />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ReleaseBrowser />
      </HydrationBoundary>
      <MyEvents />
    </main>
  )
}
