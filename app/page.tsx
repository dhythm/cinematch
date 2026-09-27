import { HomeHero } from '@/components/home/home-hero'
import { ReleaseBrowser } from '@/components/home/release-browser'
import { MyEvents } from '@/components/home/my-events'
import { MOVIES, MY_EVENTS } from '@/lib/mock-data'

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-14 px-4 pt-8 pb-20 md:pt-12">
      <HomeHero />
      <ReleaseBrowser movies={MOVIES} />
      <MyEvents events={MY_EVENTS} movies={MOVIES} />
    </main>
  )
}
